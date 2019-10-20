/**
 * Tab键
 * - (|)    ==>    ()|
 * - ("|")    ==>    ("", |)    "|")、[|])、(|))
 * - ("", |)    ==>    ("")|    同上
 * - 在行尾且下一行是 } ==>    }|
 * - x 缩进（不需要手动调）
 */


const vscode = require('vscode');

function processTab() {
    // 读取设置是否开启
    if (!vscode.workspace.getConfiguration().get('LazyKey.SmarterTab')) {
        normalTab();
        return;
    }

    const editor = vscode.window.activeTextEditor;
    if (editor.selection.text != undefined) return; // 有选中文本了

    const document = editor.document;
    const selection = editor.selection;
    if (selection.start.line != selection.end.line || selection.start.character != selection.end.character) {
        return normalTab();
    }
    var position = selection.active;

    if (!analyzeSkip(editor, document, position))
        normalTab();
}

/**
 * 判断需不需要跳过右边的内容
 */
function analyzeSkip(editor, document, position) {
    const left_parentheses = ['\'', '"', '(', '[', '{', '<'];
    const right_parentheses = ['\'', '"', ')', ']', '}', '>'];

    // 获取全文和当前行内容
    var full = document.getText();
    var word = document.getText(document.getWordRangeAtPosition(position));  // 点号左边的单词
    var line = document.lineAt(position).text;
    var left = line.substring(0, position.character);
    var right = line.substring(position.character);
    // 开头位置，缩进
    if (/^\s*$/.test(left)) {
        vscode.commands.executeCommand('tab');
    }
    // 右边是可以跳过的符号
    else if (/^['"\)\]]/.test(right)) {
        // 判断左边是不是有上一个tab添加的", "
        if (/, $/.test(left)) {
            vscode.commands.executeCommand('deleteLeft');
            vscode.commands.executeCommand('deleteLeft');
        }

        // 光标右移，跳过右1
        vscode.commands.executeCommand('cursorRight');

        // 继续判断是否为参数，添加参数分隔符
        if (right.length >= 2 && right.substring(1, 2) == ")") {
            vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': ', ' });
        }
    }
    // 当前行末尾，调到后面的出口，例如：}|
    else if (/^\s*$/.test(right)) {
        // 最后一行，添加行(感觉不太可能)
        if (position.line >= document.lineCount - 1) {
            vscode.commands.executeCommand('editor.action.insertLineAfter');
            return true;
        }

        // 判断下一行是不是结束
        var nextLine = document.lineAt(new vscode.Position(position.line + 1, 0)).text;
        if (/^\s*\}\s*$/.test(nextLine)) {
            vscode.commands.executeCommand('cursorDown');
            vscode.commands.executeCommand('cursorLineEnd');

            vscode.commands.executeCommand('editor.action.insertLineAfter');
        }
        else {
            return false;
        }
    }
    else {
        return false;
    }

    return true;
}

/**
 * 仅仅添加一行
 */
function normalTab() {
    vscode.commands.executeCommand('tab');
}


module.exports = processTab;