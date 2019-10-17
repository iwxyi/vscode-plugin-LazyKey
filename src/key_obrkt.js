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
    if (right == "" && !/\)\s*/.test(left)) // 右边必须有闭合符号，或者就是在闭合符号后面
        return ;

    // 右边全是关闭符号
    if (/^[\]\)"'\s]+\s*(\/[\/\*].*)?$/.test(right)) {
        // 如果是变量下标，则取消
        if (/^[\w_][\w\d_]*$/.test(word)) { // word 是一个完整的变量
            if (full.match(new RegExp("\\b" + word + "\\s*\\[", 'g')).length > 1) // 这个变量有下标
                return ;
        }

        // 如果是为了补充后面的
        var count = right.startsWith(']') ? 1 : 0;
        for (var s of right) {
            if (s == '[')
                count++;
            else if (s == "]")
                count--;
        }
        if (count < 0)
            return ;

        // 开始插入花括号
        vscode.commands.executeCommand('deleteLeft');

        var inLine = true;
        if (/^\s*(if|for|foreach|while|switch|do|else)\b/.test(left)) { // 是分支呀 if (|)
            if (vscode.workspace.getConfiguration().get('LazyKey.AutoCurlyBraceInLine')) { // 跟随上方
                // 获取分支的关键词


                // 搜索上面距离最近的那个


                // 如果没有搜到，则默认

            } else {
                inLine = vscode.workspace.getConfiguration().get('LazyKey.BranchCurlyBraceInLine')
            }
        } else { // 函数
            inLine = vscode.workspace.getConfiguration().get('LazyKey.FunctionCurlyBraceInLine')
                || vscode.workspace.getConfiguration().get('LazyKey.AutoCurlyBraceInLine');
        }

        if (inLine) { // 左括号单独一行
            vscode.commands.executeCommand('editor.action.insertLineAfter');
            vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': '{\n\t$0\n}' });
        } else { // 左括号从右边开始
            // 此处没有判断注释的情况
            vscode.commands.executeCommand('cursorLineEnd');
            if (right.endsWith(' ')) { // 末尾已经有空格了（虽然不应该）
                vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': '{\n\t$0\n}' });
            } else { // 末尾手动添加一个空格
                vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': ' {\n\t$0\n}' });
            }
        }

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