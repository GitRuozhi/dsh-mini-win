// Git Bash (MSYS) cannot start under the Windows ACL restricted-token
// runner that DSH uses for workspace-write PTY sessions. This row provides
// a same-group `sandbox` whose confine() is identity, so node-pty spawns
// bash.exe directly. It is mounted only inside the bash stack's isolated
// sandbox realm — the pwsh stack keeps the host ACL sandbox.

const name = 'pty-unconfined-sandbox';

function apply(ctx) {
  ctx.provide('sandbox', {
    confine(argv) {
      return { argv };
    },
  });
}

export { name, apply };
