/**
 * 减号
 * - \\w+ var_  变量声明允许下划线
 * - var_       已存在变量，下划线
 * - _var       存在下划线开头的变量
 * - a--        变量自减
 * - a -       减法运算
 */
const vscode = require('vscode');

function provideCompletionItems(document, position, token, context) {
    // 读取设置是否进行开启
    if (!(vscode.workspace.getConfiguration().get('LazyKey.AllEnabled')) ||
        !(vscode.workspace.getConfiguration().get('LazyKey.AutoOperators')))
        return;
    if (['c', 'cpp', 'java', 'javascript', 'jsp', 'php', 'csharp', 'verilog', 'systemverilog'].indexOf(document.languageId) == -1)
        return;

    // 获取编辑器，判断选中文本
    const editor = vscode.window.activeTextEditor;
    if (editor.selection.text != undefined) return;

    // 倒序遍历每一个光标
    // 多个，有一个需要添加则进行添加
    var selections = editor.selections;
    let textEdits = [];
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
        if (inpt != "-")
            return;
        // 必须要右边全部空的
        if (right != "" && !/^[_\)\]\}\s]/.test(right))
            return;
        // 注释、字符串、正则
        if (!isInCode(document, position, left, right))
            continue;

        var newText = "";
        // 变量表示：(\b[\w_][\w\d_]*\b|\)|\])
        // const static int var_
        // private static String str_
        // std::string s_
        if (/^\s*((const|static|public|private|protected|final|mutable|package|:)\s*)*([\w_\d:]+)\s*(<.+?>|&|\*|\s)*(\b[\w_][\w\d_]*)$/.test(left)) {
            newText = "_";
        }
        // 单词_xxx 这样的变量上下文存在 var_
        else if (/\b[\w_][\w\d_]*$/.test(left) && (new RegExp("\\b" + word + "_")).test(full)) {
            newText = "_";
        }
        // (| 这样的情况，没有 - 的场景，只能是 _
        else if (/[\(\[\{]\s*$/.test(left)) {
            newText = "_";
        }
        // this->_var
        else if (/\->\s*$/.test(left)) {
            newText = "_";
        }
        // 排除情况：) |
        else if (/\)\s+$/.test(left)) {
            return;
        }
        // 排除情况：)|
        else if (/\)$/.test(left)) {
            newText = " - ";
        }
        // _ 或 _var 或 _a_b_0_1 这样的变量存在
        else if (/(^|\s+)_[\w\d_]*\b$/.test(full)) {
            newText = "_";
        }
        // 开头 var_    这种情况应该不会是减号吧
        else if (/^\s*[\w_][\w\d_]*$/.test(left) && !left.endsWith('_')) {
            newText = "_";
        }
        // 自减
        else if (/(\b[\w_][\w\d_]*|\)|\])-$/.test(left)) {
            return;
        }
        // 前一个误判情况 准备自减的 var- 被当作了下划线 var_
        else if (/(\b[\w_][\w\d_]*|\)|\])_$/.test(left)) {
            leftPosition = new vscode.Position(leftPosition.line, leftPosition.character - 1);
            newText = "--";
        }
        // 前一个误判情况，准备自减的 var- 被当做减法 var -
        else if (/(\b[\w_][\w\d_]*|\)|\]) - $/.test(left)) {
            leftPosition = new vscode.Position(leftPosition.line, leftPosition.character - 3);
            newText = "--";
        }
        // 变量减法(不支持下划线结尾的变量)
        else if (/(\b[\w_]([\w\d_]*[\w\d])?|\)|\])$/.test(left)) {
            newText = " - ";
        } else { // 不知道怎么处理
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
    if (newText.indexOf('--') > -1)
        return;
    // 延时出现提示（必须延时才会出现）
    if (vscode.workspace.getConfiguration().get('LazyKey.AutoSuggestion')) {
        var full = document.getText();
        var position = document.position();
        var line = document.lineAt(position).text;
        var inpt = line.substring(position.character - 1, position.character);
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
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ scheme: 'file', languages: ['c', 'cpp', 'php', 'java', 'javascript', 'csharp', 'python', 'jsp', 'verilog', 'systemverilog'] }, {
        provideCompletionItems,
        resolveCompletionItem
    }, '-'));
};