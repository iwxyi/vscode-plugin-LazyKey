/**
 * 函数括号补全
 * fun()
 */

const vscode = require('vscode');

function completeAndInsert() {
    // 读取设置是否开启
    if (!vscode.workspace.getConfiguration().get('LazyKey.CompleteFunctionParentheses')) {
        vscode.commands.executeCommand('acceptSelectedSuggestion');
        return;
    }

    const editor = vscode.window.activeTextEditor;
    if (editor.selection.text != undefined) {
        vscode.commands.executeCommand('acceptSelectedSuggestion');
        return; // 有选中文本了（一般不太可能）
    }
    const document = editor.document;
    const selection = editor.selection;
    if (selection.start.line != selection.end.line || selection.start.character != selection.end.character) {
        // 也是有选中文本的判断？
        vscode.commands.executeCommand('acceptSelectedSuggestion');
        return;
    }
    var position = selection.active;

    acceptSuggestion(editor, document, position);
}

function acceptSuggestion(old_editor, old_document, old_position) {
    // 保存插入前的左边和右边
    var old_line = old_document.lineAt(old_position).text;
    var old_left = old_line.substring(0, old_position.character);
    var old_right = old_line.substring(old_position.character);

    // 插入操作
    vscode.commands.executeCommand('acceptSelectedSuggestion');

    // 判断插入后的内容（延迟）
    setTimeout(function () {
        analyzeContext(old_line, old_left, old_right);
    }, 50);
}

function analyzeContext(old_line, old_left, old_right) {
    // ==== 获取新的上下文 ====
    const editor = vscode.window.activeTextEditor;
    if (editor.selection.text != undefined) return; // 有选中文本了
    const document = editor.document;
    const selection = editor.selection;
    if (selection.start.line != selection.end.line || selection.start.character != selection.end.character) {
        return;
    }
    var position = selection.active;

    // ==== 获取新的内容 ====
    var full = document.getText();
    var word = document.getText(document.getWordRangeAtPosition(position));  // 点号左边的单词
    var line = document.lineAt(position).text;
    var left = line.substring(0, position.character);
    var right = line.substring(position.character);

    // ==== 新旧比较 ====
    if (right != old_right) // 如果右边不同的话，直接取消
        return;
    else if (left == old_left) // 一模一样，相当于为了加括号
        ;
    else if (!/[\w][\w\d_]+$/.test(word)) // 如果不是单词（且至少两个字母），也取消（不敢贸然添加括号）
        return;
    else if (left.length <= old_left.length || line.length <= old_line.length) // 如果补全后没有变长，只是修改了文字
        return;

    // 判断输入的内容：左起相同的长度
    var count = 0;
    while (count < left.length && count < old_left.length) {
        if (left.charAt(count) === old_left.charAt(count))
            count++;
        else
            break;
    }
    var insertWord = left.substring(count, left.length); // 插入的单词右半部分（非完整）
    if (!word.endsWith(insertWord)) // 插入的不只是这个单词？
        return;
    if (right.startsWith('(')) // 右边已经有括号了，即使是函数也不需要自动补全
        return;

    // ==== 判断需不需要括号 ====
    // var offset = document.offsetAt(new vscode.Position(position.line, 0)); // 光标位置
    // var full_left = full.substring(0, offset); // 全文左边
    // 由于不知道正则怎么倒序查找，还是从下往上一行一行找过去吧
    var pline = position.line;
    var re0 = new RegExp("\\b" + word + "\\s*[^\\(]");      // 无括号
    var re1 = new RegExp("\\b" + word + "\\s*\\([^\\)]");   // 有括号且有参数
    var re2 = new RegExp("\\b" + word + "\\s*\\(\\)");      // 右括号且无参数
    var type = 0;
    while (--pline >= 0) {
        var line = document.lineAt(new vscode.Position(pline, 0)).text;
        if (re0.test(line)) // 没有括号
        {
            type = 0;
            return;
        }
        else if (re1.test(line)) // 有括号且有参数
        {
            type = 1;
            break;
        }
        else if (re2.test(line)) // 右括号且无参数
        {
            type = 2;
            break;
        }
    }
    if (pline < 0) // 没有找到，向下找
    {
        pline = position.line;
        while (++pline < document.lineCount) {
            var line = document.lineAt(new vscode.Position(pline, 0)).text;
            if (re0.test(line)) // 没有括号
            {
                type = 0;
                return;
            }
            else if (re1.test(line)) // 有括号且有参数
            {
                type = 1;
                break;
            }
            else if (re2.test(line)) // 右括号且无参数
            {
                type = 2;
                break;
            }
        }
    }

    if (pline >= document.lineCount) // 还是没有找到，猜测内容……
    {
        if (/^(set|get|load|is)[_A-Z]/i.test(word) // 开头单词
            || /(at|with|of)$/i.test(word)) // 结尾单词
            type = 1; // 当做有参数的
        else
            return;
    }

    // ==== 判断是不是无参数函数 ====
    // 之前为了保证交互统一，不将无参函数的括号放在右边了
    var ins;
    if (type == 0)
        return;
    else if (type == 1)
        if (/^[\w]_/.test(right)) // 右边已经有内容了，最多只插入左括号（不过这种情况不会触发自动补全吧？）
            ins = '(';
        else
            ins = '($0)';
    else
        ins = '()$0';

    // ==== 插入操作 ====
    vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': ins });
}

module.exports = completeAndInsert;