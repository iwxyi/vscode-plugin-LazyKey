/**
 * C++类 点号转指针
 * API：https://code.visualstudio.com/api/references/vscode-api
 */
const vscode = require('vscode');

function provideCompletionItems(document, position, token, context) {
    // 读取设置是否进行更改
    const conf = vscode.workspace.getConfiguration().get('LazyKey.dotToPoint');
    // vscode.workspace.getConfiguration().update('LazyKey.dotToPoint', '懒键', true);
    if (conf != true) return ;

    const editor = vscode.window.activeTextEditor;
    if (editor.selection.text != undefined) return; // 有选中文本了

    // 获取全文和单词
    var full = document.getText();
    var leftPosition = new vscode.Position(position.line, position.character-1);   // 左边单词右位置
    var word = document.getText(document.getWordRangeAtPosition(leftPosition));  // 点号左边的单词

    // 获取当前行内容
    var line = document.lineAt(position).text;
    var left = line.substring(0, leftPosition.character);
    var right = line.substring(position.character);

    // 判断左1是不是点号
    if (line.slice(-1) != ".")
        return ;

    // 两个点号变成指针
    var doublePoint = false;
    if (left.length >= 2 && left.slice(-1) == ".")
    {
        if (left.slice(-2) == ".." || left.slice(-2) == "\t.") // 三个点或开头两点，不知道什么情况，退出
            return ;
        if (left.slice(-2) == " .") // 针对可变参数数组的情况 ...
            return ;
        leftPosition = new vscode.Position(position.line, position.character - 2);
        word = document.getText(document.getWordRangeAtPosition(leftPosition));
        left = line.substring(0, leftPosition.character - 1);
        doublePoint = true;0
    }

    // 判断上文是否有声明为 *var 或者 var-> 的字符
    var re1 = new RegExp("\\*\\s*" + word + "\\b");
    var re2 = new RegExp("\\b"+word+"\\s*->");
    if (!doublePoint && !re1.test(full) && !re2.test(full))
        return ;

    // 点号的位置替换为指针
    var newEdit = vscode.TextEdit.replace(new vscode.Range(leftPosition, position), "->");

    // 应该本次的修改
    let textEdits = [];
    textEdits.push(newEdit);
    let wordspaceEdit = new vscode.WorkspaceEdit();
    wordspaceEdit.set(document.uri, textEdits);
    vscode.workspace.applyEdit(wordspaceEdit);
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
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('cpp', {
        provideCompletionItems,
        resolveCompletionItem
    }, '.'));
};