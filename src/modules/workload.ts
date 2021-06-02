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
	/** 作業時間（分） */
	elapsed:number;
}

/** 作業時間 */
export interface PreviousTime {
	/** ファイル */
	file:string;
	/** 開始時間（Date） */
	time:number;
}

export interface StackedTime{
	/** ファイル */
	file:string;
	/** 積み上げ時間（分） */
	time:number;
}


/** 作業量を保存する */
export function save(workload:Workload)
{
	// DB初期化
	const db = new nedb({
		filename: getWorkloadFile().fsPath,
		autoload: true
	});
	// const db2 = new nedb({
	// 	filename: getWorkloadLogFile().fsPath,
	// 	autoload:true
	// });
	// 日付に丸める
	// const date = new Date(
	workload.date = new Date(
		workload.date.getFullYear(),
		workload.date.getMonth(),
		workload.date.getDate(),
		0,0,0
	);

	// nedb にDateで保存するとなぜか取り出し時に値がずれているため、Date.getTime() を保存する。
	db.update(
		{
			$and:[
				{date:workload.date},
				{file:workload.file},
			]
		},
		{
			$set:{
				// date: workload.date,
				time: workload.date.getTime(),
				file: workload.file,
				size: workload.size,
			},
			$inc:{
				diff: workload.diff,
				elapsed: workload.elapsed
			}
		},
		{upsert:true},
		// (err, updated, upsert)=>{ console.log(`nedb.update(). updated: ${updated}, upsert: ${JSON.stringify(upsert)}, err: ${err}`); }
	);
	// db.find({file:workload.file, date:workload.date},(err:any,rows:Workload[])=>{
	// 	if(rows.length > 0){
	// 		// 同日の作業量を合算
	// 		db.update(
	// 			{file:workload.file, date:workload.date},
	// 			{$inc:{
	// 				size:workload.size,
	// 				diff:workload.diff,
	// 				elapsed:workload.elapsed,
	// 			}});
	// 	}else{
	// 		// 登録
	// 		db.insert(workload);
	// 		// db.insert({
	// 		// 	file:workload.file,
	// 		// 	date:date,
	// 		// 	size:workload.size,
	// 		// 	diff:workload.diff,
	// 		// 	elapsed:workload.elapsed,
	// 		// });
	// 	}
	// });
	// 詳細ログをそのまま出力
	// db2.insert(workload);
}

/** 読み込み */
function getWorkload(){
	return new Promise((resolve,reject)=>{
		const db = new nedb({
			filename: getWorkloadFile().fsPath,
			autoload: true
		});
		// FIXME: NEDBから取り込んだDateが、翌日になっている。また末二日が同日に。
		db.find({}).sort({time:1}).exec((err:any,docs:any[])=>{
			if(err){ reject(err); }
			
			// ファイルごと、全ファイル、のデータを作成する
			let wls = {all:[]};
			// for(let wl of workloads)
			for(let doc of docs)
			{
				const wl = {
					date: new Date(doc.time),
					file: doc.file,
					size: doc.size,
					diff: doc.diff,
					elapsed: doc.elapsed
				};
				// 確認
				// console.log(`file: ${wl.file}, date: ${wl.date}, date2: ${new Date(wl.time)}`);
				// 各ファイル
				if(Object.keys(wls).includes(wl.file))
				{
					wls[wl.file].push(wl);
				}else{
					wls[wl.file] = [wl];
				}
				// 全ファイル
				let i = wls['all'].findIndex(w=>w.date.getTime() === wl.date.getTime());
				if(i>=0){
					wls['all'][i].size += wl.size;
					wls['all'][i].diff += wl.diff;
					wls['all'][i].elapsed += wl.elapsed;
				}else{
					wls['all'].push({
						file: 'all',
						date: wl.date,
						size: wl.size,
						diff: wl.diff,
						elapsed: wl.elapsed,
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


export async function analyze(context:vscode.ExtensionContext, achievements:any[], isDark:boolean=true){
    
	const panel = vscode.window.createWebviewPanel('plotexr.analyze', 'ダッシュボード', vscode.ViewColumn.One, {enableScripts:true});

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
	const bcss = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'vendor', 'bootstrap', 'bootstrap.min.css')));
	const bjs = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'vendor', 'bootstrap', 'bootstrap.min.js')));

	/** ダークテーマ向けスタイル（文字色を白に） */
	const darkTheme = `
	text { fill: white; color: white; }
	.c3-legend-item { fill: white; }
	.c3-chart-arc .c3-gauge-value { fill: white; }
	.c3-axis-x path, .c3-axis-x line, .c3-axis-y path, .c3-axis-y line, .c3-axis-y2 path, .c3-axis-y2 line{ stroke: white; }
	.c3-tooltip tbody tr td {color: black;}
	`;

	const updateWebview = ()=>{
		panel.webview.html = `
		<!DOCTYPE html>
		<html lang="ja" class="bg-transparent">
			<head>
				<meta charset="utf-8">
				<script src="${d3js}" charset="utf-8"></script>
				<link href="${c3css}" rel="stylesheet">
				<script src="${c3js}"></script>
				<script src="${jquery}"></script>
				<link href="${bcss}" rel="stylesheet">
				<script src="${bjs}"></script>
				<style>
					${isDark? darkTheme: ""}
					/* Bootstrap の背景色を無効化 */
					body { background-color: transparent; }
				</style>
			</head>
			<body>
				<main class="container ${isDark? "text-light": "text-dark"}">
					<div class="text-center">
						<h1>analyze dashboard (0x0)</h1>
					</div>

					<div>
						<!-- 作業量チャート -->
						<div class="row">
							<div class="col-3">
								<select id="file" class="form-select form-select-sm"></select>
							</div>
							<div class="col-2">
								<select id="range" class="form-select form-select-sm">
									<option value="all" selected>全期間</option>
									<option value="week">一週間</option>
									<option value="month">一ヶ月</option>
								</select>
							</div>
							<div class="col-2">
								<input type="checkbox" class="btn-check" id="btnElapsed" autocomplete="off">
								<label class="btn btn-sm btn-outline-light" for="btnElapsed">elapsed</label>
							</div>
						</div>
						<div id="daily"></div>
					</div>

					<!-- ファイルごと進捗 -->
					<div class="text-center">
						<h2>progress</h2>
					</div>
					<div id="gaugeArea" class="container">
					</div>
				</main>
				
				<script>
					var selectedFile = "all";
					var range = "all";
					var viewElapsed = false;
					var now = new Date();
					var xWeek = now;
					var xMonth = now;
					// stringify() した時点で、.date は string になっている。
					var workloads = ${JSON.stringify(workloads)};
					var achievements = ${JSON.stringify(achievements)};
					xWeek = new Date(now.setDate(now.getDate()-7));
					xMonth = new Date(now.setMonth(now.getMonth()-2));
					console.log('now: ', now.toString());
					console.log('xWeek: ', xWeek.toString());
					console.log('xMonth: ', xMonth.toString());
					// generate selector
					var select = $("#file");
					var selectRange = $("#range");
					var checkElapsed = $("#btnElapsed");
					for(var file of Object.keys(workloads))
					{
						select.append($("<option>").text(file).val(file));
					}
					if(workloads.length>0){
						select.val(Object.keys(workloads)[0]);
					}
					// console.log(workloads);
					// console.log(achievements);
					var daily = c3.generate({
						bindto: '#daily',
						data: {
							x: 'x',
							columns: [
								['x'],
								['size'],
								['diff'],
								['elapsed']
							],
							// columns: {JSON.stringify(daily)}
							// 	,
							axes: { diff: 'y2'},
							types: { size: 'bar', diff: 'area', elapsed: 'area' }
						},
						axis: {
							x: {
								type: 'timeseries',
								tick: { format: '%Y-%m-%d' }
							},
							y: {label: {
								text: 'size (word count)',
								position: 'outer-middle'
							}},
							y2: {
								label: {
									text: 'diff (word count)',
									position: 'outer-middle'
								},
								show: true
							}
						},
						color: {
							pattern: ['#ffbb78', '#aec7e8', '#2ca02c']
						}
					});
					daily.hide(['elapsed']);
					// console.log(daily);

					// データを後からロードすると、アニメーションしてくれるので見栄えがする
					daily.load({
						columns: [
							// ['x', '2013-01-01', '2013-01-02', '2013-01-03', '2013-01-04', '2013-01-05', '2013-01-06'],
							// ['size', 30, 100, 130, 200, 210, 250],
							// ['diff', 30, 70, 30, 70, 10, 40],
							['x'].concat(workloads.all.map((w)=>{return w.date.substring(0,10) })),
							['size'].concat(workloads.all.map((w)=>{return w.size})),
							['diff'].concat(workloads.all.map((w)=>{return w.diff})),
							['elapsed'].concat(workloads.all.map((w)=>{return w.elapsed})),
						]
					});
					// ファイルの切り替え
					select.change(()=>{
						selectedFile = select.val();
						if(!viewElapsed){
							daily.load({
								columns: [
									['x'].concat(workloads[selectedFile].map((w)=>{return w.date.substring(0,10); })),
									['size'].concat(workloads[selectedFile].map((w)=>{return w.size; })),
									['diff'].concat(workloads[selectedFile].map((w)=>{return w.diff; })),
								]
							});
						}else{
							daily.load({
								columns: [
									['x'].concat(workloads[selectedFile].map((w)=>{return w.date.substring(0,10); })),
									['size'].concat(workloads[selectedFile].map((w)=>{return w.size; })),
									['diff'].concat(workloads[selectedFile].map((w)=>{return w.diff; })),
									['elapsed'].concat(workloads[selectedFile].map((w)=>{return w.elapsed; })),
								]
							});
						}
					});
					// 期間の切り替え
					selectRange.change(()=>{
						range = selectRange.val();
						if(range === 'week'){
							// console.log('range week: ', xWeek);
							daily.axis.range({min:{x: xWeek}});
						}else if(range === 'month'){
							// console.log('range month: ', xMonth);
							daily.axis.range({min:{x: xMonth}});
						}else{
							// ファイルごとの最小値
							// console.log('range all: ', workloads[selectedFile][0].date);
							daily.axis.range({min:{x: new Date(workloads[selectedFile][0].date)}});
						}
					});
					// 時間の表示/非表示
					checkElapsed.change(async()=>{
						viewElapsed = checkElapsed.prop('checked');
						// console.log('elapsed: ', viewElapsed);
						if(viewElapsed){
							// y2軸の単位を、時間にする。
							daily.axis.labels({y:'size,diff (word count)', y2:'elapsed (minutes)'});
							daily.show(['elapsed']);
							daily.load({
								axes: {elapsed:'y2'},
								columns: [
									['elapsed'].concat(workloads[selectedFile].map(w=>{return w.elapsed; }))
								]
							});
						} else {
							daily.axis.labels({y:'size (word count)', y2:'diff (word count)'});
							daily.hide(['elapsed']);
							daily.load({axes: {diff:'y2'}});
						}
					});

					var area = $("#gaugeArea");
					var colCount = 1;
					var row;
					for(var i=0; i<achievements.length; i++)
					{
						var ac = achievements[i];
						var id = "gauge_" + i
						var gauge = $("<div>").attr("id", id);
						// 3カラムごと
						if(colCount === 1){
							row = $('<div class="row"></div>').appendTo(area);
						}
						$('<div class="col-4"></div>').append(gauge).appendTo(row);
						if(colCount++ >= 3){
							colCount = 1;
						}
						
						// チャート生成
						var chart = c3.generate({
							bindto: "#" + id,
							data:{ columns:[], type: 'gauge'},
							gauge: {},
							color: {
								pattern: ['#FF0000', '#F97600', '#F6C600', '#60B044'],
								threshold:{
									values:[30, 60, 90, 100]
								}
							},
							tooltip: { show: false }
						})
						chart.load({
							columns:[[ac.file, ac.achievement]]
						});
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