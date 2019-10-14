const vscode = require('vscode');

function activate(context) {
	console.log('Congratulations, your extension "lazykey" is now active!');
	context.subscriptions.push(vscode.commands.registerCommand('extension.helloWorld', function () {
		vscode.window.showInformationMessage('Hello World!');
	}));
	context.subscriptions.push(vscode.commands.registerCommand('extension.switchLazyKey', function () {
		vscode.window.showInformationMessage('Lazy life starts!');
	}));
}
exports.activate = activate;

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
