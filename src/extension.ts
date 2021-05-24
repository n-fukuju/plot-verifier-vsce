
import * as vscode from 'vscode';
import * as path from 'path';
import { PlotVerifyProvider } from './plotVerifyProvider';
import { Element } from './modules/element';

// エントリポイント
export function activate(context: vscode.ExtensionContext) {
	// console.log('extension.ts:: activate()');

	// コマンドを登録
	// let disposable = vscode.commands.registerCommand('plot-verifier-vsce.helloWorld', () => {

	// 	// Display a message box to the user
	// 	// vscode.window.showInformationMessage('Hello World from plot-verifier-vsce!');
	// });
	// context.subscriptions.push(disposable);

	// プロバイダ登録
	const provider = new PlotVerifyProvider(context);
	vscode.window.registerTreeDataProvider('plotVerifier', provider);

	// ツリービューを操作した際のコマンドを登録
	vscode.commands.registerCommand('plot-verifier-vsce.refresh', ()=> provider.refresh());
	vscode.commands.registerCommand('plot-verifier-vsce.regist', (element:Element)=> provider.regist(element));
	vscode.commands.registerCommand('plot-verifier-vsce.unregist', (element:Element)=> provider.unregist(element));
	vscode.commands.registerCommand('plot-verifier-vsce.open', (element:Element)=> provider.open(element));
	vscode.commands.registerCommand('plot-verifier-vsce.add', (element:Element)=> provider.add(element));
	vscode.commands.registerCommand('plot-verifier-vsce.input', (element:Element)=> provider.input(element));
	vscode.commands.registerCommand('plot-verifier-vsce.remove', (element:Element)=> provider.remove(element));
	vscode.commands.registerCommand('plot-verifier-vsce.moveUpFile', (element:Element)=> provider.moveUp(element));
	vscode.commands.registerCommand('plot-verifier-vsce.moveDownFile', (element:Element)=> provider.moveDown(element));
	vscode.commands.registerCommand('plot-verifier-vsce.moveUpItem', (element:Element)=> provider.moveUp(element));
	vscode.commands.registerCommand('plot-verifier-vsce.moveDownItem', (element:Element)=> provider.moveDown(element));
	// 解析ビューのコマンドを登録
	context.subscriptions.push(
		vscode.commands.registerCommand('plot-verifier-vsce.analyze', ()=>{ provider.analyze();})
	);
}

export function deactivate() {}
