/**
 * 在代码区域的 中文符号 转 英文符号
 */
const vscode = require('vscode');

function changeSymbol(document, position) {
    // 获取编辑器，判断选中文本
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.selection.text != undefined) return;

    // 获取全文和当前行内容
    var leftPosition = new vscode.Position(position.line, position.character - 1); // 左边单词右位置
    var line = document.lineAt(position).text;
    var inpt = line.substring(position.character - 1, position.character); // 最后一个词

    // 查找相关的字符串
    var cnArr = ['，', '。', '；', '：', '？', '！', '（', '）', '【', '】', '《', '》', '‘', '’', '“', '”', '——', '、', '·'];
    var enArr = [',', '.', ';', ':', '?', '!', '(', ')', '[', ']', '<', '>', '\'', '\'', '"', '"', '_', '/', '`'];
    var idx = cnArr.indexOf(inpt);
    if (idx == -1)
        return;

    // 注释、字符串、正则
    var left = line.substring(0, leftPosition.character);
    var right = line.substring(position.character);
    if (!isInCode(document, position, left, right))
        return;

    // 开始替换
    var newChar = enArr[idx];
    vscode.commands.executeCommand('deleteLeft');
    vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': newChar });
}

function isInCode(document, position, left, right) {
    // 单行注释 //
    if (/\/\//.test(left))
        return false;

    // 块注释 /* */
    if (left.lastIndexOf("/*") > -1 && left.indexOf("*/", left.lastIndexOf("/*")) == -1)
        return false;

    // 其他例如多行块注释；就不仔细判断了
    if (/^\s*[*#]/.test(left))
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
    if (document.languageId == 'javascript' && res != null && res.length % 2 && /(;\s*|if.+|=.+)$/.test(left))
        return false;

    return true;
}

module.exports = changeSymbol;