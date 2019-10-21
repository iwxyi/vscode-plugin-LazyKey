/**
 * 分号
 * - for ( ; ;)
 * - 后面是注释，不动
 * - 末尾已有分号，换行
 * - 连续分号，换行
 * - 单行变量声明，换行
 * - 到末尾
 */
const vscode = require('vscode');

function provideCompletionItems(document, position, token, context) {
    // 读取设置是否进行开启
    if (!(vscode.workspace.getConfiguration().get('LazyKey.AllEnabled'))
        || !(vscode.workspace.getConfiguration().get('LazyKey.AutoSemicolon')))
        return;
    if (['c', 'cpp', 'java', 'js', 'javascript', 'jsp', 'php', 'cs'].indexOf(document.languageId) == -1)
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
    if (inpt != ";")
        return;
    // 变量表示：(\b[\w_][\w\d_]*\b|\)|\])

    // for ( ; ; )
    if (/\s*for\b\s*\(/.test(left)) {
        vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': ' ' });
        return ;
    }
    // 后面是注释 // /*
    else if (/^\s*\/[\/\*]/.test(right)) {
        return ;
    }
    // 末尾已有分号，换行
    // 两个连续分号，换行
    else if (/;\s*(\/[\/\*].*)?/.test(right)
        || /;\s*$/.test(left)) {
        vscode.commands.executeCommand('deleteLeft');
        vscode.commands.executeCommand('editor.action.insertLineAfter');
        return ;
    }
    // 单行变量声明，末尾添加分号，换行
    // Type var;    Type var = xxx;    Type var(xxx);
    else if (/^\s*((const|static|public|private|protected|final|mutable|package|:)\s*)*([\w_\d:]+)\s*(<.+?>|&?|\*?)\s*(\b[\w_][\w\d_]*)\s*(=.+|\(.+)?$/.test(left)) {
        var delay = false;
        // 如果不是在行尾，则将分号移动到末尾
        if (right != "") {
            vscode.commands.executeCommand('deleteLeft');
            vscode.commands.executeCommand('cursorLineEnd');
            vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': ';'});
            // 延迟换行，不然插入的 snippet 会带入到下一行
            delay = true;
        }
        // 如果下一行就是右大括号了，那么直接添加下一行
        var nextLinePosition = new vscode.Position(position.line+1, 0);
        var nextLine = document.lineAt(nextLinePosition).text;
        if (/^\s*\}\s*$/.test(nextLine)) { // 下一行只有右括号
            if (delay) {
                setTimeout(function () {
                    vscode.commands.executeCommand('editor.action.insertLineAfter');
                }, 10);
            } else {
                vscode.commands.executeCommand('editor.action.insertLineAfter');
            }
        }
    }
    // 普通操作：到末尾添加分号
    else {
        vscode.commands.executeCommand('deleteLeft');
        vscode.commands.executeCommand('cursorLineEnd');
        vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': ';'});
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
        }, ';'));
};