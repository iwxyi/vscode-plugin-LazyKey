const vscode = require('vscode');

function processEnter()
{
    // 读取设置是否开启
    if (!vscode.workspace.getConfiguration().get('LazyKey.SkipEnter'))
        return normalEnter();

    const editor = vscode.window.activeTextEditor;
    if (editor.selection.text != undefined) return; // 有选中文本了

    const document = editor.document;
    const selection = editor.selection;
    if (selection.start.line != selection.end.line || selection.start.character != selection.end.character) {
        console.log('有选中');
        return normalEnter();
    }
    var position = selection.active;

    if (analyzeSkip(editor, document, position)) {
        console.log('analyzeSkip', true);
    }
    else {
        console.log('analyzeSkip', false);
        normalEnter();
    }
}

function analyzeSkip(editor, document, position)
{
    const left_parentheses = ['\'', '"', '(', '[', '{', '<'];
    const right_parentheses = ['\'', '"', ')', ']', '}', '>'];

    // 获取全文和当前行内容
    var full = document.getText();
    var word = document.getText(document.getWordRangeAtPosition(position));  // 点号左边的单词
    var line = document.lineAt(position).text;
    var left = line.substring(0, position.character);
    var right = line.substring(position.character);

    // 如果不是在字符串中间，则不进行任何操作
    if (left == "" || right == "")
        return false;
    var leftChar = left.slice(-1);
    var rightChar = right.charAt(0);

    // 首先右边必须是要全部右括号或者分号，允许后面注释
    if (! /^['"\)\]\};\s]*(\/[\/\*].*)?$/.test(right)) {
        return false;
    }
    // 允许空字符串 "|")
    if (leftChar == rightChar && (leftChar == '\'' || leftChar == '"')) {

    }
    // fun{|} 这种连续的情况
    else if (leftChar == "{" && rightChar == "}") {
        largeEnter(editor, document, position);
        return true;
    }
    // 还有 if ( | )
    else if (/^\s*(if|for|while|foreach|switch)\s\(\s$/.test(left) && /^\s\)/.test(right)) {
        largeEnter(editor, document, position);
        return true;
    }

    vscode.commands.executeCommand('editor.action.insertLineAfter');
    return true;
}

function normalEnter()
{
    // vscode.commands.executeCommand('lineBreakInsert'); // 这个是在后面插入一行
    vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': '\n'});
}

function largeEnter(editor, document, position)
{
    vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': '\n\t$0\n' });
}

module.exports = processEnter;