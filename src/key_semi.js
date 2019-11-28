/**
 * 分号
 * - for ( ; ;)
 * - 后面是注释，不动
 * - 末尾已有分号，换行
 * - 连续分号，换行
 * - 单行变量声明/方法操作，换行
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

        // 判断上一行是不是没有括号的分支语句，若是则反缩进一层
        if (position.line == 0)
            return ;

        var prevLinePosition = new vscode.Position(position.line - 1, 0);
        var prevLine = document.lineAt(prevLinePosition).text;
        if (/^\s*(if|else if|for|while|foreach)\s*\(.+\)\s*(\/[\/\*].*)?$/.test(prevLine)
            || /^\s*else\s*(\/[\/\*].*)?/.test(prevLine)) {
            // 判断缩进数量
            if (/^(\s*)/.exec(line)[1].length > /^(\s*)/.exec(prevLine)[1].length)
                setTimeout(function () {
                    vscode.commands.executeCommand('outdent');
                }, 100);
        }
        // case x: ...break;
        else if (/^\s*break;;\s*$/.test(line)) {
            // 判断有没有 case x:
            var indentLine = /^(\s*)/.exec(line)[1].length; // 当前行缩进
            var line = position.line;
            var isCase = false;
            while (--line >= 0) {
                var pos = new vscode.Position(line, 0);
                var prevLine = document.lineAt(pos).text;
                var indentPrevLine = /^(\s*)/.exec(prevLine)[1].length
                if (indentPrevLine < indentLine) {
                    isCase = /^(\s*)case.+:[^\{]*$/.test(prevLine);
                    break;
                }
            }
            if (isCase) {
                setTimeout(function () {
                    vscode.commands.executeCommand('outdent');
                }, 100);
            }
        }

        return ;
    }
    // 非变量声明的类似变量声明 new delete emit，分号不换行（只到末尾）
    else if (/^\s*(new|delete|emit|return|die|exit)\b/.test(left)) {
        vscode.commands.executeCommand('deleteLeft');
        vscode.commands.executeCommand('cursorLineEnd');
        vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': ';' });
    }
    // 单行变量声明，末尾添加分号，换行
    // Type var;    Type var = xxx;    Type var(xxx);
    // 或者方法操作    obj.method()     point->method(asd)
    else if ((/^\s*((const|static|public|private|protected|final|mutable|package|:)\s*)*([\w_\d:]+)\s*(<.+?>|&?|\*?)\s*(\b[\w_][\w\d_]*)\s*(=.+|\(.+)?$/.test(left)
        && !/^\s*(return|print|die|exit|assert)\b/.test(left))
        /*|| (/^\s*[\(\)\w\d_\*:]+(\.|\->)[\w\d]+\(/.test(left) && /^['"\)\]]+$/.test(right))*/ ) {
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
    // 末尾有结尾的花括号
    else if (/\}/.test(right)) {
        return ;
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