/**
 * 左方括号
 * - 左括号变花括号
 *   - if (|)
 *   - if ()|
 *   - ^{|}
 * - 左括号变花括号 Lambda
 *   - , [|])
 *   - []{|})
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
    // 去掉自动添加的右括号（但是如果不是自动添加的话，也没有办法判断）
    if (right.startsWith(']'))
        right = right.substring(1, right.length);

    // lambda中括号    , [|]
    if (/,\s*$/.test(left)) {
        return ;
    }
    // lambda花括号    , [=]{|}    ,[i,j,l...](a,b,c){|}
    else if (/\[[\w\d_,\s&=\*]*\]\s*(\([\w\d_,\s&=\*]*\))?/.test(left)) {
        vscode.commands.executeCommand('deleteLeft');
        vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': '{$0}' });
        return ;
    }
    // 右边全是关闭符号
    else if (/^[\]\)"'\s]+\s*(\/[\/\*].*)?$/.test(right)) {
        // 如果是变量下标，则取消
        if (/^[\w_][\w\d_]*$/.test(word)) { // word 是一个完整的变量
            if (full.match(new RegExp("\\b" + word + "\\s*\\[", 'g')).length > 1) // 这个变量有下标
                return ;
        }

        // 如果是为了补充后面的
        var count = 0;
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

        var singleLine = true;
        if (/^\s*(if|for|foreach|while|switch|do|else)\b/.test(left)) { // 是分支呀 if (|)
            if (vscode.workspace.getConfiguration().get('LazyKey.AutoCurlyBraceInSingleLine')) { // 跟随上方
                // 获取分支的关键词
                var branch = /^\s*(\w+)\b.+/.exec(line)[1].trim();

                // 合并同类内容
                if (branch == 'if' || branch == 'else')
                    branch = '(if|else)';
                else if (branch == 'for' || branch == 'while' || branch == 'foreach')
                    branch = '(for|while|foreach)';

                // 搜索上面距离最近的那个
                var lineIndex = position.line;
                var reAll = new RegExp("^\\s*" + branch + "\\b");
                var reSingle = new RegExp("^\\s*" + branch + "\\b[^\{]+\\s*(/[/\\*].*)?$");
                var reMerga = new RegExp("^\\s*"+ branch + "\\b.+\{.*$");
                var reTotal = new RegExp("^\\s*" + branch + "\\b.+\{.*\}\\s*(/[/\\*].*)?$");
                var reAlone = new RegExp("^\\s*{\\s*$");
                var nextLineAlone = false; // 当前监测的下一行是否是一个花括号。初始是编辑行，false
                while (--lineIndex >= 0) {
                    var lineContent = document.lineAt(new vscode.Position(lineIndex, 0)).text;
                    /*console.log(
                        lineIndex,
                        lineContent,
                        "all:" + reAll.test(lineContent),
                        "single:" + reSingle.test(lineContent),
                        "merga:" + reMerga.test(lineContent),
                        "total:" + reTotal.test(lineContent),
                        "alone:" + reAlone.test(lineContent)
                    );*/
                    if (reAll.test(lineContent)) { // 是同样的分支语句
                        if (reSingle.test(lineContent)) { // 单独一行的
                            if (nextLineAlone) // 这个 if/for/while 没有花括号，单独一行，忽略
                                singleLine = true;
                            else
                                continue;
                        }
                        else if (reTotal.test(lineContent)) { // 左右括号单独连在一行的，跳过
                            continue;
                        }
                        else if (reMerga.test(lineContent)) { // 合在一行的
                            singleLine = false;
                        }
                        else { // 其他的情况？
                            continue;
                        }
                        break;
                    }
                    else if (reAlone.test(lineContent)) {
                        nextLineAlone = true;
                    }
                    else {
                        nextLineAlone = false;
                    }
                }

                // 如果没有搜到，则默认
                if (lineIndex < 0)
                    singleLine = vscode.workspace.getConfiguration().get('LazyKey.BranchCurlyBraceInSingleLine');
            } else {
                singleLine = vscode.workspace.getConfiguration().get('LazyKey.BranchCurlyBraceInSingleLine');
            }
        } else { // 函数
            singleLine = vscode.workspace.getConfiguration().get('LazyKey.FunctionCurlyBraceInSingleLine')
                || vscode.workspace.getConfiguration().get('LazyKey.AutoCurlyBraceInSingleLine');
        }

        if (singleLine) { // 左括号单独一行
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
    // 空白处，单独一个大括号
    else if (/^\s*$/.test(left) && /^\]?\s*$/.test(right)) {
        vscode.commands.executeCommand('deleteLeft');
        vscode.commands.executeCommand('cursorLineEnd');
        vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': '{\n\t$0\n}' });
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