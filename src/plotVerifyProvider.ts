import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as readline from 'readline';
import * as json from 'jsonc-parser';

/** プロット検証ツリープロバイダ */
export class PlotVerifyProvider implements vscode.TreeDataProvider<Element>{

    private _onDidChangeTreeData: vscode.EventEmitter<Element | null> = new vscode.EventEmitter<Element | null>();
    readonly onDidChangeTreeData: vscode.Event<Element | null> = this._onDidChangeTreeData.event;

    // private text: string = '';
    // private tree: json.Node;
    private plot: Plot;
    // private editor: vscode.TextEditor;
    private autoRefresh = true;

    constructor(private context: vscode.ExtensionContext){
        vscode.window.onDidChangeActiveTextEditor(() => this.onActiveEditorChanged());
        vscode.workspace.onDidChangeTextDocument(e => this.onDocumentChanged(e));

        // TODO AutoRefresh を設定から取得する。
        // this.autoRefresh = vscode.workspace.getConfiguration('jsonOutline').get('autorefresh');
		// vscode.workspace.onDidChangeConfiguration(() => {
		// 	this.autoRefresh = vscode.workspace.getConfiguration('jsonOutline').get('autorefresh');
        // });
        // 常時表示
        vscode.commands.executeCommand('setContext', 'plotVerifierEnabled', true);

        // // プロットを読み込み
        // this.getPlot(true);
        // 初回
        this.refresh();
        
        // 初回実行
        // this.onActiveEditorChanged();

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
            if(element.type == ElementType.CHAPETER)
            {
                const chapter:Chapter = element.value as Chapter;
                return Promise.resolve(chapter.properties);
                // const properties:Element[] = [];
                // // 子要素をセット
                // properties.push(new Element(ElementType.FILE, chapter.file));
                // // properties.push(new Element(ElementType.ALERT, chapter.alert));
                // properties.push(new Element(ElementType.DEADLINE, chapter.deadline));
                // properties.push(new Element(ElementType.MAXIMUM, chapter.maximum));
                // properties.push(new Element(ElementType.MINIMUM, chapter.minimum));
                // for(let condition of chapter.conditions)
                // {
                //     properties.push(new Element(ElementType.CONDITION, condition));
                // }
                // return Promise.resolve(properties);
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
            // const chapters:Element[] = [];
            // for(const c of this.plot.chapters)
            // {
            //     const e = new Element(ElementType.CHAPETER, c,);
            //     chapters.push(e);
            // }
            // return Promise.resolve(chapters);
        }
    }

    /** Interface の実装 */
    getTreeItem(element: Element): vscode.TreeItem
    {
        // if(element.type == ElementType.CHAPETER)
        switch(element.type)
        {
            case ElementType.CHAPETER:
                const chapter:Chapter = element.value as Chapter;
                // let chapterItem = new vscode.TreeItem(chapter.file, vscode.TreeItemCollapsibleState.Expanded);
                // item.command = {};
                // chapterItem.iconPath = this.getIcon(Icon.CHECK);
                // chapterItem.tooltip = "tooltip";
                // chapterItem.description = "description";
                const chapterItem = new vscode.TreeItem(chapter.fileElement.label, vscode.TreeItemCollapsibleState.Expanded);
                chapterItem.description = chapter.fileElement.description;
                // 選択アイコン表示用の値。（package.json の、view/item/context）
                chapterItem.contextValue = 'chapter';
                // エラーのある Chapter は子要素を表示しない
                if(chapter.fileElement.isError)
                {
                    chapterItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
                    chapterItem.iconPath = this.getIcon(Icon.ALERT);
                }
                // console.log('chapterItem: ', chapterItem);
                return chapterItem;
        // }
        // else if(element.type == ElementType.FILE)
        // {
            // case ElementType.FILE:
            //     let fileItem = new vscode.TreeItem(element.value, vscode.TreeItemCollapsibleState.None);
            //     return fileItem;
            // case ElementType.ALERT:
            //     let alertItem = new vscode.TreeItem(element.value, vscode.TreeItemCollapsibleState.None);
            //     alertItem.iconPath = this.getIcon(Icon.CALENDER);
            //     return alertItem;
            case ElementType.DEADLINE:
                if(!element.value || element.value == ""){ return null; }
                let deadItem = new vscode.TreeItem(element.value, vscode.TreeItemCollapsibleState.None);
                deadItem.contextValue = 'deadline';
                deadItem.label = element.label;
                deadItem.description = element.description;
                deadItem.iconPath = (element.isError)? this.getIcon(Icon.ALERT): this.getIcon(Icon.CALENDER);
                return deadItem;
            case ElementType.MINIMUM:
                if(!element.value || element.value == ""){ return null; }
                let miniItem = new vscode.TreeItem(element.value, vscode.TreeItemCollapsibleState.None);
                // miniItem.label = `最低 ${element.value}字`
                // miniItem.iconPath = this.getIcon(Icon.PENCIL)
                // miniItem.description = "残りn字"
                miniItem.contextValue = 'minimum';
                miniItem.label = element.label;
                miniItem.description = element.description;
                miniItem.iconPath = (element.isError)? this.getIcon(Icon.QUILLPEN): this.getIcon(Icon.CHECK);
                return miniItem;
            case ElementType.MAXIMUM:
                if(!element.value || element.value == ""){ return null; }
                let maxItem = new vscode.TreeItem(element.value, vscode.TreeItemCollapsibleState.None);
                // maxItem.label = `最大 ${element.value}字`;
                // maxItem.iconPath = this.getIcon(Icon.PENCIL);
                // maxItem.description = "残りn字"
                maxItem.contextValue = 'maximum';
                maxItem.label = element.label;
                maxItem.description = element.description;
                maxItem.iconPath = (element.isError)? this.getIcon(Icon.ALERT): this.getIcon(Icon.QUILLPEN);
                return maxItem;
            case ElementType.CONDITION:
                let conItem = new vscode.TreeItem(element.value, vscode.TreeItemCollapsibleState.None);
                // conItem.iconPath = this.getIcon(Icon.SEARCH);
                conItem.contextValue = 'condition';
                conItem.label = element.label;
                conItem.description = element.description;
                conItem.iconPath = (element.isError)? this.getIcon(Icon.SEARCH): this.getIcon(Icon.CHECK);
                return conItem;
        }
        return null;
    }

    /** 検証を再実行する */
    async refresh()
    {
        await this.getPlot();
        this.comparePlot();
        this._onDidChangeTreeData.fire(undefined);
    }

    /** ファイルを開く
     * @param element ツリー要素
     */
    open(element:Element)
    {
        if(element.type != ElementType.CHAPETER){ return; }
        
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
        const defaultFolder = this.getFolder();
        let defaultUri:vscode.Uri;
        if(defaultFolder) { defaultUri = vscode.Uri.file(defaultFolder); }
        else { vscode.window.showWarningMessage('開いているフォルダがないため、処理できません。'); }

        // ファイル選択
        vscode.window.showOpenDialog({title: "ファイルを選択する", openLabel:"選択", defaultUri:defaultUri}).then(uri=>{
            if(uri && uri[0]){
                // console.log(uri[0].fsPath);
                const folder = this.getFolder();
                if(folder)
                {
                    // フォルダ内のファイルであること
                    if(uri[0].fsPath.substring(0, folder.length) == folder)
                    {
                        // フォルダからの相対パスに変換してツリーに追加
                        const file = uri[0].fsPath.substring(folder.length);
                        this.plot.addChapter(file);

                        // 保存
                        this.setPlot();
                        
                        // 表示を更新
                        this.comparePlot();
                        this._onDidChangeTreeData.fire(undefined);
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
            if(value && value == 'y'){
                // 合致しない要素のみの配列を生成
                const index = this.plot.chapters.indexOf(chapter);
                this.plot.chapters = this.plot.chapters.filter( (e,i)=> i != index);
                this.plot.chapterElements = this.plot.chapterElements.filter( (e,i)=> i != index);
                // 保存、表示更新
                this.setPlot();
                this._onDidChangeTreeData.fire(undefined);
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
                // vscode.window.showInformationMessage(value);
                const chapter:Chapter = element.value as Chapter;
                switch(value)
                {
                    case '期日':
                        chapter.deadlineElement = new Element(chapter, ElementType.DEADLINE, '1970/01/01');
                        chapter.properties.push(chapter.deadlineElement);
                        break;
                    case '最小':
                        const min = new Element(chapter, ElementType.MINIMUM, '1枚');
                        chapter.minimumElements.push(min);
                        chapter.properties.push(min);
                        break;
                    case '最大':
                        const max = new Element(chapter, ElementType.MAXIMUM, '10枚');
                        chapter.maximumElements.push(max);
                        chapter.properties.push(max);
                        break;
                    case '記述':
                        const con = new Element(chapter, ElementType.CONDITION, '記述');
                        chapter.conditionElements.push(con);
                        chapter.properties.push(con);
                        break;
                }
                // 保存、表示更新
                this.setPlot();
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
            case ElementType.DEADLINE:
                placeHolder = 'YYYY/MM/DD';
                break;
            case ElementType.MINIMUM:
            case ElementType.MAXIMUM:
                placeHolder = 'n枚（400字詰めの枚数）、nKB/nMB（ファイルサイズ）、n字/n（文字数）';
                break;
            case ElementType.CONDITION:
                placeHolder = '記述必須のテキスト（正規表現）';
                break;
        }
        vscode.window.showInputBox({placeHolder:placeHolder, value:element.value}).then(value=>{
            if(value)
            {
                element.value = value;
                // 保存、表示更新
                this.setPlot();
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
        this.setPlot();
        this.comparePlot();
        this._onDidChangeTreeData.fire(undefined);
    }

    /** 上へ移動する */
    moveUp(element:Element)
    {
        if(element.type==ElementType.CHAPETER
            ?this.plot.moveUpChapter(element)
            :element.chapter.moveUp(element))
        {
            // 保存、表示更新
            this.setPlot();
            this._onDidChangeTreeData.fire(undefined);
        }else{ vscode.window.showWarningMessage('移動できません(0x0)'); }
    }

    /** 下へ移動する */
    moveDown(element:Element)
    {
        if(element.type==ElementType.CHAPETER
            ?this.plot.moveDownChapter(element)
            :element.chapter.moveDown(element))
        {
            // 保存、表示更新
            this.setPlot();
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
            // console.log(filePath);
            // console.log(filePath.fsPath);
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
            // description に末尾を記述する処理
            // chapter.deadlineElement.description = 
            //     (chapter.deadline.length > chapter.deadlineElement.label.length)
            //     ? chapter.deadline.substring(chapter.deadlineElement.label.length)
            //     : chapter.deadline;

            // Date コンストラクタ引数の Month は 0起点 なので注意
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const d = new Date(Number(match[1]), Number(match[2])-1, Number(match[3]));
            // console.log('match: ', match);
            console.log(`deadline: ${chapter.deadlineElement.value}, date: ${d.toLocaleString('ja')}, today: ${today.toLocaleString('ja')}`);
            if(today.getTime() >= d.getTime())
            {
                chapter.deadlineElement.isError = true;
                chapter.deadlineElement.description = "The deadline has reached."
            }
        }
        else
        {
            // MDで検索
            match = chapter.deadlineElement.value.match(reMD);
            if(match)
            {
                chapter.deadlineElement.label = match[0];
                // chapter.deadlineElement.description = 
                //     (chapter.deadline.length > chapter.deadlineElement.label.length)
                //     ? chapter.deadline.substring(chapter.deadlineElement.label.length)
                //     : chapter.deadline;
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
        // this.compareFileSizeRecurse(chapter, true, fsPath);
        // this.compareFileSizeRecurse(chapter, false, fsPath);
        for(let element of chapter.maximumElements){ this.compareFileSizeRecurse(chapter, fsPath,  true, element); }
        for(let element of chapter.minimumElements){ this.compareFileSizeRecurse(chapter, fsPath, false, element); }
    }

    /** ファイルサイズの確認を行う */
    private async compareFileSizeRecurse(chapter:Chapter, fsPath:string, max:boolean, element:Element)
    {
        // 指定されている場合のみ処理
        // if(!(max && chapter.maximum) && !(!max && chapter.minimum)){ return; }

        // const filePath = vscode.Uri.joinPath(this.plot.root.uri, chapter.file);
        // const value = (max)? chapter.maximum: chapter.minimum;
        // const element = (max)? chapter.maximumElement: chapter.minimumElement;
        
        // let matchKB = value.match(/^(\d+)KB$/);
        // let matchMB = value.match(/^(\d+)MB$/);
        // let matchPage = value.match(/^(\d+)枚$/);
        // let matchChars = value.match(/^(\d+)字$/);
        // let matchCount = value.match(/^(\d+)$/);
        let matchKB = element.value.match(/^(\d+)KB$/);
        let matchMB = element.value.match(/^(\d+)MB$/);
        let matchPage = element.value.match(/^(\d+)枚$/);
        let matchChars = element.value.match(/^(\d+)字$/);
        let matchCount = element.value.match(/^(\d+)$/);
        // 末尾が KB
        if(matchKB) {
            let size = Number(matchKB[1]);
            // const stat = fs.statSync(filePath.fsPath);
            const stat = fs.statSync(fsPath);
            // console.log(`size: ${value}, fssize: ${stat.size}`);
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
                    element.description = `現在 ${current.toFixed(0)}KB,  残り ${remain.toFixed(0)}KB`
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
                    element.description = `現在 ${current.toFixed(0)}MB, 残り ${remain.toFixed(0)}MB`
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
            // let percentage = 0;
            // let percentageStr = "";
            const col = 20;
            const row = 20;
            // const text = fs.readFileSync(fsPath).toString('utf8');
            // for(const line of text.split(os.EOL))
            // {
            //     rowCount += Math.ceil(line.length / col);
            // }
            const stream = fs.createReadStream(fsPath);
            for await(const line of readline.createInterface({input:stream, crlfDelay: Infinity}))
            {
                textCount += line.length;
                rowCount += Math.ceil(line.length / col);
            }
            pageCount = Math.ceil(rowCount / row);
            // percentage = pageCount / page;
            // for(let i=1; i<11; i++){ percentageStr += (percentage * 10 > i)?"#":" "; }
            // console.log(`length: ${text.length},  page: ${page},  rowCount: ${rowCount},  pageCount: ${pageCount}`);
            console.log(`length: ${textCount},  page: ${page},  rowCount: ${rowCount},  pageCount: ${pageCount}`);

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
            // const text = fs.readFileSync(fsPath).toString('utf8');
            const stream = fs.createReadStream(fsPath);
            for await(const line of readline.createInterface({input:stream, crlfDelay: Infinity}))
            {
                textCount += line.length;
            }
            console.log(`length: ${textCount}, chars: ${chars}`);

            if(max){
                element.label = `最大 ${chars}字`;
                if(textCount > chars){
                    element.isError = true;
                    element.description = `現在 ${textCount}字`
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

        // const text = fs.readFileSync(fsPath).toString('utf8');
        // for(const element of chapter.conditionElements)
        // {
        //     let match = text.match(element.value);
        //     element.label = element.value;
        //     if(!match)
        //     {
        //         element.isError = true;
        //     }
        // }
        
        // TODO 毎回ファイル先頭から確認しているので、処理を見直す
        for(const element of chapter.conditionElements)
        {
            // let dt = Date();
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
        }
    }
    
    /** アクティブなエディタの切り替えイベント */
    private onActiveEditorChanged(): void
    {
        // TODO 実装
    }

    private onDocumentChanged(changeEvent: vscode.TextDocumentChangeEvent): void
    {
        // TODO 実装
    }

    /** 読み込み */
    private async getPlot(refresh=false): Promise<void>
    {
		// ワークスペース内のすべてのルートフォルダ
		// vscode.workspace.workspaceFolders

        this.plot = null;
        // TODO フォルダ取得の処理を書き込み側に合わせる
		// 現在開いているエディタのフォルダにアクセスする。
        const editor = vscode.window.activeTextEditor;
		const resource = editor?.document.uri;
		if(resource?.scheme === 'file')
		{
			const folder = vscode.workspace.getWorkspaceFolder(resource);
			console.log('plot-verifier:: activeFolder: ', folder);
			
			if(folder){
				const plotFile = vscode.Uri.joinPath(folder.uri, 'plot.json');
                console.log('plot-verifier:: plot.json:', plotFile);
                // 存在しなければ、空ファイルを作成する
                if(!fs.existsSync(plotFile.fsPath)){
                    fs.writeFileSync(plotFile.fsPath, Plot.forEmpty());
                    vscode.window.showWarningMessage("空の定義ファイルを生成しました（plot.json not found）", plotFile.fsPath);
                }
                
				// ファイル読み込み
                const plotData = await vscode.workspace.fs.readFile(plotFile);
				const plot = Buffer.from(plotData).toString('utf8');
                // vscode.window.showInformationMessage(plot);
                // this.text = plot;
                // this.tree = json.parseTree(this.text);
                // TODO 切り替え json.parse()
                // JSON処理

                // const p:Plot = json.parse(this.text);
                // const p = new Plot(folder, JSON.parse(this.text));
                const p = new Plot(folder, JSON.parse(plot));
                this.plot = p;
                console.log("json.parse(): ", p);
                // ファイル読み込み中に、初回表示が過ぎてしまうため、明示的に呼び出し。
                if(refresh){
                    this._onDidChangeTreeData.fire(undefined);
                }
			}
        }
    }

    /** 書き込み */
    private async setPlot()
    {
        const folder = this.getFolder();
        if(folder)
        {
            // TODO prot.json のパスを共通化する
            const folderUri = vscode.Uri.file(folder);
            const plotFile = vscode.Uri.joinPath(folderUri, 'plot.json');

            // 書き込み
            await vscode.workspace.fs.writeFile(plotFile, Buffer.from(this.plot.forSerialize()));
        }
        else
        {
            vscode.window.showWarningMessage('開いているフォルダがないため、処理できません。');
        }
    }

    /** 
     * 作業中のフォルダーを取得する。
     * 取得できなかった場合、undefined
     */
    getFolder():string|undefined
    {
        // 現在開いているエディタのフォルダ
        const editor = vscode.window.activeTextEditor;
        const resource = editor?.document.uri;
        if(resource?.scheme === 'file')
        {
            const folder = vscode.workspace.getWorkspaceFolder(resource);
            if(folder)
            {
                return folder.uri.fsPath;
            }
        }

        // 現在開いているフォルダの先頭
        if(vscode.workspace.workspaceFolders?.length > 0)
        {
            return vscode.workspace.workspaceFolders[0].uri.fsPath;
        }
    }

    getIcon(icon:Icon)
    {
        switch(icon)
        {
            case Icon.ALERT:
                return {
                    light: this.context.asAbsolutePath(path.join('resources', 'color', 'alert.svg')),
                    dark: this.context.asAbsolutePath(path.join('resources', 'color', 'alert.svg'))
                }
            case Icon.BUG:
                return {
                    light: this.context.asAbsolutePath(path.join('resources', 'light', 'bug.svg')),
                    dark: this.context.asAbsolutePath(path.join('resources', 'dark', 'bug.svg'))
                }
            case Icon.CALENDER:
                return {
                    light: this.context.asAbsolutePath(path.join('resources', 'light', 'calendar.svg')),
                    dark: this.context.asAbsolutePath(path.join('resources', 'dark', 'calendar.svg'))
                }
            case Icon.CHECK:
                return {
                    light: this.context.asAbsolutePath(path.join('resources', 'light', 'check.svg')),
                    dark: this.context.asAbsolutePath(path.join('resources', 'dark', 'check.svg'))
                };
            case Icon.FOUNTAINPEN:
                return {
                    light: this.context.asAbsolutePath(path.join('resources', 'light', 'fountainPen.svg')),
                    dark: this.context.asAbsolutePath(path.join('resources', 'dark', 'fountainPen.svg'))
                };
            case Icon.PENCIL:
                return {
                    light: this.context.asAbsolutePath(path.join('resources', 'light', 'pencil.svg')),
                    dark: this.context.asAbsolutePath(path.join('resources', 'dark', 'pencil.svg'))
                };
            case Icon.QUILLPEN:
                return {
                    light: this.context.asAbsolutePath(path.join('resources', 'light', 'quillPen.svg')),
                    dark: this.context.asAbsolutePath(path.join('resources', 'dark', 'quillPen.svg'))
                };
            case Icon.SEARCH:
                return {
                    light: this.context.asAbsolutePath(path.join('resources', 'light', 'search.svg')),
                    dark: this.context.asAbsolutePath(path.join('resources', 'dark', 'search.svg'))
                };
        }
        return null;
    }
}

enum Icon{
    /** アラート */
    ALERT,
    /** バグ */
    BUG,
    /** カレンダー */
    CALENDER,
    /** チェック */
    CHECK,
    /** 万年筆 */
    FOUNTAINPEN,
    /** 鉛筆 */
    PENCIL,
    /** 羽ペン */
    QUILLPEN,
    /** 検索 */
    SEARCH,
}
enum ElementType{
    CHAPETER,
    FILE,
    DEADLINE,
    MINIMUM,
    MAXIMUM,
    CONDITION,
}
/** ツリービュー要素 */
export class Element
{
    /** 要素タイプ */
    type: ElementType;
    /** 設定値 */
    value: any;
    /** 表示テキスト */
    label: string;
    /** 追加テキスト */
    description: string;
    /** エラー */
    isError: boolean;
    /** 項目から親要素への参照 */
    chapter: Chapter;
    /** コンストラクタ */
    constructor(chapter:Chapter, type:ElementType, value:any, label:string="", description:string="", isError=false)
    {
        this.chapter = chapter;
        this.type = type;
        this.value = value;
        this.label = label;
        this.description = description;
        this.isError = isError;
    }
}


/** プロットを表すクラス */
class Plot
{
    /** タイトル
     * 
     * 未指定の場合、空白文字
     */
    // title:string;
    /** 概要
     * 
     * 未指定の場合、空白文字
     */
    // description:string;
    /** 章立ての一覧 */
    chapters:Chapter[] = [];
    /** 章立て要素の一覧 */
    chapterElements:Element[] = [];

    /** ルートフォルダ */
    root:vscode.WorkspaceFolder;

    /** コンストラクタ */
    constructor(root:vscode.WorkspaceFolder, json:object)
    {
        this.root = root;

        // タイトル、概要は未指定の場合、空白文字
        // this.title = 'title' in json ? json['title']: "";
        // this.description = 'description' in json ? json['description']: "";
        
        // console.log('date: ', d);
        const cs = 'chapters' in json ? json['chapters'] as []: [];
        for(let c of cs)
        {
            this.chapters.push(new Chapter(c));
        }
        for(let c of this.chapters)
        {
            this.chapterElements.push(new Element(c, ElementType.CHAPETER, c));
        }

        return;
    }

    /** シリアライズ用の文字列を返す */
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
    
    /** 空ファイル用の文字列を返す */
    static forEmpty()
    {
        return JSON.stringify({
            // "title": "<タイトル>",
            // "description": "<概要>",
            'chapters': []
        }, null, 4);
    }

    /** chapter を追加する */
    addChapter(path:string)
    {
        // 先頭にスラッシュがついている場合、除去する
        path = path.replace(/^[/\\]+/, '');
        const c = new Chapter({'file':path});
        this.chapters.push(c);
        this.chapterElements.push(new Element(c, ElementType.CHAPETER, c));
    }

    moveUpChapter(chapter:Element):boolean{ return this.moveChapter(chapter,true); }
    moveDownChapter(chapter:Element):boolean{ return this.moveChapter(chapter,false); }
    private moveChapter(chapter:Element, up:boolean):boolean
    {
        let index = this.chapterElements.indexOf(chapter);
        if( (up && index > 0) || (!up && index < this.chapterElements.length-1) )
        {
            // 取り除いてから追加する。
            this.chapterElements = this.chapterElements.filter(x=> x!=chapter);
            let c = this.chapters[index];
            this.chapters = this.chapters.filter( (x,i)=> i!=index);
            this.chapterElements.splice(up?index-1:index+1, 0, chapter);
            this.chapters.splice(up?index-1: index+1, 0, c);
            return true;
        }
        return false;
    }
}

/** 章立てクラス */
class Chapter
{
    // file:string;
    fileElement:Element;
    // alert:string;
    // deadline:string;
    deadlineElement:Element;
    // minimums:string[];
    minimumElements:Element[]=[];
    // maximums:string[];
    maximumElements:Element[]=[];
    // conditions:string[];
    conditionElements:Element[]=[];
    properties:Element[]=[];
    constructor(json:object)
    {
        // this.file = 'file' in json ? json['file']: null;
        const file = 'file' in json ? json['file']: null;
        // this.alert = 'alert' in json ? new Date(json['alert']): null;
        // this.deadline = 'deadline' in json ? new Date(json['deadline']): null;
        // this.alert = 'alert' in json ? json['alert']: null;
        // this.deadline = 'deadline' in json ? json['deadline']: null;
        const deadline = 'deadline' in json ? json['deadline']: undefined;
        // this.minimum = 'minimum' in json ? json['minimum']: null;
        // this.maximum = 'maximum' in json ? json['maximum']: null;
        const minimums = 'minimum' in json ? json['minimum'] as []: [];
        const maximums = 'maximum' in json ? json['maximum'] as []: [];
        const conditions = 'conditions' in json ? json['conditions'] as []: [];

        this.fileElement = new Element(this, ElementType.FILE, file, file);
        this.deadlineElement = new Element(this, ElementType.DEADLINE, deadline);
        // this.minimumElement = new Element(ElementType.MINIMUM, this.minimum);
        // this.maximumElement = new Element(ElementType.MAXIMUM, this.maximum);
        for(let minimum of minimums)
        {
            this.minimumElements.push(new Element(this, ElementType.MINIMUM, minimum));
        }
        for(let maximum of maximums)
        {
            this.maximumElements.push(new Element(this, ElementType.MAXIMUM, maximum));
        }
        for(let condition of conditions)
        {
            this.conditionElements.push(new Element(this, ElementType.CONDITION, condition));
        }
        
        this.properties.push(this.fileElement);
        this.properties.push(this.deadlineElement);
        // this.properties.push(this.minimumElement);
        // this.properties.push(this.maximumElement);
        for(let minimumElement of this.minimumElements)
        {
            this.properties.push(minimumElement);
        }
        for(let maximumElement of this.maximumElements)
        {
            this.properties.push(maximumElement);
        }
        for(let conditionElement of this.conditionElements)
        {
            this.properties.push(conditionElement);
        }
        return;
    }

    /** 項目を削除する */
    removeElement(element:Element)
    {
        switch(element.type)
        {
            case ElementType.DEADLINE:
                this.deadlineElement = undefined;
                this.properties = this.properties.filter(x=> x.type!=ElementType.DEADLINE);
                break;
            case ElementType.MINIMUM:
                this.minimumElements = this.minimumElements.filter(x=> x!=element);
                this.properties = this.properties.filter(x=> x!=element);
                break;
            case ElementType.MAXIMUM:
                this.maximumElements = this.maximumElements.filter(x=> x!=element);
                this.properties = this.properties.filter(x=> x!=element);
                break;
            case ElementType.CONDITION:
                this.conditionElements = this.conditionElements.filter(x=> x!=element);
                this.properties = this.properties.filter(x=> x!=element);
                break;
        }
    }

    moveUp(element:Element):boolean { return this.move(element,true); }
    moveDown(element:Element):boolean { return this.move(element,false); }

    /** リスト内で項目を移動させる */
    private move(element:Element, up:boolean):boolean
    {
        let index1 = -1;
        let index2 = -1;
        switch(element.type)
        {
            case ElementType.MINIMUM:
                index1 = this.minimumElements.indexOf(element);
                if(this.movable(index1, this.minimumElements.length, up))
                {
                    index2 = this.properties.indexOf(element);
                    // 取り除いてから追加する。
                    this.minimumElements = this.minimumElements.filter(x=> x!=element);
                    this.properties = this.properties.filter(x=> x!=element);
                    this.minimumElements.splice(up?index1-1:index1+1, 0, element);
                    this.properties.splice(up?index2-1:index2+1, 0, element);
                    return true;
                }
                break;
            case ElementType.MAXIMUM:
                index1 = this.minimumElements.indexOf(element);
                if(this.movable(index1, this.maximumElements.length, up))
                {
                    index2 = this.properties.indexOf(element);
                    // 取り除いてから追加する。
                    this.maximumElements = this.maximumElements.filter(x=> x!=element);
                    this.properties = this.properties.filter(x=> x!=element);
                    this.maximumElements.splice(up?index1-1:index1+1, 0, element);
                    this.properties.splice(up?index2-1:index2+1, 0, element);
                    return true;
                }
                break;
            case ElementType.CONDITION:
                index1 = this.conditionElements.indexOf(element);
                if(this.movable(index1, this.maximumElements.length, up))
                {
                    index2 = this.properties.indexOf(element);
                    // 取り除いてから追加する。
                    this.conditionElements = this.conditionElements.filter(x=> x!=element);
                    this.properties = this.properties.filter(x=> x!=element);
                    this.conditionElements.splice(up?index1-1:index1+1, 0, element);
                    this.properties.splice(up?index2-1:index2+1, 0, element);
                    return true;
                }
                break;
        }
        return false;
    }

    /** リスト内で移動可能か判定 */
    private movable(index:number, length:number, up:boolean)
    {
        return (up && index > 0) || (!up && index < length-1);
    }
}
