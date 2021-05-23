import { watchFile, unwatchFile } from 'fs';
import { basename } from 'path';
import * as vscode from 'vscode';
import nedb = require('nedb');

import { getWorkloadFile } from './util';
import { stringify } from 'querystring';

import { save } from './workload';

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
            unwatchFile(file.fsPath);
        }

        // ファイル監視を登録
        this.files = files;
        for(let file of this.files)
        {
            const fileName = basename(file.fsPath);
            watchFile(file.fsPath, {interval:this.interval}, (curr,prev)=>{
                console.log(`watched: ${file}, ${curr.size}`);
                // this.save(`${(new Date()).toLocaleString('ja')}\t${fileName}\t${curr.size}\t${curr.size-prev.size}`);
                // this.insert(fileName, curr.size, curr.size-prev.size);
                save({date:new Date(), file:fileName, size:curr.size, diff:curr.size-prev.size});
            });
        }
    }

}