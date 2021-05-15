
import * as vscode from 'vscode';
import * as path from 'path';
import { PlotVerifyProvider } from './plotVerifyProvider';
import { Element } from './modules/element';

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
		vscode.commands.registerCommand('plot-verifier-vsce.analyze', ()=>{
			// TODO id等を指定する
			const panel = vscode.window.createWebviewPanel('id', 'title', vscode.ViewColumn.Two, {enableScripts:true});

			// スクリプトファイルのパス取得
			const d3js = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'vendor', 'd3', 'd3.min.js')));
			const c3css = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'vendor', 'c3', 'c3.css')));
			const c3js = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'vendor', 'c3', 'c3.min.js')));

			const updateWebview = ()=>{
				panel.webview.html = `
				<!DOCTYPE html>
				<html lang="ja">
					<head>
						<script src="${d3js}" charset="utf-8"></script>
						<link href="${c3css}" rel="stylesheet">
						<script src="${c3js}"></script>
					</head>
					<body>
						<div id="chart" style="background-color:white"></div>
						<script>
							var chart = c3.generate({
								bindto: '#chart',
								data: {
								x: 'x',
								columns: [
									['x', '2013-01-01', '2013-01-02', '2013-01-03', '2013-01-04', '2013-01-05', '2013-01-06'],
									['data1', 30, 200, 100, 400, 150, 250],
									['data2', 130, 340, 200, 500, 250, 350],
								],
									axes: { data2: 'y2'},
									types: { data2: 'bar' }
								},
								axis: {
									x: {
										type: 'timeseries',
										tick: { format: '%Y-%m-%d' }
									},
									y: {label: {text: 'Y'}},
									y2: {label: {text: 'Y2'}}
								}
							});
						</script>
					</body>
				</html>
				`;
			};
			updateWebview();

			// webviewの破棄イベント
			panel.onDidDispose(()=>{}, null, context.subscriptions);
		})
	);
}

export function deactivate() {}
