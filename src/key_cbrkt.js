/**
 * 右方括号
 * - 跳出同一行的 }
 * - 跳出到下一行 } 的下一行
 */
const vscode = require('vscode');

function provideCompletionItems(document, position, token, context) {
    // 读取设置是否进行开启
    if (!(vscode.workspace.getConfiguration().get('LazyKey.AllEnabled'))
        || !(vscode.workspace.getConfiguration().get('LazyKey.AutoSemicolon')))
        return;

    // 获取编辑器，判断选中文本
    const editor = vscode.window.activeTextEditor;
    if (editor.selection.text != undefined) return;

    // 获取全文和当前行内容
    var full = document.getText();
    var leftPosition = new vscode.Position(position.line, position.character - 1);   // 左边单词右位置
    var word = document.getText(document.getWordRangeAtPosition(leftPosition));  // 点号左边的单词
    var line = document.lineAt(position).text;
    var inpt = line.substring(position.character - 1, position.character);
    var left = line.substring(0, leftPosition.character);
    var right = line.substring(position.character);

    // 判断左1是不是输入的符号
    if (inpt != "]")
        return;

    // 右边是 ] ，不进行处理
    if (right.startsWith(']'))
        return ;
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
    // 如果下下行还是空的，则继续跳到下一行
    else if (/^\s*\}\s*$/.test(document.lineAt(new vscode.Position(position.line + 1, 0)).text)) {
        vscode.commands.executeCommand('deleteLeft');
        vscode.commands.executeCommand('cursorDown');
        vscode.commands.executeCommand('cursorLineEnd');

        var nextNextLine = document.lineAt(new vscode.Position(position.line + 2, 0)).text;

        // 计算缩进……
        var nextLine = document.lineAt(new vscode.Position(position.line + 1, 0)).text; // 此处固定为 }，带缩进
        var indent = /^(\s*)\}/.exec(nextLine)[1];

        // 判断是否继续移动到 } 的下一行
        // 下下行是空的
        if (/^\s*$/.test(nextNextLine)) {
            vscode.commands.executeCommand('cursorDown');
            vscode.commands.executeCommand('cursorLineEnd');
            if (/^$/.test(nextNextLine)) { // 是完全空的一行，没有缩进，需要计算添加
                if (indent == '') // 这一块的总体缩进就是空的，不需要缩进
                    return ;
                vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': indent});
            }
        }
        // 下一行还是结束的 } ，按现在这个操作，应该是要继续写代码吧
        else if (/^\s*\}/.test(nextNextLine)) {
            vscode.commands.executeCommand('editor.action.insertLineAfter');
        }
    }
}

/**
 * 光标选中当前自动补全item时触发动作，一般情况下无需处理
 * @param {*} item
 * @param {*} token
 */
function resolveCompletionItem(item, token) {
    return null;
}

module.exports = function (context) {
    // 注册代码建议提示，只有当按下“.”时才触发
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(
        { scheme: 'file', languages: ['c', 'cpp', 'php', 'java', 'js', 'cs', 'jsp'] }, {
            provideCompletionItems,
            resolveCompletionItem
        }, ']'));
};