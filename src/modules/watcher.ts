import { watchFile, unwatchFile } from 'fs';
import { basename } from 'path';
import * as vscode from 'vscode';
import { PreviousTime, save, StackedTime } from './workload';

// import { save } from './workload';

/** ファイルを監視するクラス */
export class Watcher {
    constructor(
        /**
         * 変更のハンドラ
         * @param file 変更のあったファイルのフルパス
         */
        private listener: (file:string, date:Date, size:number, diff:number, elapsed:number)=>void,
        /** 監視のインターバル */
        public interval:number=3000,
        /** 対象ファイル */
        private files:vscode.Uri[]=[],
        /** 作業時間（積み上げ） */
        private stackedTimes:StackedTime[]=[],
        /** 作業時間（直近） */
        private previousTime:PreviousTime={file:"",time:0},
    ){}
    
    /**
     * 監視対象のファイルを置き換える。以前の監視対象は対象外となる。
     * @param files 監視対象
     */
    replace(files:vscode.Uri[])
    {
        // いったんすべての監視を解除
        for(let file of this.files)
        {
            unwatchFile(file.fsPath);
        }

        // ファイル監視を登録
        this.files = files;
        for(let file of this.files)
        {
            // const fileName = basename(file.fsPath);
            watchFile(file.fsPath, {interval:this.interval}, (curr,prev)=>{
                console.log(`watched: ${file}, ${curr.size}`);
                let elapsed=this.getTimeSpan(file.fsPath);
                // ハンドラへ通知
                this.listener(
                    file.fsPath,
                    new Date(),
                    curr.size,
                    Math.abs(curr.size-prev.size),
                    elapsed
                ); 
            });
        }
    }

    /** 計測開始 */
    startTimespan(file:string, time:number = Date.now())
    {
        // エディタ（編集中のファイル）が切り替わっている場合、未保存の時間を積み上げる
        // * 経過時間の出力はファイル保存のタイミングのみ
        if(file !== this.previousTime.file)
        {
            const diff = Math.floor( (time - this.previousTime.time) /1000 );
            const stacked = this.stackedTimes.find(s=>s.file===this.previousTime.file);
            if(stacked)
            {
                // 作業時間を加算
                stacked.time += diff;
            }
            else if(this.previousTime.file !== "")
            {
                // file引数が空（エディタなし）の場合、スパンの開始時点は更新するが、積み上げはしない
                this.stackedTimes.push({file:this.previousTime.file, time:diff});
            }
            
            // 切り替え後も、未登録なら登録しておく
            if(!this.stackedTimes.find(s=>s.file === file) && file !== "")
            {
                this.stackedTimes.push({file:file, time:0});
            }
            // 計測開始タイミングを更新
            this.previousTime = {file:file, time:time};
        }
        // console.log('stacked: ', JSON.stringify(this.stackedTimes, null, 3));
    }

    /** 経過時間の取得（およびクリア） */
    getTimeSpan(file:string)
    {
        let elapsed = 0;
        // いったん積み上げ
        this.startTimespan(file);
        // 経過時間の累積を取得してクリアする
        const stacked = this.stackedTimes.find(s=>s.file===file);
        if(stacked)
        {
            elapsed += stacked.time;
            stacked.time = 0;
        }
        return elapsed;
    }
}