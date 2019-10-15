const vscode = require('vscode');

function activate(context) {
	const conf = vscode.workspace.getConfiguration().get('LazyKey.showTip');
	if (conf)
		vscode.window.showInformationMessage('懒键 已开启，享受酣畅淋漓的码字快感吧！');
	console.log('懒键开启！');

	context.subscriptions.push(vscode.commands.registerCommand('extension.helloWorld', function () {
		vscode.window.showInformationMessage('Hello World!');
	}));
	context.subscriptions.push(vscode.commands.registerCommand('extension.switchLazyKey', function () {
		vscode.window.showInformationMessage('Lazy life starts!');
	}));

	require('./src/keydot.js')(context);
}
exports.activate = activate;

function deactivate() {}

module.exports = {
	activate,
	deactivate
}