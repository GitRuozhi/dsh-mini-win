// block-github.mjs — preset-local composition row that masks inherited global
// tools for the scope it mounts under (see agent.cordis.yml).
//
// The HOST composition registers global tools (the web profile's dsh-github-mcp
// rows register `mcp__github__*` and `github_file_read` into the root `tools`
// registry), and every agent inherits them. A preset that must not expose some
// of those tools cannot unregister a host row — it can only mask the inherited
// names for its own scope, which is exactly what `tools.restrict({ deny })`
// does. Restrictions are per-scope: other presets and host readers are
// unaffected.
//
// Timing: `restrict()` rejects names that are not currently registered, and the
// github MCP bridge syncs its tool list asynchronously after host start. This
// row therefore retries on every `tools/change` until the whole deny list is
// known, then applies the restriction once. Once applied it stays applied for
// the lifetime of the mounting scope (the preset's standing mount), and the
// `applied` flag prevents the restriction's own change notification from
// re-entering.
//
// Row config: `{ deny: string[] }` — exact inherited tool names to hide.

const name = 'block-github';
const inject = ['tools'];

function apply(ctx, config) {
  const cfg = config ?? {};
  const wanted = [...new Set(Array.isArray(cfg.deny) ? cfg.deny : [])];
  if (wanted.length === 0) return;

  let applied = false;
  const sync = () => {
    if (applied) return;
    try {
      // The disposer is owned by the fiber; it unwinds with the mounting scope.
      ctx.tools.restrict({ deny: wanted });
      applied = true;
    } catch (error) {
      // Some names are not registered yet (async MCP sync) — retry on the next
      // tools/change. Once every name exists the call succeeds.
    }
  };

  sync();
  ctx.on('tools/change', sync);
}

export { name, inject, apply };
