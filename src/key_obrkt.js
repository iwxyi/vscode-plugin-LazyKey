/**
 * 左方括号
 * - 左括号变花括号
 * - 左括号变花括号 Lambda
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
    if (inpt != "[")
        return;

    // 变量表示：(\b[\w_][\w\d_]*\b|\)|\])

    // 右边全是关闭符号
    if (/^[\]\)"'\s]+\s*(\/[\/\*].*)?$/.test(right)) {
        vscode.commands.executeCommand('deleteLeft');
        vscode.commands.executeCommand('editor.action.insertLineAfter');
        vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': '{\n\t$0\n}'});
        // vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': '\n\t\n'});
    }
    else {
        return ;
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
        }, '['));
};