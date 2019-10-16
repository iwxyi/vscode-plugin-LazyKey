/**
 * 智能空格
 */
const vscode = require('vscode');

function provideCompletionItems(document, position, token, context) {
    // 读取设置是否进行开启
    if (!(vscode.workspace.getConfiguration().get('LazyKey.AllEnabled'))
        || !(vscode.workspace.getConfiguration().get('LazyKey.NumberToParentheses')))
        return;

    // 获取编辑器，判断选中文本
    const editor = vscode.window.activeTextEditor;
    if (editor.selection.text != undefined) return;

    // 多光标，为保证稳定性不支持
    var selections = editor.selections;
    if (selections.length > 1) return ;

    // 获取全文和当前行内容
    var full = document.getText();
    var leftPosition = new vscode.Position(position.line, position.character - 1);   // 左边单词右位置
    var word = document.getText(document.getWordRangeAtPosition(leftPosition));  // 点号左边的单词
    var line = document.lineAt(position).text;
    var inpt = line.substring(position.character - 1, position.character);
    var left = line.substring(0, leftPosition.character);
    var right = line.substring(position.character);

    // 判断左1是不是输入的符号
    if (inpt != " ")
        return;

    // 右边不是空的，那么这个空格就可能是为了分隔
    if (right!="")
        return ;

    var newText = "";
    var hasPair = false;

    // if    else if    for    while   switch    ==>    if (|)
    if (/^\s*(if|else\s+if|for|while|switch)\s*$/.test(left))
    {
        newText = "($0)";
        hasPair = true;
    }
    // else   ==>    else if (|)
    else if (/^\s*else$/.test(left))
    {
        newText = "if ($0)";
        hasPair = true;
    }
    // #include    ==>    #include <|>
    else if (/^#include\s*$/.test(left))
    {
        newText = "<$0>";
        hasPair = true;
    }
    

    if (!hasPair) {
        // 应用到编辑器，有点是只需要撤销一次
        let textEdits = [];
        var newEdit = vscode.TextEdit.replace(new vscode.Range(leftPosition, position), " ");
        textEdits.push(newEdit);
        wordspaceEdit.set(document.uri, textEdits);
        vscode.workspace.applyEdit(wordspaceEdit);
    } else if (true) { // 包括成对括号的，需要撤销两次
        vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet':  newText});
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
        { scheme: 'file', languages: ['c', 'cpp', 'php', 'java', 'js', 'cs', 'python', 'jsp'] }, {
            provideCompletionItems,
            resolveCompletionItem
        }, ' '));
};