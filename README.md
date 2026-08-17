# dsh-mini-win

English | [中文](README.zh.md)

A Windows-friendly **minimal** agent preset for [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness).

Due to issues with the "advanced thinking chain", this preset has been restructured to include the following three tools.

DSH's built-in `minimal` preset is Linux/macOS-only. The `mini-win` preset replaces `minimal`'s PTY-based persistent bash and uses only three tools:

- `pwsh` — sandboxed one-shot PowerShell
- `bash` — for triggering the "advanced thinking chain"
- `str_replace_editor` — local file editor

## Install

Copy this directory into your DSH presets folder as `mini-win`:

```powershell
git clone https://github.com/GitRuozhi/dsh-mini-win "$env:USERPROFILE\.dsh\.agent-presets\mini-win"
```

Restart `dsh`, then pick **小赢模式** (`mini-win`).

## About `block-github.mjs`

This file masks the `mcp__github__*` and `github_file_read` tools that the [`dsh-github-mcp`](https://github.com/GitRuozhi/dsh-github-mcp) bundle registers globally, so this preset stays minimal. It is a no-op when that bundle isn't installed, so it's safe to keep.

If you have other global plugins, you can have DSH restore `mini-win` to a 3-tool minimal state by following this file's masking approach.

## Advanced thinking chain, persistent bash, and the CMD tool

Based on [dsh-anchored-standard](https://github.com/xiaobright/dsh-anchored-standard) and similar community research, the "advanced thinking chain" of DeepSeekV4Pro can be effectively triggered if and only if only a persistent bash and `str_replace_editor` are available, with no extra tools or prompt injection.

In practice, this scenario still has randomness. DSH's native minimal mode may still fail to trigger the advanced thinking chain, while modes that include the `pwsh` tool still have a high probability of triggering it.

For this reason, the CMD tool from the previous version of this preset was removed, and the Bash tool was added back.

Handling this at the Agent/Harness level has reached a bottleneck; resolving it still awaits a DeepSeek model update.
