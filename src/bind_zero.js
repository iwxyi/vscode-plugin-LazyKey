/**
 * 0 转 )
 */


const vscode = require('vscode');

function processZero() {
    // 读取设置是否开启
    if (!vscode.workspace.getConfiguration().get('LazyKey.NumberToParentheses')) {
        normalZero();
        return;
    }

    const editor = vscode.window.activeTextEditor;
    if (editor.selection.text != undefined) return; // 有选中文本了

    const document = editor.document;
    const selection = editor.selection;
    if (selection.start.line != selection.end.line || selection.start.character != selection.end.character) {
        return normalZero();
    }
    var position = selection.active;

    if (!analyzeZero(editor, document, position))
        normalZero();
}

/**
 * 判断需不需要跳过右边的内容
 */
function analyzeZero(editor, document, position) {
    // 获取全文和当前行内容
    var full = document.getText();
    var word = document.getText(document.getWordRangeAtPosition(position)); // 点号左边的单词
    var line = document.lineAt(position).text;
    var left = line.substring(0, position.character);
    var right = line.substring(position.character);


    // 注释、字符串、正则
    if (!isInCode(document, position, left, right))
        return false;

    // 倒序遍历每一个光标
    // 多个，有一个需要添加则进行添加
    var selections = editor.selections;
    let textEdits = [];
    var isAllSkip = true; // 是否全部跳过。有一个需要添加的则进行添加
    var canSkipIfAllSkip = true;
    for (var i = selections.length - 1; i >= 0; --i) {
        // 获取全文和当前行内容
        position = selections[i].end;
        var full = document.getText();
        var word = document.getText(document.getWordRangeAtPosition(position)); // 左边的单词
        var line = document.lineAt(position).text;
        var left = line.substring(0, position.character);
        var right = line.substring(position.character);

        // 不处理连续数字或者小数点
        if (/\D$/.test(left) && right.startsWith(')')) // 排除单纯一个0并右括号结束，例如：at(0|)、at(a, 0|)
            ;
        else if (/\d+\.?$/.test(left) || /^\d+/.test(right))
            return false;

        // 判断是插入 0 还是插入 )
        // 左边是自增/自减，很可能是右括号
        if (/(\+\+|\-\-)$/.test(left))
            ;
        // 左边是空白或者运算符，很可能是 0
        else if (/[ =\+\-*\/%\.<>]$/.test(left))
            return false;
        // 一些函数后面必定有参数的，也是 0
        else if (/(at|insert|of|remove|add|set|if|while|when|until)\w*\s*\($/.test(left) && right.startsWith(')'))
            return false;
        // 判断 单词0 是否存在
        else if (/[\w_]+$/.test(left) && full.match(new RegExp("\\b" + word + "0", 'g')) != null)
            return false;

        // 光标左右的左右括号的数量
        var ll = 0,
            lr = 0,
            rl = 0,
            rr = 0;
        for (let c of left) {
            if (c == '(')
                ll++;
            else if (c == ')')
                lr++;
        }
        for (let c of right) {
            if (c == '(')
                rl++;
            else if (c == ')')
                rr++;
        }
        // 如果左右括号已经匹配了，则跳过本次
        var isSkip = (ll + rl <= lr + rr);

        // 如果是函数，则判断是否需要带参数
        var isNoParaFunc = right.startsWith(")");
        // func(|0)
        if (/[\w]+\($/.test(left) && right.startsWith(')')) {
            var wordPos = new vscode.Position(position.line, position.character - 2);
            var word = document.getText(document.getWordRangeAtPosition(wordPos)); // 左边的单词
            var match1 = full.match(new RegExp("\\b" + word + "\\(\\)", 'g')); // 无参数
            var match2 = full.match(new RegExp("\\b" + word + "\\([^\\)]", 'g')); // 有参数
            if (match1 != null && match1.length <= 1 /*本身就有一个*/ &&
                match2 != null && match2.length > 0) {
                isNoParaFunc = false;
            }
        }

        if (!isSkip) { // 有添加的部分，则执行添加
            isAllSkip = false;
        } else if (right.length == 0 || !isNoParaFunc) {
            canSkipIfAllSkip = false;
        }

        var newText = isSkip ? (isNoParaFunc ? "" : "0") : ")";

        // 点号的位置替换为指针
        var newEdit = vscode.TextEdit.insert(position, newText);
        if ((isAllSkip == true && newText != ''))
            isAllSkip = false;

        // 添加本次的修改
        textEdits.push(newEdit);
    }

    // 应用到编辑器
    if (!isAllSkip) { // 只要有需要添加的，就进行添加
        let wordspaceEdit = new vscode.WorkspaceEdit();
        wordspaceEdit.set(document.uri, textEdits);
        vscode.workspace.applyEdit(wordspaceEdit);
    } else if (canSkipIfAllSkip) { // 全部跳过，并且是全能跳过的，光标右移1
        // 光标右移 1
        vscode.commands.executeCommand('cursorRight');
    }

    return true;
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

    if (isInQuote(left))
        return false;

    // 正则 /reg|asd/    斜杠个数是偶数个
    var res = left.match(new RegExp(/(?<!\\)\//g));
    if (document.languageId == 'javascript' && res != null && res.length % 2)
        return false;

    return true;
}

/**
 * 仅仅添加一行
 */
function normalZero() {
    vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': '0' });
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

module.exports = processZero;