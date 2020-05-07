/**
 * C++ 点号转指针
 *
 * 使用 WorkspaceEdit 而不是用 snippet 的原因是：
 * 转换后，不需要撤销两次还原
 */
const vscode = require('vscode');

function provideCompletionItems(document, position, token, context) {
    // 读取设置是否进行开启
    if (!(vscode.workspace.getConfiguration().get('LazyKey.AllEnabled')) ||
        !(vscode.workspace.getConfiguration().get('LazyKey.DotToPoint')))
        return;

    if (vscode.workspace.getConfiguration().get('LazyKey.DotToPointDisabledOnce')) {
        vscode.workspace.getConfiguration().update('LazyKey.DotToPointDisabledOnce', false, true);
        return;
    }
    console.log('---------------------');
    if (['c', 'cpp', 'php'].indexOf(document.languageId) == -1)
        return;

    // 获取编辑器，判断选中文本
    const editor = vscode.window.activeTextEditor;
    if (editor.selection.text != undefined) return;

    // 倒序遍历每一个光标
    var selections = editor.selections;
    let textEdits = [];
    var isPoint = false; // 避免多个光标只有第一个会变成指针
    for (var i = selections.length - 1; i >= 0; --i) {
        // 获取全文和当前行内容
        position = selections[i].end;
        var full = document.getText();
        var leftPosition = new vscode.Position(position.line, position.character - 1); // 左边单词右位置
        var word = document.getText(document.getWordRangeAtPosition(leftPosition)); // 点号左边的单词
        var line = document.lineAt(position).text;
        var inpt = line.substring(position.character - 1, position.character);
        var left = line.substring(0, leftPosition.character);
        var right = line.substring(position.character);

        // 判断左1是不是输入的符号
        if (inpt != ".")
            return;
        // 判断是不是在引号内
        if (isInQuote(left))
            return;

        var newText = "";
        // 指针变回点号
        if (left.endsWith('->')) {
            newText = ".";
            leftPosition = new vscode.Position(leftPosition.line, leftPosition.character - 2);
            vscode.workspace.getConfiguration().update('LazyKey.DotToPointDisabledOnce', true, true);
        }
        // 数字小数点
        else if (/\d$/.test(left)) {
            return;
        } else {
            newText = "->";
            // 两个点号变成指针
            var doublePoint = false;
            if (left.length >= 2 && left.endsWith('.')) {
                if (left.endsWith("..") || left.endsWith("\t.")) // 三个点或开头两点，不知道什么情况，退出
                    return;
                if (left.endsWith(" .")) // 针对可变参数数组的情况 ...
                    return;
                // 剩下就是一个点的情况，加上输入的一共是两个点
                leftPosition = new vscode.Position(leftPosition.line, leftPosition.character - 1);
                word = document.getText(document.getWordRangeAtPosition(leftPosition));
                // left = line.substring(0, leftPosition.character - 1);
                doublePoint = true;
            }

            var usePoint = true;

            // 如果word不是单词，而是右括号，则获取真实的内容
            if (left.endsWith(')')) {
                // 函数例子：getPoint(p)   at(index.row())   substring(0, len('strstrstr'))
                // 方法一：使用正则表达式来判断
                // 实测不支持 substring((0, len('strstrstr'))). 这种嵌套括号，会识别成 len
                /* var match = /\b([\w_][\w\d_]*)\s*\(([^\(\)]*?(\([^\(\)]*?\))?[^\(\)]*?)*?\)$/.exec(left);
                // var match = /\b([\w_][\w\d_]*)\s*\(((?<open>\()|(?<-open>\))|[^()]+)*(?(open)(?!))\)$/.exec(left);
                console.log(match);
                if (match != null) // 获取到新的单词了
                    word = match[1];
                else // 括号左边没有单词
                    continue; */

                // 方法二：使用栈来判断（更稳定）
                var pos = left.length - 1; // 锚点移动位置
                var level = 1; // 右括号-左括号数量
                while (--pos >= 0) {
                    var c = left.charAt(pos);
                    if (c == '(')
                        level--;
                    else if (c == ')')
                        level++;
                    if (level <= 0)
                        break;
                }
                var leftWithWord = left.substring(0, pos);
                if (pos > 0 && level == 0) // 找到位置了
                {
                    var match = /([\w_][\w\d_]*)\s*$/.exec(leftWithWord);
                    if (match != null) // 获取到新的单词了
                        word = match[1];
                    else
                        continue;
                } else // 无法获取单词
                    continue;
                // console.log(word);

                // 因为要和上面配对，所以必须得添加后面成对括号的正则表达式（我好像不会诶，怎么办……）
                // 居然一口气写出来了，真的机智！！！（不过只是简单匹配，不支持嵌套（堆栈）！）
                /* var ch = '[^\\(\\)]*?'; // 非括号单词
                var pair = ch+'(\\('+ch+'\\))?'+ch; // 内部括号对
                var body = '(' + pair + ')*?'; // 多个内容
                var patt = "\\b" + word + "\\(" + body + "\\)"; // 外部括号
                word = patt; // 别动这里！改了一点点就无法运行了！(注释可以动) */
                if (!isFunctionReturnPoint(word, document, position.line))
                    return;
                usePoint = true;
            } else if (/^[\w_\d]+$/.test(word)) // 左边是单词
            {
                // 判断是否是 this或指针类型, 或上文是否有声明为 *var 或者 var-> 的字符
                var re0 = new RegExp("^p_"); // 约定俗成的 p_var 指针类型
                var re1 = new RegExp("\\*\\s*" + word + "\\b");
                var re2 = new RegExp("\\b" + word + "\\s*->");
                var re3 = new RegExp("\\b" + word + "\\b\\s*=\\s*new\\b");
                if (word != "this" && !doublePoint && !re0.test(word) && !re1.test(full) && !re2.test(full) && !re3.test(full))
                    return;

                // 判断上面最近的那个是否是指针
                var pos = position;
                var reDot = new RegExp("\\b" + word + "\\.");
                var rePoi = new RegExp("\\b" + word + "\\->");
                while (pos.line > 0) {
                    pos = new vscode.Position(pos.line - 1, 0);
                    var prevLine = document.lineAt(pos).text;
                    if (reDot.test(prevLine)) {
                        usePoint = false;
                        break;
                    } else if (rePoi.test(prevLine)) {
                        usePoint = true;
                        break;
                    }
                }
            }

            if (!doublePoint && !usePoint && !isPoint) {
                continue;
            }
        }

        // 点号的位置替换为指针
        isPoint = true;
        var newEdit = vscode.TextEdit.replace(new vscode.Range(leftPosition, position), newText);

        // 添加本次的修改
        textEdits.push(newEdit);
    }

    // 不需要做出变化
    if (textEdits.length == 0)
        return;
    // 多个光标，并且都需要改变，那么可能是多个指针（目前无法解决）
    else if (selections.length > 1) {
        vscode.commands.executeCommand('deleteLeft');
        vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': '->' });
        return;
    }

    // 应用到编辑器
    let wordspaceEdit = new vscode.WorkspaceEdit();
    wordspaceEdit.set(document.uri, textEdits);
    vscode.workspace.applyEdit(wordspaceEdit);

    // 延时出现提示（必须延时才会出现）
    if (right == "" || /^\W/.test(right)) { // 如果右边不是字母（即已经有变量了）
        setTimeout(function() {
            vscode.commands.executeCommand('editor.action.triggerSuggest');
        }, 100);
    }
}

/**
 * 判断是一个word(...)->是不是指针
 */
function isFunctionReturnPoint(word, document, line_index) {
    while (--line_index >= 0) {
        var position = new vscode.Position(line_index, 0);
        var line = document.lineAt(position).text;
        if (line.indexOf(word + '(') != -1 || line.indexOf(word + ' (')) // 这一行有函数名
        {
            var pos = line.indexOf(word + '(');
            if (pos == -1)
                pos = line.indexOf(word + ' (') + 1;
            pos += word.length; // 跳过第一个左括号
            var count = 1;
            while (++pos < line.length) {
                var c = line.charAt(pos);
                if (c == '(')
                    count++;
                else if (c == ')')
                    count--;
                if (count == 0)
                    break;
            }
            if (pos < line.length) {
                var right = line.substring(pos + 1);
                if (right.startsWith('.'))
                    return false;
                else if (right.startsWith('->'))
                    return true;
            }
        }
    }
    return false;
}

/**
 * 是否在引号内。支持单引号和双引号
 */
function isInQuote(left) {
    var mode = 0; // 0：不在引号中；1：单引号中；2：双引号中
    for (var i = 0; i < left.length; i++) {
        if (i > 0 && left[i - 1] === '\\') // 转义字符
            continue;
        if (left[i] === "'") {
            if (mode == 1) {
                mode = 0;
            } else if (mode == 0) {
                mode = 1;
            }
        } else if (left[i] === '"') {
            if (mode == 2) {
                mode = 0;
            } else if (mode == 0) {
                mode = 2;
            }
        }
    }
    return mode != 0;
}

/**
 * 光标选中当前自动补全item时触发动作，一般情况下无需处理
 */
function resolveCompletionItem(item, token) {
    return null;
}

module.exports = function(context) {
    // 注册代码建议提示，只有当按下“.”时才触发
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ scheme: 'file', languages: ['c', 'cpp', 'php'] }, {
        provideCompletionItems,
        resolveCompletionItem
    }, '.'));
};