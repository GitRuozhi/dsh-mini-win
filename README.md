# dsh-mini-win

English | [中文](README.zh.md)

A Windows-friendly **minimal** agent preset for [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness).

DSH's built-in `minimal` preset is Linux/macOS-only. `mini-win` replaces `minimal`'s PTY-based persistent bash with only three tools:

- `pwsh` — sandboxed one-shot PowerShell
- `cmd` — native Windows `cmd.exe`
- `str_replace_editor` — local file editor

## Install

Copy this directory into your DSH presets folder as `mini-win`:

```powershell
git clone https://github.com/GitRuozhi/dsh-mini-win "$env:USERPROFILE\.dsh\.agent-presets\mini-win"
```

Restart `dsh`, then pick **小赢模式** (`mini-win`).

## The `cmd` tool

`cmd-tool.js` registers a native `cmd.exe` tool that is **UNSANDBOXED**: it spawns `cmd.exe` directly through `ctx.subprocess` and bypasses the file sandbox entirely, so it has the same access as the OS account running DSH.

`cmd-tool.js` is safe-by-default:

- It instructs the agent to **ask you for permission before every call**, and to fall back to the sandboxed `pwsh` tool otherwise.
- Every call runs in a fresh `cmd.exe` process — no state persists between calls (use `workdir`, not `cd`).
- stdout/stderr are capped (64 KB in memory, spill to a file); calls are force-killed on timeout (default 2 min, cap 10 min).

`cmd-tool.js` can be reused in any preset: copy the file next to that preset's `agent.cordis.yml` and add:

```yaml
- id: tool-cmd
  name: ./cmd-tool.js
```

## Note on `restrict-github.js`

This file masks the `mcp__github__*` and `github_file_read` tools that the [`dsh-github-mcp`](https://github.com/GitRuozhi/dsh-github-mcp) bundle registers globally, so this preset stays minimal. It is a no-op when that bundle isn't installed, so it's safe to keep.

If you have other global plugins, you can have DSH restore `mini-win` to a 3-tool minimal state by following this file's masking approach.
