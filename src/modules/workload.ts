import { existsSync } from 'fs';
import { EOL } from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import nedb = require('nedb');
import { getWorkloadFile, getWorkloadLogFile } from './util';

/** 作業量 */
interface Workload {
    /** 作業日時 */
    date:Date;
    /** 対象ファイル */
    file:string;
    /** 現在サイズ */
    size:number;
    /** 作業量（増減） */
    diff:number;
}


/** 作業量を追記 */
export function save(workload:Workload)
{
	// DB初期化
	const db = new nedb({
		filename: getWorkloadFile().fsPath,
		autoload: true
	});
	const db2 = new nedb({
		filename: getWorkloadLogFile().fsPath,
		autoload:true
	});
	// 日付に丸める
	const date = new Date(
		workload.date.getFullYear(),
		workload.date.getMonth(),
		workload.date.getDate(),
		0,0,0
	);
	db.find({file:workload.file, date:date},(err:any,rows:Workload[])=>{
		if(rows.length > 0){
			// 同日の作業量を合算
			db.update(
				{file:workload.file, date:date},
				{$inc:{
					size:workload.size,
					diff:workload.diff
				}});
		}else{
			// 登録
			db.insert({
				file:workload.file,
				date:date,
				size:workload.size,
				diff:workload.diff,
			});
		}
	});
	// 詳細ログをそのまま出力
	db2.insert(workload);
}

function getWorkload(){
	const db = new nedb({
		filename: getWorkloadFile().fsPath,
		autoload: true
	});
	db.find({},(err:any,workloads:Workload[])=>{
		console.log(workloads);
	});
}

/** 日毎の集計 */
function dailyWL(workloads:Workload[]){
	let rtn:[string[],any[],any[]] = [ ['x'], ['data1'], ['data2'] ];
	for(let workload of workloads){
		// 日付を取得
		const d = getDateString(workload.date);
		const i = rtn[0].indexOf(d);
		if(i < 0)
		{
			rtn[0].push(d);
			rtn[1].push(workload.size);
			rtn[2].push(workload.diff);
		}else{
			rtn[1][i] = workload.size;
			rtn[2][i] += workload.diff;
		}
	}
	return rtn;
}
function getDateString(date:Date)
{
	return `${date.getFullYear()}-${ ('0' + (date.getMonth()+1)).slice(-2) }-${ ('0' + date.getDate()).slice(-2) }`;
}


export async function analyze(context:vscode.ExtensionContext){
    // TODO id等を指定する
			const panel = vscode.window.createWebviewPanel('id', 'title', vscode.ViewColumn.Two, {enableScripts:true});

			// ファイルの読み込み
			// const workloads = await getWorkload();
			// const daily = dailyWL(workloads);
			// console.log('workloads: ', daily);
			// const daily = [];

			getWorkload();

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
								// columns: {JSON.stringify(daily)}
								// 	,
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