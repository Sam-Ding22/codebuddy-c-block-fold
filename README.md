# c-block-fold

让 **CodeBuddy IDE / VS Code** 的粘性滚动（Sticky Scroll）在 C/C++ 文件里真正"多层固定"的本地扩展。

## 背景

CodeBuddy IDE 把 `editor.stickyScroll.defaultModel` 的默认值改成了 `outlineModel`（基于文档大纲取行），而大纲里只有函数名，导致 C/C++ 粘性滚动**永远只显示一层函数头**。

同时 C 生态的两个折叠来源都有短板：

- **clangd**：只提供函数级折叠范围；
- **ms-vscode.cpptools**：在 CodeBuddy 中因许可检测（非微软产品）被拒绝激活，无法使用。

本扩展通过注册 `FoldingRangeProvider` 补齐完整折叠范围，配合 `foldingProviderModel` 让粘性滚动恢复多层固定（函数头、`if/for/while` 条件、`#if/#ifdef` 区域等）。

## 功能

- 对 `c` / `cpp` / `cuda-cpp` 注册折叠范围提供者
- 花括号配对生成块折叠（正确跳过字符串、字符、行注释、块注释）
- Allman 风格（`{` 独占一行）自动回溯上一个非注释行作为块头
- `#if` / `#ifdef` / `#ifndef` … `#endif` 预处理区域折叠

## 安装

1. 把 [`c-block-fold/`](c-block-fold/) 整个文件夹复制到扩展目录：

   ```
   CodeBuddy CN: %USERPROFILE%\.codebuddycn\extensions\c-block-fold-0.0.1\
   VS Code:      %USERPROFILE%\.vscode\extensions\c-block-fold-0.0.1\
   ```

2. 在扩展目录下的 `extensions.json` 手工登记条目（CodeBuddy CN 为 `.codebuddycn\extensions\extensions.json`）：

   ```json
   {
     "identifier": { "id": "local.c-block-fold" },
     "version": "0.0.1",
     "location": { "$mid": 1, "path": "/c:/Users/<你>/.codebuddycn/extensions/c-block-fold-0.0.1", "scheme": "file" },
     "relativeLocation": "c-block-fold-0.0.1",
     "metadata": { "isMachineScoped": false, "isBuiltin": false }
   }
   ```

   （VS Code 直接复制到扩展目录重启即可，无需登记。）

3. 在用户设置 `settings.json` 中加入（推荐放在语言作用域里）：

   ```jsonc
   {
     "editor.stickyScroll.enabled": true,
     "editor.stickyScroll.maxLineCount": 5,
     "editor.stickyScroll.defaultModel": "foldingProviderModel",
     "[c]": {
       "editor.defaultFoldingRangeProvider": "local.c-block-fold"
     },
     "[cpp]": {
       "editor.defaultFoldingRangeProvider": "local.c-block-fold"
     }
   }
   ```

   > `editor.defaultFoldingRangeProvider` 是 CodeBuddy 内核自定义配置（钩子在 `_selectFoldingRangeProvider`），用于指定折叠范围只用哪个扩展、排除 clangd 的函数级折叠。**必须放在 `[c]`/`[cpp]` 语言作用域块里**——全局设置会把 Python/Java/TS 等语言自己的折叠提供者过滤掉，导致其折叠退化。

4. 重启编辑器，打开 `.c/.h/.cpp` 文件即可看到多层粘性滚动与完整折叠。

## 踩坑记录

| 坑 | 结论 |
| --- | --- |
| cpptools 在 CodeBuddy 无法使用 | 激活时检测非微软产品直接拒绝，无法绕过（不应改 product.json） |
| 粘性滚动只有一层函数头 | 根因是 `editor.stickyScroll.defaultModel` 默认被改成 `outlineModel`；改为 `foldingProviderModel` 才是真正修复 |
| `indentationModel` 无用 | 花括号语言只显示 `{` 所在行 |
| clangd 折叠 | 只有函数级，需本扩展补全 |
| enum 取值 | `["outlineModel","foldingProviderModel","indentationModel"]`（在 workbench.desktop.main.js 中确认） |

## 局限

- `case xxx:` 等不带花括号的行固定不了（需要 cpptools 级 IntelliSense）；如有需要可在 `computeRanges` 里加 switch-case 特殊处理。

## 许可

MIT
