/**
 * Enter键
 * - 跳过末尾标点
 */
const vscode = require('vscode');

function provideCompletionItems(document, position, token, context) {
    // 读取设置是否进行开启
    if (!(vscode.workspace.getConfiguration().get('LazyKey.AllEnabled'))
        || !(vscode.workspace.getConfiguration().get('LazyKey.EnterSkip')))
        return;

    // 获取编辑器，判断选中文本
    const editor = vscode.window.activeTextEditor;
    if (editor.selection.text != undefined) return;

    var selections = editor.selections;
    if (selections.length > 1) return;

    // 获取全文和当前行内容
    var full = document.getText();
    var word = document.getText(document.getWordRangeAtPosition(position));  // 点号左边的单词
    var line = document.lineAt(position).text;
    var left = line.substring(0, position.character);
    var right = line.substring(position.character);

    // 右边是各种括号
    if (/["\]\);]+\s*(\/[\/\*].*)?/.test(right)) {
        vscode.commands.executeCommand('undo');
        vscode.commands.executeCommand('editor.action.insertLineAfter');

        // 自动判断缩进
        if (vscode.workspace.getConfiguration().get('editor.formatOnType') != true) {
            setTimeout(function () {
                var prevLine = document.lineAt(new vscode.Position(position.line - 1, 0)).text; // 原本上一行的内容

                // 如果需要添加一个缩进
                if (/^\s*\w+\s*\(.+\)\s*(\/[\/\*].*)?/.test(prevLine)) {
                    vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': '\t' });
                }
            }, 10);
        }
    }
    else {

    }

    // 莫名的出现提示，隐藏掉（偶尔会一闪而过）
    vscode.commands.executeCommand('hideSuggestWidget');
    setTimeout(function () {
        vscode.commands.executeCommand('hideSuggestWidget');
    }, 0);
    setTimeout(function () {
        vscode.commands.executeCommand('hideSuggestWidget');
    }, 10);
    setTimeout(function () {
        vscode.commands.executeCommand('hideSuggestWidget');
    }, 50);
    setTimeout(function () {
        vscode.commands.executeCommand('hideSuggestWidget');
    }, 100);
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
        { scheme: 'file', languages: ['c', 'cpp', 'php', 'java', 'js', 'cs', 'python', 'jsp'] }, {
            provideCompletionItems,
            resolveCompletionItem
        }, '\n'));
};