const vscode = require('vscode');

function activate(context) {
    if (vscode.workspace.getConfiguration().get('LazyKey.ShowTipOnStart'))
        // vscode.window.showInformationMessage('懒键 已开启，享受酣畅淋漓的码字快感吧！');
        vscode.window.showInformationMessage('LazyKey opened, please enjoy!');
    console.log('懒键开启！');

    context.subscriptions.push(vscode.commands.registerCommand('extension.switchLazyKey', function () {
        if (vscode.workspace.getConfiguration().get('LazyKey.AllEnabled')) { // 关闭
            vscode.workspace.getConfiguration().update('LazyKey.AllEnabled', false, true);
        } else { // 开启
            vscode.window.showInformationMessage('Lazy life starts!');
            vscode.workspace.getConfiguration().update('LazyKey.AllEnabled', true, true);
        }
    }));

    // ProvideCompletion
    require('./src/key_dot.js')(context);
    require('./src/key_space.js')(context);
    require('./src/key_minus.js')(context);
    require('./src/key_equal.js')(context);
    require('./src/key_plus.js')(context);
    require('./src/key_semi.js')(context);
    require('./src/key_less.js')(context);
    require('./src/key_comma.js')(context);
    require('./src/key_obrkt.js')(context);
    require('./src/key_cbrkt.js')(context);
    require('./src/key_quote.js')(context);
    require('./src/cn_to_en.js')(context);

    // KeyBindings
    context.subscriptions.push(vscode.commands.registerCommand('extension.keybindings_enter', require('./src/bind_enter.js')));
    context.subscriptions.push(vscode.commands.registerCommand('extension.keybindings_tab', require('./src/bind_tab.js')));
    context.subscriptions.push(vscode.commands.registerCommand('extension.keybindings_nine', require('./src/bind_nine.js')));
    context.subscriptions.push(vscode.commands.registerCommand('extension.keybindings_zero', require('./src/bind_zero.js')));
    context.subscriptions.push(vscode.commands.registerCommand('extension.keybindings_complete_function', require('./src/bind_complete_function.js')));

    var activeEditor;
    let textLast;
    // 编辑器改变（可能会瞬间触发两次）
    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            activeEditor = editor;
        }
    }, null, context.subscriptions);

    // 内容改变（根据插件的不同，保存时可能会触发多次）
    // 多个光标会触发多次！
    vscode.workspace.onDidChangeTextDocument(event => {
        var editor = activeEditor;
        if (editor == undefined)
            editor = vscode.window.activeTextEditor;
        var selections = editor.selections;
        if (selections.length > 1) // 多个光标的情况，不进行判断
            return ;
        var ac = editor.selection.active; // 改变前的位置，索引从0开始
        console.log('position', ac.line, ac.character);
        if (editor && event.document === editor.document) {
            
        }
    }, null, context.subscriptions);
}
exports.activate = activate;

function deactivate() { }

module.exports = {
    activate,
    deactivate
}