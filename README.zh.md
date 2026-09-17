# dsh-mini-win

[English](README.md) | 中文

面向 Windows 的**极简** agent 预设，适用于 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness)。

在官方 `minimal` 极简模式之上，同时启用两个持久 shell，并屏蔽 GitHub 工具：

- `bash` —— 持久 Git Bash（不是 `/bin/bash`）
- `pwsh` —— 持久 PowerShell 7（不是 Windows PowerShell 5.1）

没有文件编辑器、没有额外提示词、没有上下文压缩 —— 与官方极简同一套契约。

## 安装

把本目录复制到 DSH 的预设目录，并命名为 `mini-win`：

```powershell
git clone https://github.com/GitRuozhi/dsh-mini-win "$env:USERPROFILE\.dsh\.agent-presets\mini-win"
```

重启 `dsh`，选择**小赢模式**（`mini-win`）。

需要已安装 Git for Windows 和 PowerShell 7（`pwsh`）。路径不对时可用 `DSH_BASH_PATH` / `DSH_PWSH_PATH` 覆盖。

Git Bash 无法在 DSH 的 Windows ACL 沙箱里启动（MSYS + 受限令牌），因此 bash 的 PTY 不走该沙箱。持久 `pwsh` 仍使用宿主 ACL 沙箱。

## 关于 `block-github.mjs`

这个文件用于屏蔽 [`dsh-github-mcp`](https://github.com/GitRuozhi/dsh-github-mcp) bundle 全局注册的 `mcp__github__*` 和 `github_file_read` 工具，让本预设保持极简。如果没装那个 bundle，它就是空操作，留着无害。
