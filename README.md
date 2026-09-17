# dsh-mini-win

English | [中文](README.zh.md)

A Windows-friendly **minimal** agent preset for [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness).

This is the official `minimal` preset with both persistent shells enabled, and GitHub tools masked:

- `bash` — persistent Git Bash (not `/bin/bash`)
- `pwsh` — persistent PowerShell 7 (not Windows PowerShell 5.1)

No file editor, no extra prompt text, no context compaction — same contract as official `minimal`.

## Install

Copy this directory into your DSH presets folder as `mini-win`:

```powershell
git clone https://github.com/GitRuozhi/dsh-mini-win "$env:USERPROFILE\.dsh\.agent-presets\mini-win"
```

Restart `dsh`, then pick **小赢模式** (`mini-win`).

Requires Git for Windows and PowerShell 7 (`pwsh`). Override paths with `DSH_BASH_PATH` / `DSH_PWSH_PATH` if needed.

Git Bash cannot start under DSH's Windows ACL sandbox (MSYS + restricted token), so the bash PTY is spawned unconfined. Persistent `pwsh` stays on the host ACL sandbox.

## About `block-github.mjs`

This file masks the `mcp__github__*` and `github_file_read` tools that the [`dsh-github-mcp`](https://github.com/GitRuozhi/dsh-github-mcp) bundle registers globally, so this preset stays minimal. It is a no-op when that bundle isn't installed, so it's safe to keep.
