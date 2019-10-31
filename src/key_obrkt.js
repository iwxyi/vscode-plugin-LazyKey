/**
 * 左方括号
 * - 左括号变花括号
 *   - if (|)
 *   - if ()|    包括下一行可能需要包括进去（不支持连续多行缩进）
 *   - ^{|}
 *   - {\ncode}    当前行包括进代码块（不支持连续多行缩进）
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
    if (inpt != "[")
        return;
    // 去掉自动添加的右括号（但是如果不是自动添加的话，也没有办法判断）
    if (right.startsWith(']'))
        right = right.substring(1, right.length);
    // 如果是需要方括号的地方，比如 = []
    if (/(=|>|return)\s*$/.test(left))
        return;
    // 注释、字符串、正则
    if (!isInCode(document, position, left, right))
        return ;


    // 如果右边已经有左花括号了，那么就直接：下一行为空则下移，否则插入
    if (/\{\s*(\/[\/\*].*$)?/.test(right)) {
        var isNextLineBlank = false;
        var needSpace = 0, needTab = 0;
        if (position.line < document.lineCount - 1) {
            var nextLine = document.lineAt(new vscode.Position(position.line + 1, 0)).text;
            isNextLineBlank = /^\s*$/.test(nextLine);

            // 计算缩进差
            var indentLine = /^(\s*)/.exec(line)[1];
            var indentNextLine = /^(\s*)/.exec(nextLine)[1];
            if (/^ +$/.test(indentLine)) { // 空格的情况
                needSpace = indentLine.length + 4 - indentNextLine.length;
            } else if (/^\t*$/.test(indentLine)) { // tab的情况
                needTab = indentLine.length + 1 - indentNextLine.length;
            }
        }
        vscode.commands.executeCommand('deleteLeft');
        if (isNextLineBlank) {
            vscode.commands.executeCommand('cursorDown');
            // vscode.commands.executeCommand('editor.action.reindentlines'); // 这句命令无效……
            // 判断需不需要进行缩进
            if (needTab > 0) {
                var insert = "";
                while (needTab--)
                    insert += "\t";
                vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': insert });
            } else if (needSpace > 0) {
                var insert = "";
                while (needSpace--)
                    insert += " ";
                vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': insert });
            }
        } else {
            vscode.commands.executeCommand('editor.action.insertLineAfter');
        }
    }
    // 如果下一行已经有花括号，那么直接跳到下一行的花括号右边
    else if (position.line < document.lineCount - 1 && /^\s*\{\s*$/.test(document.lineAt(new vscode.Position(position.line + 1, 0)).text)) {
        vscode.commands.executeCommand('deleteLeft');
        vscode.commands.executeCommand('cursorDown');
        vscode.commands.executeCommand('cursorLineEnd');

        // 判断下下行是不是 } ，即这是一套空的花括号，判断要不要插入一个新行
        if (position.line < document.lineCount - 2) {
            var nextNextLine = document.lineAt(new vscode.Position(position.line + 2, 0)).text;
            if (/^\s*\}\s*$/.test(nextNextLine)) { // 这是一个空大括号
                vscode.commands.executeCommand('editor.action.insertLineAfter');

                // 延迟，如果缩进一个，则进行一个缩进
                setTimeout(function () {
                    var nextLine = document.lineAt(new vscode.Position(position.line + 1, 0)).text;
                    var nextNextLine = document.lineAt(new vscode.Position(position.line + 2, 0)).text;
                    var indentNextLine = /^(\s*)/.exec(nextLine)[1];
                    var indentNextNextLine = /^(\s*)/.exec(nextNextLine)[1];
                    if (indentNextLine == indentNextNextLine) {
                        vscode.commands.executeCommand('tab');
                    }
                });
            }
            else if (/^\s*$/.test(nextNextLine)) { // 里面有个空行，继续下移
                vscode.commands.executeCommand('cursorDown');
                // vscode.commands.executeCommand('editor.action.indentLines');

                // 计算缩进差
                var nextLine = document.lineAt(new vscode.Position(position.line + 1, 0)).text;
                var indentNextLine = /^(\s*)/.exec(nextLine)[1];
                var indentNextNextLine = /^(\s*)/.exec(nextNextLine)[1];
                var needSpace = 0, needTab = 0;
                if (/^ +$/.test(indentNextLine)) { // 空格的情况
                    needSpace = indentNextLine.length + 4 - indentNextNextLine.length;
                } else if (/^\t*$/.test(indentNextLine)) { // tab的情况
                    needTab = indentNextLine.length + 1 - indentNextNextLine.length;
                }
                // 插入缩进
                if (needTab > 0) {
                    var insert = "";
                    while (needTab--)
                        insert += "\t";
                    vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': insert });
                } else if (needSpace > 0) {
                    var insert = "";
                    while (needSpace--)
                        insert += " ";
                    vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': insert });
                }
            }
        }
    }
    // 函数左括号 private final void fun    void std::string s()
    else if (/^\s*([\w\d_:]+(\*&\s)+)[\w\d_:]+\($/.test(left) && /^\)\s*$/.test(right)) {
        vscode.commands.executeCommand('deleteLeft');
        vscode.commands.executeCommand('cursorLineEnd');
        vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': '\n{\n\t$0\n}' });
    }
    // lambda或数组参数中括号    , [|]
    else if (/[,=(]\s*$/.test(left)) {
        return;
    }
    // lambda花括号    , [=]{|}    ,[i,j,l...](a,b,c){|}
    else if (/\[[\w\d_,\s&=\*]*\]\s*(\([\w\d_,\s&=\*]*\))?/.test(left)) {
        // 判断上一个方括号左边是什么
        var count = 0, pos = 0;
        var rev = left.split('').reverse().join('');
        for (var c of rev)
        {
            if (c == '[')
                count++;
            else if (c == ']')
                count--;
            pos++;
            if (count == 0 && pos>0)
                break;
        }
        // 除去最近方括号后的左边文本
        var lef = left.substring(0, left.length - pos);
        // 如果是以可能的lambda起始结尾
        if (!/[,=\(]\s*$/.test(lef))
            return ;

        vscode.commands.executeCommand('deleteLeft');
        vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': '{$0}' });
        return;
    }
    // 末尾，需要将下一行包含到代码块中（未考虑连续多行缩进）
    else if (/^\s*(if|else|else\s+if|for|foreach|while)\s*\(.+\)[^;]*$/.test(left) && /^\s*(\/[\/\*].*)?$/.test(right) && position.line < document.lineCount - 1
        && /^(\s*)/.exec(line)[1].length < /^(\s*)/.exec(document.lineAt(new vscode.Position(position.line + 1, 0)).text)[1].length) {
        vscode.commands.executeCommand('deleteLeft');
        var ins = "{";
        if (!left.endsWith(' ')) ins = " " + ins;
        if (!right.startsWith(' ') && !right.startsWith('\t')) ins += " ";
        vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': ins });

        // insert 会有延迟，所以延迟后继续
        setTimeout(function () {
            vscode.commands.executeCommand('cursorDown');
            vscode.commands.executeCommand('cursorLineEnd');
            vscode.commands.executeCommand('editor.action.insertLineAfter');
            vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': '}' });
            vscode.commands.executeCommand('outdent'); // 最后的这个 } 需要向左缩进一位
        }, 100);
    }
    // 开头，需要将当前行包含到代码块中（未考虑连续多行缩进）
    else if (position.line > 0 && /^\s*(if|else|for|foreach|while)\s*\(.+\)[^;]*/.test(document.lineAt(new vscode.Position(position.line - 1, 0)).text)
        && /^\s+$/.test(left) && /\S/.test(right)
        && /^(\s*)/.exec(left)[1].length >= /^(\s*)/.exec(document.lineAt(new vscode.Position(position.line - 1, 0)).text)[1].length) {
        // 获取当前行左边缩进的值
        var indentSelectStart = /^(\s*)/.exec(document.lineAt(new vscode.Position(position.line - 1, 0)).text)[1].length;
        var indentSelectEnd = /^(\s*)/.exec(line)[1].length + 1;
        if (line.charAt(indentSelectEnd) == ']')
            indentSelectEnd++;
        while (indentSelectEnd < line.length && (line.charAt(indentSelectEnd) == ' ' || line.charAt(indentSelectEnd) == '\t'))
            indentSelectEnd++;
        var positionStart = new vscode.Position(position.line, indentSelectStart),
            positionEnd = new vscode.Position(position.line, indentSelectEnd);
        var indentSnippet = /^(\s*)/.exec(document.lineAt(new vscode.Position(position.line - 1, 0)).text)[1];
        if (indentSnippet.indexOf('\t') != -1)
            indentSnippet += '\t';
        else
            indentSnippet += '    ';
        // 第一步：插入左括号并换行
        var textEdit1 = vscode.TextEdit.replace(new vscode.Range(positionStart, positionEnd), '{\n' + indentSnippet);
        let textEdits = [];
        textEdits.push(textEdit1);
        let wordspaceEdit = new vscode.WorkspaceEdit();
        wordspaceEdit.set(document.uri, textEdits);
        vscode.workspace.applyEdit(wordspaceEdit);

        // 第二步：在下一行插入右括号，并且 outdent
        setTimeout(function () {
            vscode.commands.executeCommand('editor.action.insertLineAfter');
            vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': '}' });
            vscode.commands.executeCommand('outdent');
        }, 100);
    }
    // 右边全是关闭符号
    else if (/^[\]\)"'\s]+\s*(\/[\/\*].*)?$/.test(right)) {
        // 如果是变量下标，则取消
        if (/^[\w_][\w\d_]*$/.test(word)) { // word 是一个完整的变量
            if (full.match(new RegExp("\\b" + word + "\\s*\\[", 'g')).length > 1) // 这个变量有下标
                return;
        }

        // 如果是为了补充后面的，也取消
        var count = 0;
        for (var s of right) {
            if (s == '[')
                count++;
            else if (s == "]")
                count--;
        }
        if (count < 0)
            return;

        // 如果后面有注释，则当前行添加的花括号移动到注释前面
        var commentLength = 0;
        var commentContent = "";
        if (/\s*\/[\/\*].*$/.test(right)) {
            // 获取注释的长度
            commentContent = /(\s*\/[\/\*].*)/.exec(right)[1];
            commentLength = commentContent.length;
        }

        // 开始插入花括号
        vscode.commands.executeCommand('deleteLeft');

        var singleLine = true;
        var containNextLine = false;
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
                var reMerga = new RegExp("^\\s*" + branch + "\\b.+\{.*$");
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

            // 分支，判断是否包含下一行，如果有缩进的话
        } else { // 函数
            singleLine = vscode.workspace.getConfiguration().get('LazyKey.FunctionCurlyBraceInSingleLine')
                || vscode.workspace.getConfiguration().get('LazyKey.AutoCurlyBraceInSingleLine');
        }

        var isSwitch = /^\s*switch\b/.test(left); // switch 的花括号内，因为case，所以不需要缩进

        if (singleLine) { // 左括号单独一行
            vscode.commands.executeCommand('editor.action.insertLineAfter');
            if (!isSwitch)
                vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': '{\n\t$0\n}' });
            else
                vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': '{\n$0\n}' });
        } else { // 左括号从右边开始
            if (commentLength == 0) {
                vscode.commands.executeCommand('cursorLineEnd');
                if (right.endsWith(' ')) { // 末尾已经有空格了（虽然不应该）
                    if (!isSwitch)
                        vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': '{\n\t$0\n}' });
                    else
                        vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': '{\n$0\n}' });
                } else { // 末尾手动添加一个空格
                    if (!isSwitch)
                        vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': ' {\n\t$0\n}' });
                    else
                        vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': ' {\n$0\n}' });
                }
            } else { // 有注释
                var endPosition = line.length - commentLength;
                var deltaPosition = endPosition - position.character - 1/*因为多删了一个]*/;
                while (deltaPosition-- > 0) {
                    vscode.commands.executeCommand('cursorRight');
                }
                if (commentContent.startsWith(' ') || commentContent.startsWith('\t')) {
                    vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': ' {' });
                } else {
                    vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': ' { ' });
                }
                setTimeout(function () {
                    vscode.commands.executeCommand('cursorLineEnd');
                    if (!isSwitch)
                        vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': '\n\t$0\n}' });
                    else
                        vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': '\n$0\n}' });
                });
            }
        }
    }
    // 空白处，单独一个大括号
    else if (/^\s*$/.test(left) && /^\]?\s*$/.test(right)) {
        // 缩进跟随上面
        var prevLine = position.line <= 0 ? ';' : document.lineAt(new vscode.Position(position.line - 1, 0)).text;
        var prevIndent = /^(\s*)/.exec(prevLine)[1].length;
        var indent = /^(\s*)/.exec(line)[1].length;
        if (indent > prevIndent)
            vscode.commands.executeCommand('outdent');
        else if (indent < prevIndent && indent != 0)
            vscode.commands.executeCommand('editor.action.indentLines');
        else if (indent < prevIndent && indent == 0)
            vscode.commands.executeCommand('editor.action.reindentLines');

        vscode.commands.executeCommand('deleteLeft');
        vscode.commands.executeCommand('cursorLineEnd');
        vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': '{\n\t$0\n}' });
    }
    // 一行的最右边添加大括号（不包括下一行）。和上一项的区别是判断添不添加空格
    else if (/^[^\{]+$/.test(left) && /^\s*$/.test(right)) {
        // 判断是不是变量声明 const int a[3]
        if (/\s*(\w+\s+)[\w_].+[\w\d_]$/.test(left)) {
            return ;
        }

        // 判断有没有已经存在的变量（指针、数组）
        if (/^\w+$/.test(word)) {
            var re = full.match(new RegExp('\\b' + word + '\\[', 'g'));
            var re2 = full.match(new RegExp('\\b\\*\\s*' + word + '\\b', 'g'));
            if ((re != null && re.length > 1)
                || (re2 != null && re2.length>1)) {
                return ;
            }
        }

        vscode.commands.executeCommand('deleteLeft');
        vscode.commands.executeCommand('cursorLineEnd');
        if (left.endsWith(' '))
            vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': '{\n\t$0\n}' });
        else
            vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': ' {\n\t$0\n}' });
    }
    else {
        return ;
    }
}

function isInCode(document, position, left, right)
{
	// 单行注释 //
    if (/\/\//.test(left))
        return false;

    // 块注释 /* */
    if (left.lastIndexOf("/*") > -1 && left.indexOf("*/", left.lastIndexOf("/*")) == -1)
        return false;

    // 字符串 "str|str"    双引号个数是偶数个
    var res = left.match(new RegExp(/(?<!\\)"/g));
    if (res != null && res.length % 2)
        return false;

    // 字符串 'str|str'    单引号个数是偶数个
    res = left.match(new RegExp(/(?<!\\)'/g));
    if (res != null && res.length % 2)
        return false;

    // 正则 /reg|asd/    斜杠个数是偶数个
    res = left.match(new RegExp(/(?<!\\)\//g));
    if (document.languageId == 'javascript' && res != null && res.length % 2)
        return false;

    return true;
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