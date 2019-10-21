/**
 * Enter键
 * - "|"    '|'    无视空文本换行
 * - |)}    无视右括号换行
 * - if(|)    {|}    展开括号
 * - if、无分号行    单行缩进
 * - if    下下行取消缩进
 */

const vscode = require('vscode');

function processEnter()
{
    // 读取设置是否开启
    if (!vscode.workspace.getConfiguration().get('LazyKey.SmarterEnter')) {
        normalEnter();
        toIndent2();
        return;
    }

    const editor = vscode.window.activeTextEditor;
    if (editor.selection.text != undefined) return; // 有选中文本了

    const document = editor.document;
    const selection = editor.selection;
    if (selection.start.line != selection.end.line || selection.start.character != selection.end.character) {
        return normalEnter();
    }
    var position = selection.active;

    if (!analyzeSkip(editor, document, position))
    {
        normalEnter();
        toIndent(editor, document, position);
    }
}

/**
 * 判断需不需要跳过右边的内容
 */
function analyzeSkip(editor, document, position)
{
    const left_parentheses = ['\'', '"', '(', '[', '{', '<'];
    const right_parentheses = ['\'', '"', ')', ']', '}', '>'];

    // 获取全文和当前行内容
    var full = document.getText();
    var word = document.getText(document.getWordRangeAtPosition(position));  // 点号左边的单词
    var line = document.lineAt(position).text;
    var left = line.substring(0, position.character);
    var right = line.substring(position.character);

    // 如果不是在字符串中间，则不进行任何操作
    if (left == "" || right == "")
        return false;
    var leftChar = left.slice(-1);
    var rightChar = right.charAt(0);

    // 首先右边必须是要全部右括号或者分号，允许后面注释
    if (! /^['"\)\]\};\s]*(\/[\/\*].*)?$/.test(right)) {
        return false;
    }
    // 允许空字符串 "|")
    if (leftChar == rightChar && (leftChar == '\'' || leftChar == '"')) {

    }
    // fun{|} 这种连续的情况
    else if (leftChar == "{" && rightChar == "}") {
        largeEnter();
        return true;
    }
    // 还有 if ( | )
    else if (/^\s*(if|for|while|foreach|switch)\s*\(\s*$/.test(left) && /^\s*\)/.test(right)) {
        largeEnter();
        return true;
    }

    // 添加下一行，理论上缩进和当前行是一样的
    vscode.commands.executeCommand('editor.action.insertLineAfter');
    toIndent(editor, document, position);

    return true;
}

/**
 * 仅仅添加一行
 */
function normalEnter()
{
    // vscode.commands.executeCommand('lineBreakInsert'); // 这个是在后面插入一行
    vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': '\n' });
}

/**
 * 添加两行，扩展括号
 */
function largeEnter()
{
    vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': '\n\t$0\n' });
}

function toIndent(editor, document, position)
{
    var line = document.lineAt(position).text;
    var prevLine = position.line <= 0 ? ';' : document.lineAt(new vscode.Position(position.line - 1, 0)).text;

    // 计算缩进量
    var indent = false;
    if (/^\s*(if|for|while|foreach|switch)\s*\(.*\)[^;]*$/.test(line))
        indent = true;
    // 空白行，不管
    else if (/^\s+$/.test(line))
        return true;
    // 这一行没有分号结尾？
    else if (/^[^;]+$/.test(line)) {
        // 上一行是分支，必须缩进
        if (/^\s*(if|for|while|foreach|switch)\s*\(.*\)[^;]*$/.test(prevLine)) {

        }
        // 左括号，也需要缩进
        else if (/^\s*{\s*$/.test(line)) {

        }
        // 如果是右花括号，不缩进
        else if (line.indexOf('}') > -1) {
            return true;
        }
        // 判断上一行是不是同样没有分号
        else if (!/^\s*$/.test(prevLine) && /^[^;]+$/.test(prevLine))
        {
            // 如果这一行已经缩进了
            if (/^(\s*)/.exec(line)[1].length > /^(\s*)/.exec(prevLine)[1].length)
                return true;
            // 再继续判断上上行
            var prevPrevLine = position.line <= 1 ? ';' : document.lineAt(new vscode.Position(position.line - 2, 0)).text;
            if (!/^\s*(if|for|while|foreach|switch)\s*\(.*\)[^;]*$/.test(prevPrevLine)
                && /^[^;]+$/.test(prevPrevLine)
                && /^(\s*)/.exec(prevLine)[1].length >= /^(\s*)/.exec(prevPrevLine)[1].length)
                return true;

        }
        indent = true;
    }

    if (indent) {
        var insert = "";
        var indentPrevLine = /^(\s*)/.exec(line)[1];
        if (/^ +$/.test(indentPrevLine)) { // 空格的情况
            insert = "    ";
        } else if (/^\t*$/.test(indentPrevLine)) { // tab的情况
            insert = "\t";
        }
        if (insert != "") {
            vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': insert });
        }
        return true;
    }

    // 单个 if 后面的句子，是否需要 outindent
    var outdent = false;
    if (prevLine.indexOf('{') > -1 || /[^:]:\s*(\/[\/\*].*)?$/.test(prevLine)) {
        outdent = false;
    }
    else if (line.indexOf(';') > -1
        && ((/^[^;]+$/.test(prevLine) || /^[^;]+(\(.+\))?[^;]*$/.test(prevLine))
        && /^(\s*)/.exec(line)[1].length > /^(\s*)/.exec(prevLine)[1].length)
    ) {
        outdent = true;
    }
    else {
        outdent = false;
    }

    if (outdent) {
        setTimeout(function () {
            vscode.commands.executeCommand('outdent');
        }, 50);
    }
}

function toIndent2() {
    const editor = vscode.window.activeTextEditor;
    var document = editor.document;
    var position = editor.selection.active;
    if (position.line == 0) return true;
    var line = document.lineAt(position).text;

    // 计算缩进量
    var indent = false;
    if (/^\s*(if|for|while|foreach|switch)\s\(\s$/.test(line))
        indent = true;
    else if (/^[^;]+$/.test(line))
        indent = true;

    if (indent) {
        var insert = "";
        var indentPrevLine = /^(\s*)/.exec(line)[1];
        if (/^ +$/.test(indentPrevLine)) { // 空格的情况
            insert = "    ";
        } else if (/^\t*$/.test(indentPrevLine)) { // tab的情况
            insert = "\t";
        }
        if (insert != "") {
            vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': insert });
        }
        return true;
    }
}

module.exports = processEnter;