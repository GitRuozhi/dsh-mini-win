# dsh-mini-win

[English](README.md) | 中文

面向 Windows 的**极简** agent 预设，适用于 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness)。

DSH 内置的 `minimal` 预设只支持 Linux/macOS 。`mini-win` 预设替换了`minimal` 预设基于 PTY 的持久化 bash，仅使用三个工具。

- `pwsh` —— 沙箱内的一次性 PowerShell
- `cmd` —— 原生 Windows `cmd.exe`
- `str_replace_editor` —— 本地文件编辑器

## 安装

把本目录复制到 DSH 的预设目录，并命名为 `mini-win`：

```powershell
git clone https://github.com/GitRuozhi/dsh-mini-win "$env:USERPROFILE\.dsh\.agent-presets\mini-win"
```

重启 `dsh`，选择**小赢模式**（`mini-win`）。

## `cmd` 工具

`cmd-tool.js` 注册了一个**非沙盒**的原生 `cmd.exe` 工具：它通过 `ctx.subprocess` 直接 spawn `cmd.exe`，完全绕过了文件沙盒，因此拥有与运行 DSH 的 OS 账号相同的权限。

`cmd-tool.js` 采用了「默认安全」：

- 它会要求 agent **每次调用前先征得你同意**，否则回退到沙箱内的 `pwsh` 工具。
- 每次调用都在全新的 `cmd.exe` 进程中运行——调用之间不保留状态（用 `workdir`，不要用 `cd`）。
- stdout/stderr 有上限（内存 64 KB，超出落盘）；调用超时会被强杀（默认 2 分钟，上限 10 分钟）。

`cmd-tool.js` 可以复用到任意预设：把文件复制到该预设的 `agent.cordis.yml` 旁边，再加一行：

```yaml
- id: tool-cmd
  name: ./cmd-tool.js
```

## 关于 `restrict-github.js`

这个文件用于屏蔽 [`dsh-github-mcp`](https://github.com/GitRuozhi/dsh-github-mcp) bundle 全局注册的 `mcp__github__*` 和 `github_file_read` 工具，让本预设保持极简。如果没装那个 bundle，它就是空操作，留着无害。

如果您有其他全局插件，可以让 DSH 参考本工具的屏蔽方法将 `mini-win` 恢复至只有3工具的极简状态。
