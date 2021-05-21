import { existsSync } from 'fs';
import { EOL } from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { getWorkloadFile } from './util';

interface Workload {
    /** 作業日時 */
    date:Date;
    /** 対象ファイル */
    file:string;
    /** 現在サイズ */
    size:number;
    /** 作業量（増減） */
    fluctuation:number;
}

async function getWorkload(): Promise<Workload[]>
{
	const workloadFile = getWorkloadFile();
	if(workloadFile){
		let workloads:Workload[]=[];
		if(existsSync(workloadFile.fsPath)){
			let content = Buffer.from(await vscode.workspace.fs.readFile(workloadFile)).toString('utf8');
			for(let row of content.split(EOL))
			{
				let cells = row.split('\t');
				if(cells.length >= 4){
					try{
						workloads.push({
							date: new Date(cells[0]),
							file: cells[1],
							size: Number(cells[2]),
							fluctuation: Number(cells[3])
						});
					}catch{console.log('error on load workloads: ', row); }
				}
			}
		}
		return Promise.resolve(workloads);
	}else{
		return Promise.reject('workload ファイルを開けませんでした');
	}
}

export function analyze(context:vscode.ExtensionContext){
    // TODO id等を指定する
			const panel = vscode.window.createWebviewPanel('id', 'title', vscode.ViewColumn.Two, {enableScripts:true});

			// ファイルの読み込み

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
}