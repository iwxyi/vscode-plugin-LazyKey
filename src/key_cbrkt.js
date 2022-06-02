/**
 * 右方括号
 * - 跳出同一行的 }
 * - 跳出到下一行 } 的下一行
 * - }] 这种情况，添加下一行
 */
const vscode = require('vscode');

/**
 * 左括号-右括号的数量
 * @param {string} str
 */
function getLeftBracketCompare(str) {
    var count = 0;
    for (var c of str) {
        if (c == '[')
            count++;
        else if (c == ']')
            count--;
    }
    return count;
}

function provideCompletionItems(document, position, token, context) {
    // 读取设置是否进行开启
    if (!(vscode.workspace.getConfiguration().get('LazyKey.AllEnabled')) ||
        !(vscode.workspace.getConfiguration().get('LazyKey.AutoOperators')))
        return;
    if (['c', 'cpp', 'java', 'js', 'javascript', 'jsp', 'php', 'cs'].indexOf(document.languageId) == -1)
        return;

    // 获取编辑器，判断选中文本
    const editor = vscode.window.activeTextEditor;
    if (editor.selection.text != undefined) return;

    // 获取全文和当前行内容
    var full = document.getText();
    var leftPosition = new vscode.Position(position.line, position.character - 1); // 左边单词右位置
    var word = document.getText(document.getWordRangeAtPosition(leftPosition)); // 点号左边的单词
    var line = document.lineAt(position).text;
    var inpt = line.substring(position.character - 1, position.character);
    var left = line.substring(0, leftPosition.character);
    var right = line.substring(position.character);

    // 判断左1是不是输入的符号
    if (inpt != "]")
        return;
    // 注释、字符串、正则
    if (!isInCode(document, position, left, right))
        return;

    // 右边是 ] ，不进行处理
    if (right.startsWith(']')) {
        return;
    }
    // if (a[100]|)  跳过的情况，没有什么好的判断情况
    else if (/\[.*$/.test(left) && getLeftBracketCompare(left) > 0) {
        return;
    }
    // 右边有可跳出的 }
    else if (/^\s*\}/.test(right)) {
        var text = /^(\s*\})/.exec(right)[1];
        console.log(text);
        var len = text.length;
        vscode.commands.executeCommand('deleteLeft');
        while (len--)
            vscode.commands.executeCommand('cursorRight');
    }
    // 下一行是单独的 }，则跳到下行
    // 如果下下行还是空的，则继续跳到下一行(如果下下下行是空的；否则插入新下一行)
    else if (position.line < document.lineCount - 1 && /^\s*\}\s*$/.test(document.lineAt(new vscode.Position(position.line + 1, 0)).text)) {
        vscode.commands.executeCommand('deleteLeft');
        vscode.commands.executeCommand('cursorDown');
        vscode.commands.executeCommand('cursorLineEnd');

        var nextNextLine = position.line < document.lineCount - 2 ?
            document.lineAt(new vscode.Position(position.line + 2, 0)).text : ";";

        // 计算缩进……
        var nextLine = document.lineAt(new vscode.Position(position.line + 1, 0)).text; // 此处固定为 }，带缩进
        var indent = /^(\s*)\}/.exec(nextLine)[1];

        // 判断是否继续移动到 } 的下一行
        // 下下行是空的
        if (/^\s*$/.test(nextNextLine)) {
            vscode.commands.executeCommand('cursorDown');
            vscode.commands.executeCommand('cursorLineEnd');
            var ins = '';
            if (/^$/.test(nextNextLine)) { // 是完全空的一行，没有缩进，需要计算添加
                if (indent == '') // 这一块的总体缩进就是空的，不需要缩进
                    ins = '';
                else
                    ins = indent;
            }
            // 如果判断下下下行的内容，如果非空非有大括号，则需要插入新的一行代替
            var nextNextNextLine = position.line < document.lineCount - 3 ?
                document.lineAt(new vscode.Position(position.line + 3, 0)).text : "";
            if (!/^\\s*\\}?\\s*$/.test(nextNextNextLine)) // 右大括号的下下行有内容，需要添加一个空行分隔
                ins += '$0\n' + indent;
            if (ins != '')
                vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': ins });
        }
        // 下一行还是结束的 } ，按现在这个操作，应该是要继续写代码吧
        else if (/^\s*\}/.test(nextNextLine)) {
            vscode.commands.executeCommand('editor.action.insertLineAfter');
        }
    }
    // ^ }] 这种情况，一般是双击 ]]，添加下一行
    else if (/^\s*\}\s*$/.test(left) && right == "") {
        vscode.commands.executeCommand('deleteLeft');
        vscode.commands.executeCommand('editor.action.insertLineAfter');
    }
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
    if (document.languageId == 'javascript' && res != null && res.length % 2)
        return false;

    return true;
}

/**
 * 光标选中当前自动补全item时触发动作，一般情况下无需处理
 * @param {*} item
 * @param {*} token
 */
function resolveCompletionItem(item, token) {
    return null;
}

module.exports = function(context) {
    // 注册代码建议提示，只有当按下“.”时才触发
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ scheme: 'file', languages: ['c', 'cpp', 'php', 'java', 'js', 'cs', 'jsp'] }, {
        provideCompletionItems,
        resolveCompletionItem
    }, ']'));
};