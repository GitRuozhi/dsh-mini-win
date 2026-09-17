// block-github.mjs — preset-local composition row that masks inherited GitHub
// tools for the scope it mounts under (see agent.cordis.yml).
//
// The HOST composition may register `mcp__github__*` and `github_file_read`
// into the root `tools` registry, and every agent inherits them. A preset
// cannot unregister a host row — it can only mask the inherited names for
// its own scope via `tools.restrict({ deny })`, and refuse execution via
// `tools.guard`.
//
// The GitHub MCP bridge syncs its tool list asynchronously after host start.
// This row therefore:
//   1. guards every GitHub tool name immediately (execution cannot leak);
//   2. retries `restrict()` on every `tools/change` so newly discovered MCP
//      tools disappear from the model-facing catalog as they appear.
//
// No-op when dsh-github-mcp is not installed.

const name = 'block-github';
const inject = ['tools'];

function isGithubTool(toolName) {
  return toolName === 'github_file_read' || toolName.startsWith('mcp__github__');
}

function apply(ctx) {
  ctx.tools.guard((exec) => {
    const toolName = typeof exec?.name === 'string' ? exec.name : '';
    if (isGithubTool(toolName)) return 'GitHub tools are disabled in the mini-win preset';
  });

  const denied = new Set();
  const sync = () => {
    const fresh = [];
    for (const schema of ctx.tools.schemas()) {
      const toolName = schema?.name;
      if (typeof toolName !== 'string' || denied.has(toolName)) continue;
      if (isGithubTool(toolName)) fresh.push(toolName);
    }
    if (fresh.length === 0) return;
    try {
      ctx.tools.restrict({ deny: fresh });
      for (const toolName of fresh) denied.add(toolName);
    } catch {
      // Names are not in the restrictable global set yet (async MCP sync).
    }
  };

  sync();
  ctx.on('tools/change', sync);
}

export { name, inject, apply };
