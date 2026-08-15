// cmd-tool.js — a NATIVE Windows Command Prompt (cmd.exe) tool, UNSANDBOXED.
//
// This plugin spawns the real `cmd.exe` directly through `ctx.subprocess` — it
// does NOT route through `ctx.shell` (the PowerShell executor) and therefore
// does NOT go through the file sandbox at all. A command run here has whatever
// access the harness's OS account has.
//
// Because of that, the model-facing description instructs the agent to ask the
// user for permission before every call, and to fall back to the sandboxed
// `pwsh` tool when the user does not approve.
//
// Self-contained on purpose: it imports only Node builtins so it can live as a
// preset-local file. The harness forwards BARE ROW NAMES to the host
// node_modules, but a local file's OWN `import` statements resolve from the
// preset directory — so this plugin must not import any `@deepseek-ai/*`
// package. Everything it needs is a ctx service (`tools`, `subprocess`)
// resolved at runtime.
import { isAbsolute, resolve } from "node:path";

export const name = "tool-cmd";
export const inject = ["tools", "subprocess"];

/** Default per-call wall-clock timeout (2 minutes), matching the pwsh executor's default. */
const DEFAULT_TIMEOUT_MS = 120000;
/** Hard cap on a caller-requested timeout (10 minutes), matching the pwsh executor. */
const MAX_TIMEOUT_MS = 600000;
/** In-memory output cap per stream (bytes); overflow keeps the tail. */
const MAX_OUTPUT_BYTES = 64000;
/** Full-stream spill file cap (bytes). */
const MAX_SPILL_BYTES = 64 * 1024 * 1024;
/** Terminate escalation grace period (ms). */
const GRACE_MS = 3000;

/** Resolve the cmd.exe executable: ComSpec, else the well-known system path. */
function cmdPath() {
  return process.env.ComSpec || "C:\\Windows\\System32\\cmd.exe";
}

/** Append the truncation notice (with the full-output spill path) to a stream's text. */
function streamText(output) {
  if (!output.truncated) return output.text;
  return `${output.text}\n[output truncated; full output: ${output.spillPath ?? "(unavailable)"}]`;
}

/** Shape a completed foreground run into the text the model sees. */
function renderResult(value) {
  const out = streamText(value.stdout);
  const err = streamText(value.stderr);
  let body = out;
  if (err.length > 0) {
    if (body.length > 0 && !body.endsWith("\n")) body += "\n";
    body += `[stderr]\n${err}`;
  }
  if (body.length === 0) body = "(no output)";
  const markers = [];
  if (value.timedOut) markers.push(`[timed out after ${value.timeoutMs}ms]`);
  if (value.signal !== null) markers.push(`[killed by signal: ${value.signal}]`);
  else if (value.exitCode !== 0) markers.push(`[exit code: ${value.exitCode}]`);
  if (markers.length === 0) return body;
  if (!body.endsWith("\n")) body += "\n";
  return body + markers.join("\n");
}

/** Resolve the workdir: explicit → session-cwd-relative, else the session cwd. */
function resolveWorkdir(modelWorkdir, exec) {
  const headerCwd = exec.agent?.session.header.cwd;
  if (modelWorkdir === void 0) return headerCwd;
  if (headerCwd !== void 0 && !isAbsolute(modelWorkdir)) return resolve(headerCwd, modelWorkdir);
  return modelWorkdir;
}

/** Clamp a caller timeout into [1, MAX_TIMEOUT_MS], defaulting when absent. */
function clampTimeout(value) {
  if (value === void 0) return DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(value) || value <= 0)
    throw new Error(`invalid timeoutMs: expected a positive number, got ${JSON.stringify(value)}`);
  return Math.min(value, MAX_TIMEOUT_MS);
}

/** Project one collected-output reader into the `CollectedOutput` shape. */
function finalOutput(reader) {
  if (reader === void 0) return { text: "", truncated: false };
  const read = reader.readFrom(0);
  return {
    text: read.text,
    truncated: read.lossy,
    ...(read.spillPath !== void 0 ? { spillPath: read.spillPath } : {}),
  };
}

export function apply(ctx) {
  ctx.tools.register({
    name: "cmd",
    description:
      "Execute a NATIVE Windows Command Prompt command (cmd.exe /c) and return its stdout/stderr. " +
      "UNSANDBOXED: this tool spawns cmd.exe directly and does NOT go through the file sandbox — it can read, write, and modify anything this OS account can. " +
      "Before calling it, ask the user for permission and wait for an explicit yes; if the user does not approve, use the sandboxed `pwsh` tool instead. " +
      "Each call runs in a fresh cmd.exe process (no state persists between calls — use `workdir`, not `cd`). " +
      "Write native cmd.exe / batch syntax (e.g. `dir`, `type file.txt`, `copy a b`, `echo %VAR%`). " +
      "Non-zero exits are reported as `[exit code: N]`. Foreground only — no background mode.",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The cmd.exe command line to execute.",
        },
        description: {
          type: "string",
          description:
            'Clear, concise description of what this command does in active voice, 5-10 words (shown in the UI). Examples: "dir" → "List files in current directory"; "type a.txt" → "Show file contents".',
        },
        timeoutMs: {
          type: "number",
          description:
            "Timeout in milliseconds. Defaults to 120000 and is capped at 600000; the command is force-killed on expiry.",
        },
        workdir: {
          type: "string",
          description:
            "Working directory for this command. Defaults to the session workspace; a relative path is resolved against it.",
        },
      },
      required: ["command", "description"],
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          exitCode: { oneOf: [{ type: "integer" }, { type: "null" }] },
          signal: { oneOf: [{ type: "string" }, { type: "null" }] },
          timedOut: { type: "boolean" },
          aborted: { type: "boolean" },
          timeoutMs: { type: "number" },
          stdout: {
            type: "object",
            additionalProperties: false,
            properties: {
              text: { type: "string" },
              truncated: { type: "boolean" },
              spillPath: { type: "string" },
            },
            required: ["text", "truncated"],
          },
          stderr: {
            type: "object",
            additionalProperties: false,
            properties: {
              text: { type: "string" },
              truncated: { type: "boolean" },
              spillPath: { type: "string" },
            },
            required: ["text", "truncated"],
          },
        },
        required: ["exitCode", "signal", "timedOut", "aborted", "timeoutMs", "stdout", "stderr"],
      },
      render: (_args, value) => [{ type: "text", text: renderResult(value) }],
    },
    async execute(args, exec) {
      if (typeof args.command !== "string" || args.command.trim().length === 0)
        throw new Error("invalid command: expected a non-empty string");
      if (typeof args.description !== "string" || args.description.trim().length === 0)
        throw new Error("invalid description: expected a non-empty string");
      const timeoutMs = clampTimeout(args.timeoutMs);
      const workdir = resolveWorkdir(args.workdir, exec) ?? process.cwd();

      // One fused termination controller: the caller's abort and this call's
      // own timeout both drive it; whichever fires first owns the cause.
      const killController = new AbortController();
      let timedOut = false;
      let aborted = false;
      const onCallerAbort = () => {
        if (killController.signal.aborted) return; // timeout already won
        aborted = true;
        killController.abort();
      };
      const timeoutId = setTimeout(() => {
        if (exec.signal.aborted) return; // caller already won
        timedOut = true;
        killController.abort();
      }, timeoutMs);
      if (exec.signal.aborted) onCallerAbort();
      else exec.signal.addEventListener("abort", onCallerAbort, { once: true });

      let outcome;
      try {
        const handle = ctx.subprocess.spawn({
          argv: [cmdPath(), "/d", "/s", "/c", args.command],
          cwd: workdir,
          stdio: {
            stdin: "ignore",
            stdout: { maxBytes: MAX_OUTPUT_BYTES, spill: { maxBytes: MAX_SPILL_BYTES } },
            stderr: { maxBytes: MAX_OUTPUT_BYTES, spill: { maxBytes: MAX_SPILL_BYTES } },
          },
          graceMs: GRACE_MS,
          signal: killController.signal,
        });
        outcome = await handle.done;
        return {
          exitCode: outcome.exitCode ?? null,
          signal: outcome.signal ?? null,
          timedOut,
          aborted,
          timeoutMs,
          stdout: finalOutput(handle.collected.stdout),
          stderr: finalOutput(handle.collected.stderr),
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const spawnError = new Error(`cmd spawn failed: ${message}`);
        spawnError.name = "SpawnError";
        throw spawnError;
      } finally {
        clearTimeout(timeoutId);
        exec.signal.removeEventListener("abort", onCallerAbort);
      }
    },
    presentCall: (args) => ({
      card: "terminal",
      title: args.command,
      description: args.description,
      ...(args.workdir !== void 0 ? { cwd: args.workdir } : {}),
    }),
  });
}
