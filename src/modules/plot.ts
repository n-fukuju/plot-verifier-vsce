import * as fs from 'fs';
import * as vscode from 'vscode';

import { Chapter } from "./chapter";
import { Element, ElementType } from "./element";

/** プロットを表すクラス */
export class Plot
{
    /** 章立ての一覧 */
    chapters:Chapter[] = [];
    /** 章立て要素の一覧 */
    chapterElements:Element[] = [];

    /** ルートフォルダ */
    root:vscode.WorkspaceFolder;

    /** コンストラクタ */
    constructor(
        root:vscode.WorkspaceFolder,
        private plotFile:vscode.Uri,
        json:object)
    {
        this.root = root;
        const cs = 'chapters' in json ? json['chapters'] as []: [];
        for(let c of cs)
        {
            this.chapters.push(new Chapter(c));
        }
        for(let c of this.chapters)
        {
            this.chapterElements.push(new Element(c, ElementType.chapter, c));
        }

        return;
    }

    /** 保存 */
    async save()
    {
        await vscode.workspace.fs.writeFile(this.plotFile, Buffer.from(this.forSerialize()));
    }

    /** シリアライズ用のJSON文字列を返す */
    forSerialize()
    {
        let chapters = [];
        for(const c of this.chapters)
        {
            let chapter = {};
            if(c.fileElement){ chapter['file'] = c.fileElement.value; }
            if(c.deadlineElement){ chapter['deadline'] = c.deadlineElement.value; }
            if(c.minimumElements.length > 0){ chapter['minimum'] = c.minimumElements.map(x=> x.value); }
            if(c.maximumElements.length > 0){ chapter['maximum'] = c.maximumElements.map(x=> x.value); }
            if(c.conditionElements.length > 0){ chapter['conditions'] = c.conditionElements.map(x=> x.value); }
            chapters.push(chapter);
        }

        return JSON.stringify({
            // "title": this.title,
            // "description": this.description,
            'chapters': chapters
        }, null, 4);
    }

    /** ファイル一覧を取得する */
    getChapterFiles()
    {
        let files:vscode.Uri[]=[];
        for(let chapter of this.chapters)
        {
            files.push(vscode.Uri.joinPath(this.root.uri, chapter.fileElement.value));
        }
        return files;
    }

    /** chapter を追加する */
    addChapter(path:string)
    {
        // 先頭にスラッシュがついている場合、除去する
        path = path.replace(/^[/\\]+/, '');
        const c = new Chapter({'file':path});
        this.chapters.push(c);
        this.chapterElements.push(new Element(c, ElementType.chapter, c));
    }

    // unWatchFiles()
    // {
    //     for(const chapter of this.chapters)
    //     {
    //         const filePath = vscode.Uri.joinPath(this.root.uri, chapter.fileElement.value);
    //         fs.unwatchFile(filePath.fsPath);
    //     }
    // }
    // watchFiles()
    // {
    //     for(const chapter of this.chapters)
    //     {
    //         const filePath = vscode.Uri.joinPath(this.root.uri, chapter.fileElement.value);
    //         vscode.window.showInformationMessage('watch: ' + filePath.fsPath);
    //         // fs.watchFile(filePath.fsPath, {interval:3000}, this.recordWorkload);
    //         fs.watchFile(
    //             filePath.fsPath,
    //             {interval:3000},
    //             (curr,prev)=>{ this.recordWorkload(curr, prev, chapter.fileElement.value);
    //         });
    //     }
    // }

    moveUpChapter(chapter:Element):boolean{ return this.moveChapter(chapter,true); }
    moveDownChapter(chapter:Element):boolean{ return this.moveChapter(chapter,false); }
    private moveChapter(chapter:Element, up:boolean):boolean
    {
        let index = this.chapterElements.indexOf(chapter);
        if( (up && index > 0) || (!up && index < this.chapterElements.length-1) )
        {
            // 取り除いてから追加する。
            this.chapterElements = this.chapterElements.filter(x=> x!==chapter);
            let c = this.chapters[index];
            this.chapters = this.chapters.filter( (x,i)=> i!==index);
            this.chapterElements.splice(up?index-1:index+1, 0, chapter);
            this.chapters.splice(up?index-1: index+1, 0, c);
            return true;
        }
        return false;
    }
}
