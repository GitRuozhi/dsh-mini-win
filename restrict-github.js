// restrict-github.js — for this preset's scope, deny the GitHub tools that the
// dsh-github-mcp bundle registers globally (mcp__github__* + github_file_read).
// The preset keeps its own tools but no longer inherits the GitHub capability.
const name = 'restrict-github';
const inject = ['tools'];

function apply(ctx) {
  const deny = ctx.tools
    .schemas()
    .map((schema) => schema.name)
    .filter((toolName) => toolName.startsWith('mcp__github__') || toolName === 'github_file_read');
  if (deny.length > 0) ctx.tools.restrict({ deny });
}

export { apply, inject, name };
