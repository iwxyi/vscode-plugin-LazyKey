/**
 * 小于号
 * - vector<    template<
 * - cout/dbg() <<
 * - if/= var <
 * - map<string, vector<int> >
 */
const vscode = require('vscode');

function provideCompletionItems(document, position, token, context) {
    // 读取设置是否进行开启
    if (!(vscode.workspace.getConfiguration().get('LazyKey.AllEnabled')) ||
        !(vscode.workspace.getConfiguration().get('LazyKey.AutoOperators')))
        return;
    if (['c', 'cpp', 'java', 'js', 'javascript', 'jsp', 'php', 'csharp'].indexOf(document.languageId) == -1)
        return;

    // 获取编辑器，判断选中文本
    const editor = vscode.window.activeTextEditor;
    if (editor.selection.text != undefined) return;

    var full = document.getText();
    // 左边已经有这个的格式了，就不进行操作了
    {
        var prevLine = position.line <= 0 ? ';' : document.lineAt(new vscode.Position(position.line - 1, 0)).text;
        var line = document.lineAt(position).text;
        var left = line.substring(0, position.character);
        if (/(\S<|<\S)./.test(left) || /(\S<|<\S)/.test(prevLine))
            return;
    }


    // 倒序遍历每一个光标
    // 多个，有一个需要添加则进行添加
    var selections = editor.selections;
    let textEdits = [];
    for (var i = selections.length - 1; i >= 0; --i) {
        // 获取全文和当前行内容
        position = selections[i].end;
        var leftPosition = new vscode.Position(position.line, position.character - 1); // 左边单词右位置
        var word = document.getText(document.getWordRangeAtPosition(leftPosition)); // 点号左边的单词
        var line = document.lineAt(position).text;
        var inpt = line.substring(position.character - 1, position.character);
        var left = line.substring(0, leftPosition.character);
        var right = line.substring(position.character);

        // 判断左1是不是输入的符号
        if (inpt != "<")
            return;
        // 必须要右边全部空的
        if (right != "" && !right.startsWith(")"))
            return;
        // 注释、字符串、正则
        if (!isInCode(document, position, left, right))
            continue;

        var newText = "";
        // cout <    qDebug() <
        if (/\w*(out|debug|stream)\w*(\(\))?$/i.test(left)) {
            newText = " < ";
        }
        // vector<    template<
        else if (/^\s*(\w+\s+)*[\w:_]+\s*$/.test(left)) {
            return;
        }
        // fun(QList<int> li)
        else if (/^\b[A-Z]/.test(word)) {
            return;
        }
        // Vector
        else if (/[A_Z][\w\d_]*$/.test(left)) {
            return;
        }
        // cout <<
        else if (/ <$/.test(left)) {
            newText = "<"; // 就不擅自添加空格了
        }
        // a < b
        else if (/\S$/.test(left)) {
            newText = " < ";
        }
        // cout < <
        else if (/ < $/.test(left)) {
            leftPosition = new vscode.Position(leftPosition.line, leftPosition.character - 1);
            newText = "< ";
        } else {
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

    // 延时出现提示（必须延时才会出现）
    if (vscode.workspace.getConfiguration().get('LazyKey.AutoSuggestion') && !newText.endsWith("<")) {
        setTimeout(function() {
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

module.exports = function(context) {
    // 注册代码建议提示，只有当按下“.”时才触发
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ scheme: 'file', languages: ['c', 'cpp', 'php', 'java', 'js', 'csharp', 'python', 'jsp'] }, {
        provideCompletionItems,
        resolveCompletionItem
    }, '<'));
};