import { watchFile, unwatchFile } from 'fs';
import { basename } from 'path';
import * as vscode from 'vscode';

// import { save } from './workload';

/** ファイルを監視するクラス */
export class Watcher {
    constructor(
        /**
         * 変更のハンドラ
         * @param file 変更のあったファイルのフルパス
         */
        private listener: (file:string, date:Date, size:number, diff:number)=>void,
        /** 監視のインターバル */
        private interval:number=3000,
        /** 対象ファイル */
        private files:vscode.Uri[]=[],
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
                // 保存処理（設定を使用するため、プロバイダへ移動）
                // save({date:new Date(), file:fileName, size:curr.size, diff:curr.size-prev.size});
                // ハンドラへ通知
                this.listener(file.fsPath, new Date(), curr.size, curr.size-prev.size); 
            });
        }
    }

}