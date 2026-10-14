const vscode = require('vscode');

// 判断一行是否只有注释或空白（用于 Allman 风格回找块头）
function isCommentOnly(s) {
	const t = s.trim();
	return (
		t === '' ||
		t.startsWith('//') ||
		t.startsWith('/*') ||
		t.startsWith('*') ||
		t === '*/'
	);
}

// 扫描全文：花括号配对（跳过字符串/字符/注释）+ 预处理条件区域
function computeRanges(text, FoldingRange) {
	const lines = text.split('\n');
	const ranges = [];
	const braceStack = []; // 记录 '{' 所在行号
	const ppStack = []; // 记录 #if/#ifdef/#ifndef 行号
	const ppIfRe = /^\s*#\s*(if|ifdef|ifndef)\b/;
	const ppEndRe = /^\s*#\s*endif\b/;
	const braceOnlyRe = /^\{\s*(?:\/\/.*)?$/;

	let inBlockComment = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		let inLineComment = false;
		let inString = false;
		let ch = '';

		for (let j = 0; j < line.length; j++) {
			const c = line[j];
			const d = line[j + 1];

			if (inBlockComment) {
				if (c === '*' && d === '/') {
					inBlockComment = false;
					j++;
				}
				continue;
			}
			if (inLineComment) break;
			if (inString) {
				if (c === '\\') {
					j++;
					continue;
				}
				if (c === ch) inString = false;
				continue;
			}
			if (c === '/' && d === '/') {
				inLineComment = true;
				continue;
			}
			if (c === '/' && d === '*') {
				inBlockComment = true;
				j++;
				continue;
			}
			if (c === '"' || c === "'") {
				inString = true;
				ch = c;
				continue;
			}

			if (c === '{') {
				braceStack.push(i);
			} else if (c === '}' && braceStack.length) {
				const openLine = braceStack.pop();
				// K&R 风格（"xxx {"）块头就是本行；Allman 风格（{ 独占一行）回找上一个非注释行
				let header = openLine;
				if (braceOnlyRe.test(lines[openLine].trim())) {
					let k = openLine - 1;
					while (k >= 0 && isCommentOnly(lines[k])) k--;
					if (k >= 0) header = k;
				}
				if (header < i) ranges.push(new FoldingRange(header, i));
			}
		}

		const t = line.trim();
		if (ppIfRe.test(t)) {
			ppStack.push(i);
		} else if (ppEndRe.test(t) && ppStack.length) {
			const s = ppStack.pop();
			if (s < i) ranges.push(new FoldingRange(s, i));
		}
	}

	return ranges;
}

function activate(context) {
	const selector = [
		{ language: 'c' },
		{ language: 'cpp' },
		{ language: 'cuda-cpp' }
	];
	const provider = {
		provideFoldingRanges(document) {
			return computeRanges(document.getText(), vscode.FoldingRange);
		}
	};
	context.subscriptions.push(
		vscode.languages.registerFoldingRangeProvider(selector, provider)
	);
}

function deactivate() {}

module.exports = { activate, deactivate };
