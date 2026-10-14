---
name: CodeBuddy IDE 粘性滚动与折叠扩展方案
description: CodeBuddy IDE 下实现 C/C++ 多层粘性滚动的完整方案：自制 c-block-fold 扩展 + editor.defaultFoldingRangeProvider 配置，及踩过的坑
---

# CodeBuddy IDE 粘性滚动（Sticky Scroll）C/C++ 多层固定方案

2026-10-14 排查结论：

## 最终方案
1. 自制本地扩展 `c-block-fold`（package.json + extension.js）：对 c/cpp/cuda-cpp 注册 FoldingRangeProvider，花括号配对（跳过字符串/注释）+ `#if/#ifdef/#ifndef` 区域生成折叠范围；Allman 风格（`{` 独占一行）自动回溯上一非注释行作块头。
2. CodeBuddy 用户设置 `%APPDATA%\CodeBuddy CN\User\settings.json`：
   - `"editor.stickyScroll.enabled": true`，`"editor.stickyScroll.maxLineCount": 5`
   - **`"editor.stickyScroll.defaultModel": "foldingProviderModel"` ← 真正根因修复**：CodeBuddy 把该配置默认值改成 `outlineModel`（基于文档大纲取行，大纲只有函数名，所以永远只显示一层函数头）。enum 实际为 ["outlineModel","foldingProviderModel","indentationModel"]（在 workbench.desktop.main.js 中确认）。
   - `"editor.defaultFoldingRangeProvider": "local.c-block-fold"` ← CodeBuddy 内核自定义配置（`_selectFoldingRangeProvider` 钩子），指定折叠范围只用哪个扩展，排除 clangd 的函数级折叠；provider.id = 扩展 identifier.value。**必须放在 `"[c]"/"[cpp]"` 语言作用域块里**（内核读取带 overrideIdentifier）——若全局设置会把 Python/Java/TS 等语言自己的折叠提供者也过滤掉导致其折叠退化。
   - 其他语言（Python/Java/TS）同样受 outlineModel 默认值影响，但切换 foldingProviderModel 后其语言服务（Pylance/Java LS/tsserver）原生提供全量折叠，无需额外扩展；只有 C 生态需要 c-block-fold 补折叠（clangd 只给函数级、cpptools 被许可挡）。
3. 手动装扩展方法：把扩展文件夹复制进 `C:\Users\25843\.codebuddycn\extensions\`，并手工在 `extensions.json` 登记条目（identifier/version/location/relativeLocation/metadata）。

## 踩过的坑
- **ms-vscode.cpptools 在 CodeBuddy 无法使用**：激活时检测非微软产品直接拒绝（许可限制），报"C/C++ 扩展只能用于 Microsoft Visual Studio/VS Code..."。无法绕过（不应改 product.json 绕过）。
- clangd 的折叠范围只有函数级 → 粘性滚动只能固定一层函数头。
- `editor.stickyScroll.defaultModel: "indentationModel"` 在花括号语言只显示 `{` 行，无用。
- VS Code（真机）里 cpptools 正常，粘性滚动多层完整（含 case/#ifndef/注释）；扩展在 `C:\Users\25843\.vscode\extensions`，与 CodeBuddy 不共享。
- 内核折叠合并逻辑在 workbench.desktop.main.js：`Ras` 合并所有 provider，`G5t` 清洗排序；提供者选择钩子 `_selectFoldingRangeProvider` 读 `editor.defaultFoldingRangeProvider`。

## 局限
- `case xxx:` 等不带花括号的行固定不了（需 cpptools 级 IntelliSense）；如需要可在 c-block-fold 里加 switch-case 特殊处理。
