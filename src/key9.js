/**
 * 9 转 ()
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

    // 获取全文和当前行内容
    var full = document.getText();
    var leftPosition = new vscode.Position(position.line, position.character - 1);   // 左边单词右位置
    var word = document.getText(document.getWordRangeAtPosition(leftPosition));  // 点号左边的单词(注意：末尾带9)
    var line = document.lineAt(position).text;
    var inpt = line.substring(position.character - 1, position.character);
    var left = line.substring(0, leftPosition.character);
    var right = line.substring(position.character);

    // 判断左1是不是输入的符号
    if (inpt != "9")
        return;

    // 不处理连续数字
    if (/\d+$/.test(left) || /^\d+/.test(right))
        return ;

    // 判断各种情况是 9 还是 (
    if (/[\w_]+$/.test(left))   // 判断 单词9 是否存在
    {
        var re = new RegExp("\\b" + word); // 注意：word末尾带9
        if (re.test(full))  // 这么一个变量确实存在
            return;
    }

    // 光标左右的左右括号的数量
    var ll = 0, lr = 0, rl = 0, rr = 0;
    for (var j = 0; j < left.length; j++)
    {
        var c = left.charAt(j);
        if (c == '(')
            ll++;
        else if (c == ')')
            lr++;
    }
    for (var j = 0; j < right.length; j++)
    {
        var c = right.charAt(j);
        if (c == '(')
            rl++;
        else if (c == ')')
            rr++;
    }

    // 使用队列判断需不需要添加左括号
    // 左括号数量<=右括号数量
    // ((|(() // 这是什么鬼啊
    if (ll+rl > lr+rr && rl > rr)
        return ;

    // 使用栈判断需不需要添加右括号
    // 左括号数量<=右括号数量
    // ((|)))
    var withRight = !(ll+rl<lr+rr && rl<rr);
    var tabRight = vscode.workspace.getConfiguration().get('LazyKey.TabSkipRightParenthese');
    var newText = withRight ?
        (tabRight ? "($1)" : "($0)")
         : "(";

    // 删除左边，输入新字符
    vscode.commands.executeCommand('deleteLeft');
    vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': newText });
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
        }, '9'));
};