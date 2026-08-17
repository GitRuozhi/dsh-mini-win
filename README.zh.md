# dsh-mini-win

[English](README.md) | 中文

面向 Windows 的**极简** agent 预设，适用于 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness)。

因“高级思维链”的相关问题，本预设重构为包含以下三个工具。

DSH 内置的 `minimal` 预设只支持 Linux/macOS 。`mini-win` 预设替换了`minimal` 预设基于 PTY 的持久化 bash，仅使用三个工具。

- `pwsh` —— 沙箱内的一次性 PowerShell
- `bash` —— 用于触发“高级思维链”
- `str_replace_editor` —— 本地文件编辑器

## 安装

把本目录复制到 DSH 的预设目录，并命名为 `mini-win`：

```powershell
git clone https://github.com/GitRuozhi/dsh-mini-win "$env:USERPROFILE\.dsh\.agent-presets\mini-win"
```

重启 `dsh`，选择**小赢模式**（`mini-win`）。

## 关于 `block-github.mjs`

这个文件用于屏蔽 [`dsh-github-mcp`](https://github.com/GitRuozhi/dsh-github-mcp) bundle 全局注册的 `mcp__github__*` 和 `github_file_read` 工具，让本预设保持极简。如果没装那个 bundle，它就是空操作，留着无害。

如果您有其他全局插件，可以让 DSH 参考本工具的屏蔽方法将 `mini-win` 恢复至只有3工具的极简状态。

## 高级思维链、持久 Bash 和 CMD 工具

基于 [dsh-anchored-standard](https://github.com/xiaobright/dsh-anchored-standard) 和类似民间研究，当且仅当只有持久化 bash 和 str_replace_editor 工具且无任何额外工具和提示词注入的情况下，可以有效触发 DeepSeekV4Pro 的“高级思维链”。

实测过程中，这一场景仍存在随机性。BSH 原生极简模式仍可能不触发高级思维链；带有 pwsh 工具的模式仍有大概率触发高级思维链。

为此，删除本预设旧版本的 CMD 工具，并补回 Bash 工具。

基于 Agent / Harness 的处理已经达到瓶颈，相关问题处理仍需要等待 DeepSeek 模型的更新。