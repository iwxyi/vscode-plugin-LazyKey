/**
 * Enter键
 * - "|"    '|'    无视空文本换行
 * - |)}    无视右括号换行
 * - if(|)    {|}    展开括号
 * - if、无分号行    单行缩进
 * - if    下下行取消缩进
 */

const vscode = require('vscode');

function processEnter() {
    // 读取设置是否开启
    if (!vscode.workspace.getConfiguration().get('LazyKey.SmarterEnter')) {
        normalEnter();
        toIndent2();
        return;
    }

    const editor = vscode.window.activeTextEditor;
    if (editor.selection.text != undefined) return; // 有选中文本了

    const document = editor.document;
    const selection = editor.selection;
    if (selection.start.line != selection.end.line || selection.start.character != selection.end.character) {
        return normalEnter();
    }
    var position = selection.active;

    if (!analyzeSkip(editor, document, position)) {
        normalEnter();
        toIndent(editor, document, position);
    }
}

/**
 * 判断需不需要跳过右边的内容
 */
function analyzeSkip(editor, document, position) {
    const left_parentheses = ['\'', '"', '(', '[', '{', '<'];
    const right_parentheses = ['\'', '"', ')', ']', '}', '>'];

    // 获取全文和当前行内容
    var full = document.getText();
    var word = document.getText(document.getWordRangeAtPosition(position)); // 点号左边的单词
    var line = document.lineAt(position).text;
    var left = line.substring(0, position.character);
    var right = line.substring(position.character);

    // 预先判断（因为一些特殊原因）
    // 有块注释（屏蔽下面的块注释结束）
    if (/\/\*/.test(line)) {;
    }
    // 块注释结束
    else if ((/^\s*\*+\/$/.test(left) && right == '') || (/^\s*\*+$/.test(left) && /^\*+\/$/.test(right))) {
        vscode.commands.executeCommand('editor.action.insertLineAfter'); // 这样换行可以避免块注释中间带起的缩进
        return true;
    }

    // 如果不是在字符串中间，则不进行任何操作
    if (left == "" || right == "")
        return false;
    var leftChar = left.slice(-1);
    var rightChar = right.charAt(0);

    // 左边不能是空的，而且右边必须是要全部右括号或者分号，允许后面注释
    if (/^\s*$/.test(left) || !/^['"\)\]\};\s]*(\/[\/\*].*)?$/.test(right)) {
        return false;
    }
    // 允许空字符串 "|")
    if (leftChar == rightChar && (leftChar == '\'' || leftChar == '"')) {

    }
    // fun{|} 这种连续的情况
    else if ((leftChar == "{" && rightChar == "}") || (leftChar == "[" && rightChar == "]")) {
        largeEnter();
        return true;
    }
    // 还有 if ( | )
    else if (/^\s*(if|for|while|foreach|switch)\s*\(\s*$/.test(left) && /^\s*\)/.test(right)) {
        largeEnter();
        return true;
    }

    // 添加下一行，理论上缩进和当前行是一样的
    vscode.commands.executeCommand('editor.action.insertLineAfter');
    toIndent(editor, document, position);

    return true;
}

/**
 * 仅仅添加一行
 */
function normalEnter() {
    // vscode.commands.executeCommand('lineBreakInsert'); // 这个是在后面插入一行
    vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': '\n' });
}

/**
 * 添加两行，扩展括号
 */
function largeEnter() {
    vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': '\n\t$0\n' });
}

function toIndent(editor, document, position) {
    var line = document.lineAt(position).text;
    var left = line.substring(0, position.character);
    var right = line.substring(position.character);
    var prevLine = position.line <= 0 ? ';' : document.lineAt(new vscode.Position(position.line - 1, 0)).text;

    // 计算缩进量
    var indent = false;
    var addin = '';
    if (/^\s*(\}\s*)?(if|else|else\s*if|for|do|while|foreach|switch)\s*\(.*\)[^;]*$/.test(line))
        indent = true;
    // 左括号结尾
    else if (/\{\s*$/.test(line))
        indent = true;
    // 空白行（可能包含注释），不管
    else if (/^\s+(\/\/.*)?$/.test(line))
        return true;
    // 多行注释开始（多行注释结束在上面）
    else if (/^\s*\/\*.*/.test(left) && !/\*\//.test(left)) {
        indent = false;
        // 判断星号数量
        var star = /^\s*\/(\**)/.exec(left)[1];
        addin = ' * $0\n';
        if (star.length > 2 && /^\s*\*\//.test(right)) { // 右边有注释结束
            star = star.substr(2);
            addin += ' ' + star;
            if (right.startsWith(' */'))
                vscode.commands.executeCommand('deleteRight');
        } else if (right.indexOf('*/') == -1) { // 可能没有自动补全的 */
            // 判断后面有没有结束标志
            // 就是简单判断下一行是不是 * 开头吧
            var nextLine = position.line < document.lineCount - 1 ?
                document.lineAt(new vscode.Position(position.line + 1, 0)).text :
                "";
            var hasRight = false;
            if (/^\s*\*/.test(nextLine)) // 下一行是*开头。后面很可能有注释（没有深入判断）
            {
                hasRight = true;
                addin = ' * $0';
            }

            // 自动插入注释结束标志
            if (!hasRight)
                addin += ' */';
        } else if (!right.startsWith(' ')) { // 后面没有空白的
            addin += ' ';
        }
    }
    // 多行注释星号
    else if (/^\s*\*\s?/.test(line) && /\/?\*/.test(prevLine) && !/\*\//.test(left)) {
        indent = false;
        addin = '* ';
    }
    // 这一行没有分号结尾？
    else if (/^[^;]+$/.test(line)) {
        // 上一行是分支，必须缩进
        if (/^\s*(\}\s*)?(if|for|else|else\s*if|do|while|foreach|switch)\s*\(.*\)[^;]*$/.test(prevLine)) {

        }
        // 左括号，也需要缩进
        else if (/^\s*{\s*$/.test(left)) {

        }
        // private:    goto:    应当缩进
        else if (/^\s*(\b\w+\b\s*):$/.test(line)) {

        }
        // 如果是右花括号，不缩进
        else if (line.indexOf('}') > -1 && (line.indexOf('{') == -1 || line.lastIndexOf('}') > line.lastIndexOf('{'))) {
            return true;
        }
        // 可能是类似 #include <>
        else if (line.startsWith('#')) {
            return true;
        }
        // @override 不缩进
        else if (/^\s*@/.test(line)) {
            return true;
        }
        // 判断上一行是不是同样没有分号
        else if (!/^\s*$/.test(prevLine) && /^[^;]+$/.test(prevLine)) {
            // 如果这一行已经缩进了
            if (/^(\s*)/.exec(line)[1].length > /^(\s*)/.exec(prevLine)[1].length)
                return true;
            // 再继续判断上上行
            var prevPrevLine = position.line <= 1 ? ';' : document.lineAt(new vscode.Position(position.line - 2, 0)).text;
            if (!/^\s*(if|for|while|foreach|switch)\s*\(.*\)[^;]*$/.test(prevPrevLine) &&
                /^[^;]+$/.test(prevPrevLine) &&
                /^(\s*)/.exec(prevLine)[1].length >= /^(\s*)/.exec(prevPrevLine)[1].length)
                return true;

        }
        indent = true;
    }

    if (indent) {
        var insert = "";
        var indentPrevLine = /^(\s*)/.exec(line)[1];
        if (/^ +$/.test(indentPrevLine)) { // 空格的情况
            insert = "    ";
        } else if (/^\t*$/.test(indentPrevLine)) { // tab的情况
            insert = "\t";
        }
        if (insert != "") {
            vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': insert });
        }
        return true;
    }

    if (addin != '') {
        vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': addin });
    }

    // 单个 if 后面的句子，是否需要 outindent
    var outdent = false;
    if (prevLine.indexOf('{') > -1 || /[^:]:\s*(\/[\/\*].*)?$/.test(prevLine)) {
        outdent = false;
    } else if (line.indexOf(';') > -1 &&
        ((/^[^;]+$/.test(prevLine) || /^[^;]+(\(.+\))?[^;]*$/.test(prevLine)) &&
            /^(\s*)/.exec(line)[1].length > /^(\s*)/.exec(prevLine)[1].length)
    ) {
        outdent = true;
    }
    // break; 反向缩进
    else if (/^\s*break;\s*$/.test(line)) {
        // 判断有没有 case x：
        var indentLine = /^(\s*)/.exec(line)[1].length; // 当前行缩进
        var line = position.line;
        var isCase = false;
        while (--line >= 0) {
            var pos = new vscode.Position(line, 0);
            var prevLine = document.lineAt(pos).text;
            var indentPrevLine = /^(\s*)/.exec(prevLine)[1].length
            if (indentPrevLine < indentLine) {
                isCase = /^(\s*)case.+:[^\{]*$/.test(prevLine);
                break;
            }
        }
        if (isCase) {
            outdent = true;
        }
    } else {
        outdent = false;
    }

    if (outdent) {
        setTimeout(function() {
            vscode.commands.executeCommand('outdent');
        }, 50);
    }
}

function toIndent2() {
    const editor = vscode.window.activeTextEditor;
    var document = editor.document;
    var position = editor.selection.active;
    if (position.line == 0) return true;
    var line = document.lineAt(position).text;

    // 计算缩进量
    var indent = false;
    if (/^\s*(if|for|while|foreach|switch)\s\(\s$/.test(line))
        indent = true;
    else if (/^[^;]+$/.test(line))
        indent = true;

    if (indent) {
        var insert = "";
        var indentPrevLine = /^(\s*)/.exec(line)[1];
        if (/^ +$/.test(indentPrevLine)) { // 空格的情况
            insert = "    ";
        } else if (/^\t*$/.test(indentPrevLine)) { // tab的情况
            insert = "\t";
        }
        if (insert != "") {
            vscode.commands.executeCommand('editor.action.insertSnippet', { 'snippet': insert });
        }
        return true;
    }
}

module.exports = processEnter;