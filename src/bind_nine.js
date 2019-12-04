/**
 * 9 转 ()
 */


const vscode = require('vscode');

function processNine() {
    // 读取设置是否开启
    if (!vscode.workspace.getConfiguration().get('LazyKey.NumberToParentheses')) {
        normalNine();
        return;
    }

    const editor = vscode.window.activeTextEditor;
    if (editor.selection.text != undefined) return; // 有选中文本了

    const document = editor.document;
    const selection = editor.selection;
    if (selection.start.line != selection.end.line || selection.start.character != selection.end.character) {
        return normalNine();
    }
    var position = selection.active;

    if (!analyzeNine(editor, document, position))
        normalNine();
}

/**
 * 判断是不是添加左括号
 */
function analyzeNine(editor, document, position) {
    // 获取全文和当前行内容
    var full = document.getText();
    var word = document.getText(document.getWordRangeAtPosition(position));  // 点号左边的单词
    var line = document.lineAt(position).text;
    var left = line.substring(0, position.character);
    var right = line.substring(position.character);


    // 注释、字符串、正则
    if (!isInCode(document, position, left, right))
        return false;

    // 不处理连续数字。或者小数点
    if (/\d+\.?$/.test(left) || /^\d+/.test(right))
        return false;

    // 判断各种情况是 9 还是 (
    // 判断 单词9 的情况。有一次会匹配到自身，所以至少需要匹配两次
    if (/[\w_]+$/.test(left) && full.match(new RegExp("\\b" + word + '9', 'g')) != null)
        return false;

    // 光标左右的左右括号的数量
    var ll = 0, lr = 0, rl = 0, rr = 0;
    for (var j = 0; j < left.length; j++) {
        var c = left.charAt(j);
        if (c == '(')
            ll++;
        else if (c == ')')
            lr++;
    }
    for (var j = 0; j < right.length; j++) {
        var c = right.charAt(j);
        if (c == '(')
            rl++;
        else if (c == ')')
            rr++;
    }

    // 使用队列判断需不需要添加左括号
    // 左括号数量<=右括号数量
    // ((|(() // 这是什么鬼啊
    if (ll + rl > lr + rr && rl > rr)
        return false;

    // 使用栈判断需不需要添加右括号
    // 左括号数量<=右括号数量
    // ((|)))
    var withRight = !(ll + rl < lr + rr && rl < rr);
    var tabRight = vscode.workspace.getConfiguration().get('LazyKey.TabSkipRightParenthese');
    var newText = (withRight && (right == ''||right == ")"||right == ";"||right == "]")) ?
        (tabRight ? "($1)" : "($0)")
        : "(";

    vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': newText });

    // 延时出现提示（必须延时才会出现）
    if (vscode.workspace.getConfiguration().get('LazyKey.AutoSuggestion')) {
        setTimeout(function () {
            vscode.commands.executeCommand('editor.action.triggerSuggest');
        }, 100);
    }

    return true;
}

function isInCode(document, position, left, right) {
    // 单行注释 //
    if (/\/\//.test(left))
        return false;

    // 块注释 /* */
    if (left.lastIndexOf("/*") > -1 && left.indexOf("*/", left.lastIndexOf("/*")) == -1)
        return false;

    // 字符串 "str|str"    双引号个数是偶数个
    var res = left.match(new RegExp(/(?<!\\)"/g));
    if (res != null && res.length % 2)
        return false;

    // 字符串 'str|str'    单引号个数是偶数个
    res = left.match(new RegExp(/(?<!\\)'/g));
    if (res != null && res.length % 2)
        return false;

    // 正则 /reg|asd/    斜杠个数是偶数个
    res = left.match(new RegExp(/(?<!\\)\//g));
    if (document.languageId == 'javascript' && res != null && res.length % 2)
        return false;

    return true;
}

/**
 * 仅仅添加一行
 */
function normalNine() {
    vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': '9'});
}


module.exports = processNine;