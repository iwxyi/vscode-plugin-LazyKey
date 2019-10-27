/**
 * 智能空格
 * 填充右边的 (|)
 */
const vscode = require('vscode');

function provideCompletionItems(document, position, token, context) {
    // 读取设置是否进行开启
    if (!(vscode.workspace.getConfiguration().get('LazyKey.AllEnabled'))
        || !(vscode.workspace.getConfiguration().get('LazyKey.SpaceFill')))
        return;
    if (['c', 'cpp', 'java', 'js', 'javascript', 'jsp', 'php', 'cs'].indexOf(document.languageId) == -1)
        return;

    // 获取编辑器，判断选中文本
    const editor = vscode.window.activeTextEditor;
    if (editor.selection.text != undefined) return;

    // 多光标，为保证稳定性不支持
    var selections = editor.selections;
    if (selections.length > 1) return ;

    // 获取全文和当前行内容
    var full = document.getText();
    var leftPosition = new vscode.Position(position.line, position.character - 1);   // 左边单词右位置
    var word = document.getText(document.getWordRangeAtPosition(leftPosition));  // 点号左边的单词
    var line = document.lineAt(position).text;
    var inpt = line.substring(position.character - 1, position.character);
    var left = line.substring(0, leftPosition.character);
    var right = line.substring(position.character);

    // 判断左1是不是输入的符号
    if (inpt != " ")
        return;

    // 右边不是空的，那么这个空格就可能是为了分隔
    if (right!="")
        return ;

    var newText = "";

    // if    else if    for    while   switch    ==>    if (|)
    if (/^\s*(if|else\s+if|for|while|switch)\s*$/.test(left))
        newText = "($0)";
    else if (/^\s*else$/.test(left))        // else   ==>    else if (|)
        newText = "if ($0)";
    else if (/^#include\s*$/.test(left)) {   // #include    ==>    #include <|>
        // 判断上一个是 < > 还是 " "
        var useQuote = false;
        var lineIndex = position.line;
        while (--lineIndex >= 0) {
            var prevLine = document.lineAt(new vscode.Position(lineIndex, 0)).text;
            if (/#include\s*<\S+>/.test(prevLine)) {
                useQuote = false;
                break;
            } else if (/#include\s*\"\S+\"/.test(prevLine)) {
                useQuote = true;
                break;
            }
        }
        if (!useQuote)
            newText = "<$0>";
        else
            newText = "\"$0\"";
    }
    // 提供变量名预测 private String s
    else if (vscode.workspace.getConfiguration().get('LazyKey.GenerateVariableName')
        && (document.languageId == 'cpp' || document.languageId == 'java' || document.languageId == 'c')
        && /^\s*([a-z]+\s+)*[A-Z][\w]+$/.test(left) && right == '') {
        var completionItems = [];
        var names = getNamesFromVariableType(word);
        for (var name of names) {
            if (name == '') continue;
            var completionItem = new vscode.CompletionItem(name);
            completionItem.kind = vscode.CompletionItemKind.Snippet;
            completionItem.detail = 'LazyKey: auto generate variable name';
            completionItem.filterText = name;
            // completionItem.insertText = new vscode.SnippetString('aaaabbbccc');
            completionItems.push(completionItem);
        }

        return completionItems;
    }
    else                                    // 什么都不需要做
        return ;

    // 包括成对括号的，需要撤销两次
    vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': newText });

    // 延时出现提示（必须延时才会出现）
    if (vscode.workspace.getConfiguration().get('LazyKey.AutoSuggestion')) {
        setTimeout(function () {
            vscode.commands.executeCommand('editor.action.triggerSuggest');
        }, 100);
    }
}

/**
 * 根据变量类型自动生成变量名
 * 备注：suggest排序按名字的，没法排顺序……
 */
function getNamesFromVariableType(type)
{
    if (type == '' || type == 'var' || type == 'let')
        return '';

    // String: string, s
    if (/^[A-Z][a-z]*$/.test(type))
        return [type.toLowerCase(), type.substring(0, 1).toLowerCase()];
    // QString: string, qString, s
    else if (/^[A-Z][A-Z][a-z]*$/.test(type)) {
        return [
            /^[A-Z]([A-Z][a-z]*)$/.exec(type)[1].toLowerCase(), // string
            type.substring(0, 1).toLowerCase()+/^[A-Z]([A-Z][a-z]*)$/.exec(type)[1], // qString
            type.substring(1, 2).toLowerCase() // s
        ];
    }
    // MyStringVari: myStringVari, vari
    else if (/^[A-Z][a-z]\w*$/.test(type)) {
        return [
            type.substring(0, 1).toLowerCase() + /^[A-Z](\w*)$/.exec(type)[1], // myStringVari
            /([A-Z][a-z]*)$/.exec(type)[1].toLowerCase() // vari
        ];
    }
    // CMyString: myString, cMyString, string
    else if (/^[A-Z][A-Z]\w*$/.test(type)) {
        console.log(/^[A-Z][A-Z](\w*)$/.exec(type)[1]);

        return [
            type.substring(1, 2).toLowerCase() + /^[A-Z][A-Z](\w*)$/.exec(type)[1], // myStringVari
            type.substring(0, 1).toLowerCase() + /^[A-Z](\w*)$/.exec(type)[1], // cMyStringVari
            /([A-Z][a-z]*)$/.exec(type)[1].toLowerCase() // vari
        ];
    }

    return '';
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
        }, ' '));
};