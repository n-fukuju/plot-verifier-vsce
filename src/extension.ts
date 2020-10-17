
import * as vscode from 'vscode';
import { Element, PlotVerifyProvider } from './plotVerifyProvider';

// エントリポイント
export function activate(context: vscode.ExtensionContext) {
	console.log('extension.ts:: activate()');

	// コマンドを登録
	// let disposable = vscode.commands.registerCommand('plot-verifier-vsce.helloWorld', () => {

	// 	// Display a message box to the user
	// 	// vscode.window.showInformationMessage('Hello World from plot-verifier-vsce!');
	// });
	// context.subscriptions.push(disposable);

	// プロバイダ登録
	const provider = new PlotVerifyProvider(context);
	vscode.window.registerTreeDataProvider('plotVerifier', provider);

	// 更新ボタンのコマンドを登録
	vscode.commands.registerCommand('plot-verifier-vsce.refresh', ()=> provider.refresh());
	vscode.commands.registerCommand('plot-verifier-vsce.edit', (element:Element)=> provider.open(element));

}

export function deactivate() {}
