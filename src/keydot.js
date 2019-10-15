const vscode = require('vscode');

function keyDot() {
    // 读取设置是否进行更改
    const conf = vscode.workspace.getConfiguration().get('LazyKey.dotToPoint');
    // vscode.workspace.getConfiguration().update('LazyKey.dotToPoint', '懒键', true);
    if (conf != true) return;

    const editor = vscode.window.activeTextEditor;
    if (editor.selection.text != undefined) return; // 有选中文本了

    const document = editor.document;
    const selection = editor.selection;
    if (selection.start.line != selection.end.line || selection.start.character != selection.end.character) {
        // 插入 .
        console.log('有选中');
        return;
    }
    var position = selection.active;

    // 获取全文和单词
    var full = document.getText();
    var leftPosition = new vscode.Position(position.line, position.character);   // 左边单词右位置
    var word = document.getText(document.getWordRangeAtPosition(leftPosition));  // 点号左边的单词

    // 获取当前行内容
    var line = document.lineAt(position).text;
    var left = line.substring(0, leftPosition.character);
    var right = line.substring(position.character);

    // 两个点号变成指针
    var doublePoint = false;
    if (left.length >= 2 && left.slice(-1) == ".") {
        if (left.slice(-2) == ".." || left.slice(-2) == "\t.") // 三个点或开头两点，不知道什么情况，退出
            return;
        if (left.slice(-2) == " .") // 针对可变参数数组的情况 ...
            return;
        leftPosition = new vscode.Position(leftPosition.line, leftPosition.character - 1);
        word = document.getText(document.getWordRangeAtPosition(leftPosition));
        left = line.substring(0, leftPosition.character - 1);
        doublePoint = true; 0
    }

    // 判断上文是否有声明为 *var 或者 var-> 的字符
    var re1 = new RegExp("\\*\\s*" + word + "\\b");
    var re2 = new RegExp("\\b" + word + "\\s*->");
    if (!doublePoint && !re1.test(full) && !re2.test(full))
        return;

    // 点号的位置替换为指针
    var newEdit = vscode.TextEdit.replace(new vscode.Range(leftPosition, position), "->");

    // 应该本次的修改
    let textEdits = [];
    textEdits.push(newEdit);
    let wordspaceEdit = new vscode.WorkspaceEdit();
    wordspaceEdit.set(document.uri, textEdits);
    vscode.workspace.applyEdit(wordspaceEdit);
}