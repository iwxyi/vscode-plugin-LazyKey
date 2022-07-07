/**
 * 等号
 * - var = |
 * - var == |
 * - var==
 * - var+=
 * - var 1=
 * - var1=
 */
const vscode = require('vscode');

function provideCompletionItems(document, position, token, context) {
    // 读取设置是否进行开启
    if (!(vscode.workspace.getConfiguration().get('LazyKey.AllEnabled')) ||
        !(vscode.workspace.getConfiguration().get('LazyKey.AutoOperators')))
        return;
    if (['c', 'cpp', 'java', 'javascript', 'jsp', 'php', 'csharp'].indexOf(document.languageId) == -1)
        return;

    // 获取编辑器，判断选中文本
    const editor = vscode.window.activeTextEditor;
    if (editor.selection.text != undefined) return;

    // 倒序遍历每一个光标
    // 多个，有一个需要添加则进行添加
    var selections = editor.selections;
    let textEdits = [];
    var showSuggestions = true;
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

        if (i == selections.length - 1) {
            if (!isInCode(document, position, left, right))
                return;
        }

        // 判断左1是不是输入的符号
        if (inpt != "=")
            return;
        /* // 必须要右边全部空的
        if (right != "" && !right.startsWith(')'))
            return; */

        var newText = "";
        // 变量表示：(\b[\w_][\w\d_]*\b|\)|\])
        // var a1 =
        if (/^\s*(\w+\s+)([\w_][\w\d_]*)$/.test(left) && right == '') {
            newText = " = ";
        }
        // var 1=
        else if (/ 1$/.test(left)) {
            leftPosition = new vscode.Position(leftPosition.line, leftPosition.character - 1);
            newText = "!=";
            if (!right.startsWith(' '))
                newText += ' ';
        }
        // getA()1 =    arr[3]1 =
        else if (/[\)\]]1$/.test(left)) {
            leftPosition = new vscode.Position(leftPosition.line, leftPosition.character - 1);
            newText = " !=";
            if (!right.startsWith(' '))
                newText += ' ';
        }
        // var1=
        else if (/\S1$/.test(left)) {
            // 判断存不存在名字叫“var1”的变量
            var wordPos = new vscode.Position(position.line, position.character - 2);
            var word = document.getText(document.getWordRangeAtPosition(wordPos)); // 左边的单词(包含末尾的1)
            var match1 = full.match(new RegExp("\\b" + word, 'g'));
            if (match1 != null && match1.length > 1) { // 存在这样的变量
                newText = " =";
            } else {
                leftPosition = new vscode.Position(leftPosition.line, leftPosition.character - 1);
                newText = " !=";
            }
            if (!right.startsWith(' '))
                newText += ' ';
        }
        // var_=
        else if (/\S_$/.test(left)) {
            // 判断存不存在名字叫“var1”的变量
            var wordPos = new vscode.Position(position.line, position.character - 2);
            var word = document.getText(document.getWordRangeAtPosition(wordPos)); // 左边的单词(包含末尾的1)
            var match1 = full.match(new RegExp("\\b" + word, 'g'));
            if (match1 != null && match1.length > 1) { // 存在这样的变量
                newText = " =";
            } else {
                leftPosition = new vscode.Position(leftPosition.line, leftPosition.character - 1);
                newText = " -=";
            }
            if (!right.startsWith(' '))
                newText += ' ';
        }
        // 右边居然有个等号？
        else if (/^=/.test(right)) {
            newText = '=';
        }
        // var =
        else if (/(\b[\w_][\w\d_]*\b|\)|\])$/.test(left)) {
            newText = " = ";
        }
        // var = =    var == =    var !==
        else if (/(\b[\w_][\w\d_]*\b|\)|\])\s+!?=+ $/.test(left)) {
            leftPosition = new vscode.Position(leftPosition.line, leftPosition.character - 1);
            newText = '=';
            if (!right.startsWith(' '))
                newText += ' ';
        }
        // var ==    var ===    var +=    var /=
        else if (/(\b[\w_][\w\d_]*\b|\)|\])\s+[+\-\*\/%=<>]=*$/.test(left)) {
            newText = '=';
            if (!right.startsWith(' '))
                newText += ' ';
            else
                showSuggestions = false;
        }
        // var+=|    ==>    var += |
        else if (/(\b[\w_][\w\d_]*\b|\)|\])[\-\+\*\/%=<>]$/.test(left)) {
            var insertEdit = vscode.TextEdit.insert(new vscode.Position(leftPosition.line, leftPosition.character - 1), ' ');
            textEdits.push(insertEdit);

            // leftPosition = new vscode.Position(leftPosition.line, leftPosition.character); // 不知道为什么不改变位置
            // position = new vscode.Position(position.line, position.character); // 这个也不要改变位置
            newText = "= ";
        }
        // var + =|    ==>    var += |
        else if (/(\b[\w_][\w\d_]*\b|\)|\]) [\-\+\*\/%=<>] $/.test(left)) {
            leftPosition = new vscode.Position(leftPosition.line, leftPosition.character - 1);
            newText = "=";
            if (!right.startsWith(' '))
                newText += ' ';
        }
        // var===
        else if (/(\b[\w_][\w\d_]*\b|\)|\])==$/.test(left)) {
            leftPosition = new vscode.Position(leftPosition.line, leftPosition.character - 2);
            position = new vscode.Position(leftPosition.line, leftPosition.character + 1);
            newText = " ===";
            if (!right.startsWith(' '))
                newText += ' ';
        } else { // 不知道什么情况
            return;
        }

        // 点号的位置替换为指针
        var newEdit = vscode.TextEdit.replace(new vscode.Range(leftPosition, position), newText);

        // 添加本次的修改
        textEdits.push(newEdit);
    }

    let wordspaceEdit = new vscode.WorkspaceEdit();
    wordspaceEdit.set(document.uri, textEdits);
    vscode.workspace.applyEdit(wordspaceEdit);

    // 是否需要提示判断
    if (!showSuggestions)
        return;
    // 延时出现提示（必须延时才会出现）
    if (vscode.workspace.getConfiguration().get('LazyKey.AutoSuggestion')) {
        setTimeout(function () {
            vscode.commands.executeCommand('editor.action.triggerSuggest');
        }, 100);
    }
}

function isInCode(document, position, left, right) {
    // 单行注释 //
    if (/\/\//.test(left))
        return false;

    // 块注释 /* */
    if (left.lastIndexOf("/*") > -1 && left.indexOf("*/", left.lastIndexOf("/*")) == -1)
        return false;

    // 其他例如多行块注释；就不仔细判断了
    if (/^\s*[*#]/.test(left))
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
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ scheme: 'file', languages: ['c', 'cpp', 'php', 'java', 'javascript', 'csharp', 'python', 'jsp'] }, {
        provideCompletionItems,
        resolveCompletionItem
    }, '='));
};