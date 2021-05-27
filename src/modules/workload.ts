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

/** 読み込み */
function getWorkload(){
	return new Promise((resolve,reject)=>{
		const db = new nedb({
			filename: getWorkloadFile().fsPath,
			autoload: true
		});
		db.find({}).sort({date:1}).exec((err:any,workloads:Workload[])=>{
			if(err){ reject(err); }
			// console.log(workloads);
			
			// 全体、ファイルごと、のデータを作成する
			let wls = {all:[]};
			for(let wl of workloads)
			{
				// 各ファイル
				if(Object.keys(wls).includes(wl.file))
				{
					wls[wl.file].push(wl);
				}else{
					wls[wl.file] = [wl];
				}
				// 全ファイル
				let i = wls['all'].findIndex(w=>w.date.getTime() == wl.date.getTime());
				if(i>=0){
					wls['all'][i].size += wl.size;
					wls['all'][i].diff += wl.diff;
				}else{
					wls['all'].push({
						file: 'all',
						date: wl.date,
						size: wl.size,
						diff: wl.diff,
					});
				}
			}
			resolve(wls);
		});
	});
}

// /** 日毎の集計 */
// function dailyWL(workloads:Workload[]){
// 	let rtn:[string[],any[],any[]] = [ ['x'], ['data1'], ['data2'] ];
// 	for(let workload of workloads){
// 		// 日付を取得
// 		const d = getDateString(workload.date);
// 		const i = rtn[0].indexOf(d);
// 		if(i < 0)
// 		{
// 			rtn[0].push(d);
// 			rtn[1].push(workload.size);
// 			rtn[2].push(workload.diff);
// 		}else{
// 			rtn[1][i] = workload.size;
// 			rtn[2][i] += workload.diff;
// 		}
// 	}
// 	return rtn;
// }
// function getDateString(date:Date)
// {
// 	return `${date.getFullYear()}-${ ('0' + (date.getMonth()+1)).slice(-2) }-${ ('0' + date.getDate()).slice(-2) }`;
// }


export async function analyze(context:vscode.ExtensionContext, achievements:any[]){
    // TODO id等を指定する
			const panel = vscode.window.createWebviewPanel('plotexr.analyze', 'ダッシュボード', vscode.ViewColumn.Two, {enableScripts:true});

			// ファイルの読み込み
			// const workloads = await getWorkload();
			// const daily = dailyWL(workloads);
			// console.log('workloads: ', daily);
			// const daily = [];

			const workloads = await getWorkload();

			// スクリプトファイルのパス取得
			const d3js = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'vendor', 'd3', 'd3.min.js')));
			const c3css = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'vendor', 'c3', 'c3.css')));
			const c3js = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'vendor', 'c3', 'c3.min.js')));
			const jquery = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'vendor', 'jquery', 'jquery-3.6.0.min.js')));

			const updateWebview = ()=>{
				panel.webview.html = `
				<!DOCTYPE html>
				<html lang="ja">
					<head>
						<script src="${d3js}" charset="utf-8"></script>
						<link href="${c3css}" rel="stylesheet">
						<script src="${c3js}"></script>
						<script src="${jquery}"></script>
					</head>
					<body>
						<!-- 日次、今週、今月 -->
						<p>日次</p>
						<select id="file"></select>
						<div id="daily" style="background-color:white"></div>
						<!-- ファイル単位の Donut Chart -->
						<p>ファイル単位</p>
						<div id="donut" style="background-color:white"></div>
						<div id="gauge" style="background-color:white"></div>
						<script>
							// stringify() した時点で、.date は string になっている。
							var workloads = ${JSON.stringify(workloads)};
							var achievements = ${JSON.stringify(achievements)};
							// generate selector
							var select = $("#file");
							for(var file of Object.keys(workloads))
							{
								select.append($("<option>").text(file).val(file));
							}
							// console.log(workloads);
							console.log(achievements);
							var daily = c3.generate({
								bindto: '#daily',
								data: {
									x: 'x',
									columns: [
										['x'],
										['size'],
										['diff'],
									],
									// columns: {JSON.stringify(daily)}
									// 	,
										axes: { diff: 'y2'},
										types: { size: 'bar' }
								},
								axis: {
									x: {
										type: 'timeseries',
										tick: { format: '%Y-%m-%d' }
									},
									y: {label: {text: 'size'}},
									y2: {
										label: {text: 'diff'},
										show: true
									}
								},
								color: {
									pattern: ['#ffbb78', '#1f77b4', '#2ca02c']
								}
							});

							// データを後からロードすると、アニメーションしてくれるので見栄えがする
							daily.load({
								columns: [
									// ['x', '2013-01-01', '2013-01-02', '2013-01-03', '2013-01-04', '2013-01-05', '2013-01-06'],
									// ['size', 30, 100, 130, 200, 210, 250],
									// ['diff', 30, 70, 30, 70, 10, 40],
									['x'].concat(workloads.all.map((w)=>{return w.date.substring(0,10) })),
									['size'].concat(workloads.all.map((w)=>{return w.size})),
									['diff'].concat(workloads.all.map((w)=>{return w.diff})),
								]
							});
							select.change(()=>{
								var filename = select.val();
								daily.load({
									columns: [
										['x'].concat(workloads[filename].map((w)=>{return w.date.substring(0,10); })),
										['size'].concat(workloads[filename].map((w)=>{return w.size; })),
										['diff'].concat(workloads[filename].map((w)=>{return w.diff; }))
									]
								});
							});


							// var donut = c3.generate({
							// 	bindto: '#donut',
							// 	data: {
							// 		columns:[ 
							// 		// 	['data1', 30],
							// 		// 	['data2', 120],
							// 		],
							// 		type: 'donut',
							// 		labels: false
							// 	},
							// 	donut: {title: 'abc.txt'},
							// 	legend: {show: false}
							// });
							// donut.load({
							// 	columns:[
							// 		['済み', 900],
							// 		['残', 200]
							// 	]
							// });

							// var gauge = c3.generate({
							// 	bindto: '#gauge',
							// 	data:{
							// 		// columns:[['.txt',0]],
							// 		columns:[],
							// 		type: 'gauge'
							// 	},
							// 	gauge: {},
							// 	color: {
							// 		pattern: ['#FF0000', '#F97600', '#F6C600', '#60B044'],
							// 		threshold:{
							// 			values:[30, 60, 90, 100]
							// 		}
							// 	}
							// });
							// // カラム名を変えると、複数 load() できる
							// // gauge.load({columns:[['.txt', 90]]});
							// if(achievements.length > 0)
							// {
							// 	var ar = achievements[0];
							// 	// gauge.unload({columns:[['.txt']]})
							// 	gauge.load({
							// 		columns:[[ar.file, ar.achievement]]
							// 	});
							// }

							// for(var ac of achievements)
							for(var i=0; i<achievements.length; i++)
							{
								var ac = achievements[i];
								var id = "gauge_" + i
								var gauge = $("<div>").attr("id", id);
								$("#gauge").append(gauge);
								var chart = c3.generate({
									bindto: "#" + id,
									data:{ columns:[], type: 'gauge'},
									gauge: {},
									color: {
												pattern: ['#FF0000', '#F97600', '#F6C600', '#60B044'],
												threshold:{
													values:[30, 60, 90, 100]
												}
											}
								})
								chart.load({
									columns:[[ac.file, ac.achievement]]
								})
							}

						</script>
					</body>
				</html>
				`;
			};
			updateWebview();

			// webviewの破棄イベント
			panel.onDidDispose(()=>{}, null, context.subscriptions);
}