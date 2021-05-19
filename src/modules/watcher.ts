import * as fs from 'fs';
import * as vscode from 'vscode';

/** ファイルを監視するクラス */
export class Watcher {
    constructor(
        private files:vscode.Uri[]=[],
        private interval:number=3000
    ){}
    
    replace(files:vscode.Uri[])
    {
        // いったんすべて解除
        for(let file of this.files)
        {
            fs.unwatchFile(file.fsPath);
        }

        // ファイル監視を登録
        this.files = files;
        for(let file of this.files)
        {
            fs.watchFile(file.fsPath, {interval:this.interval}, (curr,prev)=>{
                console.log(`watched: ${file}, ${curr.size}`);
            });
        }
    }
}