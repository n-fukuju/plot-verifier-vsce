import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';

import { Plot } from './modules/plot';
import { Element, ElementType } from './modules/element';
import { Chapter } from './modules/chapter';
import { Icon, getIcon } from './modules/icon';
import { getPlot, getFolder } from './modules/util';
import { Watcher } from './modules/watcher';
import { analyze } from './modules/workload';

/** プロット検証ツリープロバイダ */
export class PlotVerifyProvider implements vscode.TreeDataProvider<Element>{

    private _onDidChangeTreeData: vscode.EventEmitter<Element | null> = new vscode.EventEmitter<Element | null>();
    readonly onDidChangeTreeData: vscode.Event<Element | null> = this._onDidChangeTreeData.event;

    /** プロット（?）クラス */
    private plot: Plot;
    private autoRefresh = false;
    private analyzeLog = false;

    /** ファイル監視 */
    watcher:Watcher;// = new Watcher(this.fileOnChange);

    context:vscode.ExtensionContext;

    constructor(private _context: vscode.ExtensionContext){
        // vscode.window.onDidChangeActiveTextEditor(() => this.onActiveEditorChanged());
        // vscode.workspace.onDidChangeTextDocument(e => this.onDocumentChanged(e));

        // 設定を取得する。
        this.autoRefresh = vscode.workspace.getConfiguration('plotexr').get<boolean>('autorefresh');
        this.analyzeLog = vscode.workspace.getConfiguration('plotexr').get<boolean>('analyzelog');
        // 設定の更新時の処理
		vscode.workspace.onDidChangeConfiguration((e:vscode.ConfigurationChangeEvent) => {
            if(e.affectsConfiguration('plotexr.autorefresh')){
                this.autoRefresh = vscode.workspace.getConfiguration('plotexr').get<boolean>('autorefresh');
            }
            if(e.affectsConfiguration('plotexr.analyzelog')){
                this.analyzeLog = vscode.workspace.getConfiguration('plotexr').get<boolean>('analyzelog');
            }
        });
        // 監視処理
        // ※ function にすると、this参照が関数になるので、このハンドラはアロー関数で実装する
        this.watcher = new Watcher((file:string)=>{
            // console.log('file on change: ', file);
            for(const chapter of this.plot.chapters)
            {
                const filePath = vscode.Uri.joinPath(this.plot.root.uri, chapter.fileElement.value);
                if(filePath.fsPath === file)
                {
                    // 一致したファイルのみ表示を更新する
                    this.compareFileSize(chapter, filePath.fsPath);
                    this._onDidChangeTreeData.fire(undefined);
                }
            }
        });

        // 拡張機能のローカルパス
        this.context = _context;

        // 常時表示
        vscode.commands.executeCommand('setContext', 'plotVerifierEnabled', true);
        // 初回
        this.refresh();

    }

    /** Interface の実装 */
    getChildren(element?: Element): Thenable<Element[]>
    {
        // children を返す。
        // chapter
        // └─condition

        // TODO Nodeクラスを実装する
        if(element)
        {
            // 引数が Chapter の場合、プロパティ一覧を返す
            if(element.type === ElementType.chapter)
            {
                const chapter:Chapter = element.value as Chapter;
                return Promise.resolve(chapter.properties);
            }
            else
            {
                // プロパティに子要素はない
                return Promise.resolve([]);
            }
        }
        else
        {
            // 読み込み済みでなければ終了
            if(!this.plot){ return Promise.resolve([]); }

            // ルート（引数が空）の場合、Chapter 一覧を返す
            return Promise.resolve(this.plot.chapterElements);
        }
    }

    /** Interface の実装 */
    getTreeItem(element: Element): vscode.TreeItem
    {
        // if(element.type == ElementType.CHAPETER)
        switch(element.type)
        {
            case ElementType.chapter:
                const chapter:Chapter = element.value as Chapter;
                const chapterItem = new vscode.TreeItem(chapter.fileElement.label, vscode.TreeItemCollapsibleState.Expanded);
                chapterItem.description = chapter.fileElement.description;
                // 選択アイコン表示用の値。（package.json の、view/item/context）
                chapterItem.contextValue = 'chapter';
                // エラーのある Chapter は子要素を表示しない
                if(chapter.fileElement.isError)
                {
                    chapterItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
                    chapterItem.iconPath = getIcon(Icon.alert, this.context);
                }
                return chapterItem;
            case ElementType.deadline:
                if(!element.value || element.value === ""){ return null; }
                let deadItem = new vscode.TreeItem(element.value, vscode.TreeItemCollapsibleState.None);
                deadItem.contextValue = 'deadline';
                deadItem.label = element.label;
                deadItem.description = element.description;
                deadItem.iconPath = (element.isError)? getIcon(Icon.alert, this.context): getIcon(Icon.calendar, this.context);
                return deadItem;
            case ElementType.minimum:
                if(!element.value || element.value === ""){ return null; }
                let miniItem = new vscode.TreeItem(element.value, vscode.TreeItemCollapsibleState.None);
                miniItem.contextValue = 'minimum';
                miniItem.label = element.label;
                miniItem.description = element.description;
                miniItem.iconPath = (element.isError)? getIcon(Icon.quillpen, this.context): getIcon(Icon.check, this.context);
                return miniItem;
            case ElementType.maximum:
                if(!element.value || element.value === ""){ return null; }
                let maxItem = new vscode.TreeItem(element.value, vscode.TreeItemCollapsibleState.None);
                maxItem.contextValue = 'maximum';
                maxItem.label = element.label;
                maxItem.description = element.description;
                maxItem.iconPath = (element.isError)? getIcon(Icon.alert, this.context): getIcon(Icon.quillpen, this.context);
                return maxItem;
            case ElementType.condition:
                let conItem = new vscode.TreeItem(element.value, vscode.TreeItemCollapsibleState.None);
                conItem.contextValue = 'condition';
                conItem.label = element.label;
                conItem.description = element.description;
                conItem.iconPath = (element.isError)? getIcon(Icon.search, this.context): getIcon(Icon.check, this.context);
                return conItem;
        }
        return null;
    }

    /** 検証を再実行する */
    async refresh()
    {
        this.plot = await getPlot();
        this.comparePlot();
        this._onDidChangeTreeData.fire(undefined);
        // ファイル監視対象を更新
        this.watcher.replace(this.plot.getChapterFiles());
    }

    /** ファイルを開く
     * @param element ツリー要素
     */
    open(element:Element)
    {
        if(element.type !== ElementType.chapter){ return; }
        
        const chapter = element.value as Chapter;
        if(chapter)
        {
            const filePath = vscode.Uri.joinPath(this.plot.root.uri, chapter.fileElement.value);
            if(fs.existsSync(filePath.fsPath))
            {
                vscode.workspace.openTextDocument(filePath.fsPath).then(doc=> {
                    vscode.window.showTextDocument(doc);
                });
            }
        }
    }

    /** ファイルをツリーに登録する
     * @param element ツリー要素
     */
    regist(element:Element)
    {
        const defaultFolder = getFolder();
        let defaultUri:vscode.Uri;
        if(defaultFolder) { defaultUri = vscode.Uri.file(defaultFolder); }
        else { vscode.window.showWarningMessage('開いているフォルダがないため、処理できません。'); }

        // ファイル選択
        vscode.window.showOpenDialog({title: "ファイルを選択する", openLabel:"選択", defaultUri:defaultUri}).then(uri=>{
            if(uri && uri[0]){
                // console.log(uri[0].fsPath);
                const folder = getFolder();
                if(folder)
                {
                    // フォルダ内のファイルであること
                    if(uri[0].fsPath.substring(0, folder.length) === folder)
                    {
                        // フォルダからの相対パスに変換してツリーに追加
                        const file = uri[0].fsPath.substring(folder.length);
                        this.plot.addChapter(file);
                        // 保存
                        // setPlot(this.plot);
                        this.plot.save();
                        // 表示を更新
                        this.comparePlot();
                        this._onDidChangeTreeData.fire(undefined);
                        // ファイル監視対象を更新
                        this.watcher.replace(this.plot.getChapterFiles());
                    }
                    else
                    {
                        vscode.window.showWarningMessage('フォルダ外のファイルは登録できません。', uri[0].fsPath);
                    }
                }
                else
                {
                    vscode.window.showWarningMessage('開いているフォルダがないため、処理できません。');
                }
            }
        });
    }

    /** ファイルをツリーから登録解除する
     * @param element ツリー要素
     */
    unregist(element:Element)
    {
        const chapter:Chapter = element.value as Chapter;
        // 確認
        vscode.window.showInputBox({placeHolder: 'y/n', prompt:`${chapter.fileElement?.value} 登録解除する場合、y`}).then(value=>{
            if(value && value === 'y'){
                // 合致しない要素のみの配列を生成
                const index = this.plot.chapters.indexOf(chapter);
                this.plot.chapters = this.plot.chapters.filter( (e,i)=> i !== index);
                this.plot.chapterElements = this.plot.chapterElements.filter( (e,i)=> i !== index);
                // 保存、表示更新
                // setPlot(this.plot);
                this.plot.save();
                this._onDidChangeTreeData.fire(undefined);
                // ファイル監視対象を更新
                this.watcher.replace(this.plot.getChapterFiles());
            }
        });
    }

    /** 検証項目を追加する
     * @param element ツリー要素
     */
    add(element:Element)
    {
        vscode.window.showQuickPick(['期日', '最小', '最大', '記述'], {placeHolder:'追加する項目'}).then(value=>{
            if(value)
            {
                const chapter:Chapter = element.value as Chapter;
                switch(value)
                {
                    case '期日':
                        if(!chapter.deadlineElement){
                            chapter.deadlineElement = new Element(chapter, ElementType.deadline, '1970/01/01');
                            chapter.properties.push(chapter.deadlineElement);
                        }else{
                            vscode.window.showWarningMessage('期日は一つまでです(0x0)');
                        }
                        break;
                    case '最小':
                        const min = new Element(chapter, ElementType.minimum, '1枚');
                        chapter.minimumElements.push(min);
                        chapter.properties.push(min);
                        break;
                    case '最大':
                        const max = new Element(chapter, ElementType.maximum, '10枚');
                        chapter.maximumElements.push(max);
                        chapter.properties.push(max);
                        break;
                    case '記述':
                        const con = new Element(chapter, ElementType.condition, '記述');
                        chapter.conditionElements.push(con);
                        chapter.properties.push(con);
                        break;
                }
                // 保存、表示更新
                // setPlot(this.plot);
                this.plot.save();
                this.comparePlot();
                this._onDidChangeTreeData.fire(undefined);
            }
        });
    }

    /** 検証項目へ入力する */
    input(element:Element)
    {
        let placeHolder = '';
        switch(element.type)
        {
            case ElementType.deadline:
                placeHolder = 'YYYY/MM/DD';
                break;
            case ElementType.minimum:
            case ElementType.maximum:
                placeHolder = 'n枚（400字詰めの枚数）、nKB/nMB（ファイルサイズ）、n字/n（文字数）';
                break;
            case ElementType.condition:
                placeHolder = '記述必須のテキスト（正規表現）';
                break;
        }
        vscode.window.showInputBox({placeHolder:placeHolder, value:element.value}).then(value=>{
            if(value)
            {
                element.value = value;
                // 保存、表示更新
                // setPlot(this.plot);
                this.plot.save();
                this.comparePlot();
                this._onDidChangeTreeData.fire(undefined);
            }
        });
    }

    /** 検証項目を削除する
     * @param element ツリー要素
     */
    remove(element:Element)
    {
        element.chapter.removeElement(element);
        // 保存、表示更新
        // setPlot(this.plot);
        this.plot.save();
        this.comparePlot();
        this._onDidChangeTreeData.fire(undefined);
    }

    /** 上へ移動する */
    moveUp(element:Element)
    {
        if(element.type===ElementType.chapter
            ?this.plot.moveUpChapter(element)
            :element.chapter.moveUp(element))
        {
            // 保存、表示更新
            // setPlot(this.plot);
            this.plot.save();
            this._onDidChangeTreeData.fire(undefined);
        }else{ vscode.window.showWarningMessage('移動できません(0x0)'); }
    }

    /** 下へ移動する */
    moveDown(element:Element)
    {
        if(element.type===ElementType.chapter
            ?this.plot.moveDownChapter(element)
            :element.chapter.moveDown(element))
        {
            // 保存、表示更新
            // setPlot(this.plot);
            this.plot.save();
            this._onDidChangeTreeData.fire(undefined);
        }else{ vscode.window.showWarningMessage('移動できません(0x0)'); }
    }

    /** 比較検証 */
    private comparePlot()
    {
        if(!this.plot){ return; }

        for(const chapter of this.plot.chapters)
        {
            const filePath = vscode.Uri.joinPath(this.plot.root.uri, chapter.fileElement.value);
            // ファイル関連
            if(!fs.existsSync(filePath.fsPath))
            {
                chapter.fileElement.isError = true;
                chapter.fileElement.label = path.basename(chapter.fileElement.value);
                chapter.fileElement.description = "File not found.";
                // ファイルが存在しないChapterは処理しない
                continue;
            }
            else
            {
                chapter.fileElement.label = path.basename(chapter.fileElement.value, path.extname(chapter.fileElement.value));
                chapter.fileElement.description = chapter.fileElement.value;
            }

            // 比較検証
            this.compareDeadline(chapter);
            this.compareFileSize(chapter, filePath.fsPath);
            this.compareCondition(chapter, filePath.fsPath);

        }
    }

    /** 期限の検証を行う
     * 
     * YYYY/MM/DD or YYYY-MM-DD
     * MM/DD or MM-DD
     */
    private compareDeadline(chapter:Chapter)
    {
        // 指定されている場合のみ処理
        if(!chapter.deadlineElement?.value){ return; }

        const reYMD = /^(\d{4})[/-]{1}(\d{1,2})[/-]{1}(\d{1,2})/;
        const reMD = /^(\d{1,2})[/-]{1}(\d{1,2})/;
        let match = chapter.deadlineElement.value.match(reYMD);
        // YMDで検索
        if(match)
        {
            chapter.deadlineElement.label = match[0];

            // Date コンストラクタ引数の Month は 0起点 なので注意
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const d = new Date(Number(match[1]), Number(match[2])-1, Number(match[3]));
            console.log(`deadline: ${chapter.deadlineElement.value}, date: ${d.toLocaleString('ja')}, today: ${today.toLocaleString('ja')}`);
            if(today.getTime() >= d.getTime())
            {
                chapter.deadlineElement.isError = true;
                chapter.deadlineElement.description = "The deadline has reached.";
            }
        }
        else
        {
            // MDで検索
            match = chapter.deadlineElement.value.match(reMD);
            if(match)
            {
                chapter.deadlineElement.label = match[0];
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const d = new Date(today.getFullYear(), Number(match[1])-1, Number(match[2]));
                console.log(`deadline: ${chapter.deadlineElement.value}, date: ${d.toLocaleString('ja')}, today: ${today.toLocaleString('ja')}`);
                if(today.getTime() >= d.getTime())
                {
                    chapter.deadlineElement.isError = true;
                    chapter.deadlineElement.description = "The deadline has reached.";
                }
            }
            else
            {
                // YMDでもMDでもない
                chapter.deadlineElement.isError = true;
                chapter.deadlineElement.label = chapter.deadlineElement.value;
                chapter.deadlineElement.description = "Date format error.";
            }
        }
    }

    /** ファイルサイズの確認を行う */
    private compareFileSize(chapter:Chapter, fsPath:string)
    {
        for(let element of chapter.maximumElements){ this.compareFileSizeRecurse(chapter, fsPath,  true, element); }
        for(let element of chapter.minimumElements){ this.compareFileSizeRecurse(chapter, fsPath, false, element); }
    }

    /** ファイルサイズの確認を行う */
    private async compareFileSizeRecurse(chapter:Chapter, fsPath:string, max:boolean, element:Element)
    {
        let matchKB = element.value.match(/^(\d+)KB$/);
        let matchMB = element.value.match(/^(\d+)MB$/);
        let matchPage = element.value.match(/^(\d+)枚$/);
        let matchChars = element.value.match(/^(\d+)字$/);
        let matchCount = element.value.match(/^(\d+)$/);
        // 末尾が KB
        if(matchKB) {
            let size = Number(matchKB[1]);
            const stat = fs.statSync(fsPath);
            const current = stat.size/1024;
            if(max){
                element.label = `最大 ${matchKB[0]}`;
                if(stat.size > size * 1024) {
                    element.isError = true;
                    element.description = `現在 ${current.toFixed(0)}KB`;
                } else {
                    const remain = ( (size*1024) - stat.size ) / 1024;
                    element.description = `残り ${remain.toFixed(0)}KB`;
                }
            } else {
                element.label = `最小 ${matchKB[0]}`;
                if(stat.size >= size * 1024) {
                    element.description = `現在 ${current.toFixed(0)}KB`;
                } else {
                    const remain = ( (size*1024) - stat.size ) / 1024;
                    element.isError = true;
                    element.description = `現在 ${current.toFixed(0)}KB,  残り ${remain.toFixed(0)}KB`;
                }
            }
        }
        // 末尾が MB
        else if(matchMB)
        {
            let size = Number(matchMB[1]);
            // const stat = fs.statSync(filePath.fsPath);
            const stat = fs.statSync(fsPath);
            const current = stat.size/1024/1024;
            if(max){
                element.label = `最大 ${matchMB[0]}`;
                if(stat.size > size * 1024 * 1024) {
                    element.isError = true;
                    element.description = `現在 ${current.toFixed(0)}MB`;
                } else {
                    const remain = ( (size*1024*1024) - stat.size ) / 1024 / 1024;
                    element.description = `残り ${remain.toFixed(0)}MB`;
                }
            } else {
                element.label = `最小 ${matchMB[0]}`;
                if(stat.size >= size * 1024 * 1024) {
                    element.description = `現在 ${current.toFixed(0)}MB`;
                } else {
                    const remain = ( (size*1024*1024) - stat.size ) / 1024 / 1024;
                    element.isError = true;
                    element.description = `現在 ${current.toFixed(0)}MB, 残り ${remain.toFixed(0)}MB`;
                }
            }
        }

        // 末尾が枚（400字詰め原稿用紙）
        else if(matchPage)
        {
            let page = Number(matchPage[1]);
            let textCount = 0;
            let pageCount = 0;
            let rowCount = 0;
            const col = 20;
            const row = 20;
            const stream = fs.createReadStream(fsPath);
            for await(const line of readline.createInterface({input:stream, crlfDelay: Infinity}))
            {
                textCount += line.length;
                rowCount += Math.ceil(line.length / col);
            }
            pageCount = Math.ceil(rowCount / row);
            // console.log(`length: ${textCount},  page: ${page},  rowCount: ${rowCount},  pageCount: ${pageCount}`);

            if(max){
                element.label = `最大 ${page}枚`;
                if(pageCount > page){
                    element.isError = true;
                    element.description = `現在 ${pageCount}枚（${textCount}字）`;
                } else {
                    const remain = page - pageCount;
                    element.description = `現在 ${pageCount}枚（${textCount}字）,  残り ${remain}枚`;
                }
            } else {
                element.label = `最低 ${page}枚`;
                if(pageCount >= page)
                {
                    element.description = `現在 ${pageCount}枚（${textCount}字）`;
                } else {
                    const remain = page - pageCount;
                    element.isError = true;
                    element.description = `現在 ${pageCount}枚（${textCount}字）,  残り ${remain}枚`;
                }
            }
        }
        
        // 末尾が字、または数字のみ
        else if(matchChars || matchCount)
        {
            const chars = (matchChars)? Number(matchChars[1]): Number(matchCount[1]);
            let textCount = 0;
            const stream = fs.createReadStream(fsPath);
            for await(const line of readline.createInterface({input:stream, crlfDelay: Infinity}))
            {
                textCount += line.length;
            }
            // console.log(`length: ${textCount}, chars: ${chars}`);

            if(max){
                element.label = `最大 ${chars}字`;
                if(textCount > chars){
                    element.isError = true;
                    element.description = `現在 ${textCount}字`;
                } else {
                    const remain = chars - textCount;
                    element.description = `現在 ${textCount}字,  残り ${remain}字`;
                }
            } else {
                element.label = `最低 ${chars}字`;
                if(textCount >= chars){
                    element.description = `現在 ${textCount}字`;
                } else {
                    const remain = chars - textCount;
                    element.isError = true;
                    element.description = `現在 ${textCount}枚,  残り ${remain}字`;
                }
            }
        }
        else
        {
            element.isError = true;
            element.label = 'size format error.';
        }
    }

    /** 条件の確認を行う */
    private async compareCondition(chapter:Chapter, fsPath:string)
    {
        // 指定されている場合のみ処理
        if(chapter.conditionElements.length < 1){ return; }
        
        for(const element of chapter.conditionElements)
        {
            element.label = element.value;
            element.isError = true;
            for await(const line of readline.createInterface({input: fs.createReadStream(fsPath), crlfDelay: Infinity}))
            {
                // マッチすれば終了
                if(line.match(element.value))
                {
                    element.isError = false;
                    break;
                }
            }
            // 表示を更新する
            this._onDidChangeTreeData.fire(undefined);
        }
    }
    
    // /** アクティブなエディタの切り替えイベント */
    // private onActiveEditorChanged(): void
    // {
    // }

    // private onDocumentChanged(changeEvent: vscode.TextDocumentChangeEvent): void
    // {
    // }

    // fileOnChange(file:string)
    // {
    //     console.log('file on change: ', file);
    //     // 一致するchapterを探す
    //     // ※ plot を参照できない
    //     for(const chapter of this.plot.chapters)
    //     {
    //         const filePath = vscode.Uri.joinPath(this.plot.root.uri, chapter.fileElement.value);
    //         if(filePath.fsPath === file)
    //         {
    //             this.compareFileSize(chapter, filePath.fsPath);
    //         }
    //     }
    // }

    /** 分析コマンド */
    analyze(){ analyze(this.context); }
}



