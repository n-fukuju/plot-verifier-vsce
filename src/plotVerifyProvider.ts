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

    private text: string = '';
    private tree: json.Node;
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
                deadItem.label = element.label;
                deadItem.description = element.description;
                deadItem.iconPath = (element.isError)? this.getIcon(Icon.ALERT): this.getIcon(Icon.CALENDER);
                return deadItem;
            case ElementType.MAXIMUM:
                if(!element.value || element.value == ""){ return null; }
                let maxItem = new vscode.TreeItem(element.value, vscode.TreeItemCollapsibleState.None);
                // maxItem.label = `最大 ${element.value}字`;
                // maxItem.iconPath = this.getIcon(Icon.PENCIL);
                // maxItem.description = "残りn字"
                maxItem.label = element.label;
                maxItem.description = element.description;
                maxItem.iconPath = (element.isError)? this.getIcon(Icon.ALERT): this.getIcon(Icon.PENCIL);
                return maxItem;
            case ElementType.MINIMUM:
                if(!element.value || element.value == ""){ return null; }
                let miniItem = new vscode.TreeItem(element.value, vscode.TreeItemCollapsibleState.None);
                // miniItem.label = `最低 ${element.value}字`
                // miniItem.iconPath = this.getIcon(Icon.PENCIL)
                // miniItem.description = "残りn字"
                miniItem.label = element.label;
                miniItem.description = element.description;
                miniItem.iconPath = (element.isError)? this.getIcon(Icon.PENCIL): this.getIcon(Icon.CHECK);
                return miniItem;
            case ElementType.CONDITION:
                let conItem = new vscode.TreeItem(element.value, vscode.TreeItemCollapsibleState.None);
                // conItem.iconPath = this.getIcon(Icon.SEARCH);
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

    /** ファイルを開く */
    open(element:Element)
    {
        if(element.type != ElementType.CHAPETER){ return; }
        
        const chapter = element.value as Chapter;
        if(chapter)
        {
            const filePath = vscode.Uri.joinPath(this.plot.root.uri, chapter.file);
            if(fs.existsSync(filePath.fsPath))
            {
                vscode.workspace.openTextDocument(filePath.fsPath).then(doc=> {
                    vscode.window.showTextDocument(doc);
                });
            }
        }
    }

    /** 比較検証 */
    private comparePlot()
    {
        if(!this.plot){ return; }

        for(const chapter of this.plot.chapters)
        {
            const filePath = vscode.Uri.joinPath(this.plot.root.uri, chapter.file);
            // console.log(filePath);
            // console.log(filePath.fsPath);
            // ファイル関連
            if(!fs.existsSync(filePath.fsPath))
            {
                chapter.fileElement.isError = true;
                chapter.fileElement.label = path.basename(chapter.file);
                chapter.fileElement.description = "File not found.";
                // ファイルが存在しないChapterは処理しない
                continue;
            }
            else
            {
                chapter.fileElement.label = path.basename(chapter.file, path.extname(chapter.file));
                chapter.fileElement.description = chapter.file;
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
        if(!chapter.deadline){ return; }

        const reYMD = /^(\d{4})[/-]{1}(\d{1,2})[/-]{1}(\d{1,2})/;
        const reMD = /^(\d{1,2})[/-]{1}(\d{1,2})/;
        let match = chapter.deadline.match(reYMD);
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
            console.log(`deadline: ${chapter.deadline}, date: ${d.toLocaleString('ja')}, today: ${today.toLocaleString('ja')}`);
            if(today.getTime() >= d.getTime())
            {
                chapter.deadlineElement.isError = true;
                chapter.deadlineElement.description = "The deadline has reached."
            }
        }
        else
        {
            // MDで検索
            match = chapter.deadline.match(reMD);
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
                console.log(`deadline: ${chapter.deadline}, date: ${d.toLocaleString('ja')}, today: ${today.toLocaleString('ja')}`);
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
                chapter.deadlineElement.description = "Date format error.";
            }
        }
    }

    /** ファイルサイズの確認を行う */
    private compareFileSize(chapter:Chapter, fsPath:string)
    {
        this.compareFileSizeRecurse(chapter, true, fsPath);
        this.compareFileSizeRecurse(chapter, false, fsPath);
    }

    /** ファイルサイズの確認を行う */
    private async compareFileSizeRecurse(chapter:Chapter, max:boolean, fsPath:string)
    {
        // 指定されている場合のみ処理
        if(!(max && chapter.maximum) && !(!max && chapter.minimum)){ return; }

        // const filePath = vscode.Uri.joinPath(this.plot.root.uri, chapter.file);
        const value = (max)? chapter.maximum: chapter.minimum;
        const element = (max)? chapter.maximumElement: chapter.minimumElement;
        
        let matchKB = value.match(/^(\d+)KB$/);
        let matchMB = value.match(/^(\d+)MB$/);
        let matchPage = value.match(/^(\d+)枚$/);
        let matchChars = value.match(/^(\d+)字$/);
        let matchCount = value.match(/^(\d+)$/);
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
    }

    /** 条件の確認を行う */
    private compareCondition(chapter:Chapter, fsPath:string)
    {
        // 指定されている場合のみ処理
        if(!chapter.conditions || !chapter.conditionElements){ return; }

        const text = fs.readFileSync(fsPath).toString('utf8');
        for(const element of chapter.conditionElements)
        {
            let match = text.match(element.value);
            element.label = element.value;
            if(!match)
            {
                element.isError = true;
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

    private async getPlot(refresh=false): Promise<void>
    {
		// ワークスペース内のすべてのルートフォルダ
		// vscode.workspace.workspaceFolders

        this.plot = null;
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
				// ファイル読み込み
                const plotData = await vscode.workspace.fs.readFile(plotFile);
				const plot = Buffer.from(plotData).toString('utf8');
                // vscode.window.showInformationMessage(plot);
                this.text = plot;
                this.tree = json.parseTree(this.text);
                // TODO 切り替え json.parse()
                // JSON処理
                // for(const child of this.tree.children)
                // {
                //     const childPath = json.getLocation(this.text, child.offset).path;
                //     const childNode = json.findNodeAtLocation(this.tree, childPath);
                //     if(childNode)
                //     {
                //         console.log("childNode: ", childNode);
                //         console.log("childNodePath: ", json.getNodePath(childNode));
                //         console.log("childNodeValue: ", json.getNodeValue(childNode));
                //         // TODO 条件コレクション作成
                //     }
                // }

                // const p:Plot = json.parse(this.text);
                const p = new Plot(folder, JSON.parse(this.text));
                this.plot = p;
                console.log("json.parse(): ", p);
                // ファイル読み込み中に、初回表示が過ぎてしまうため、明示的に呼び出し。
                if(refresh){
                    this._onDidChangeTreeData.fire(undefined);
                }
			}
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
            case Icon.PENCIL:
                return {
                    light: this.context.asAbsolutePath(path.join('resources', 'light', 'pencil.svg')),
                    dark: this.context.asAbsolutePath(path.join('resources', 'dark', 'pencil.svg'))
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
    ALERT,
    BUG,
    CALENDER,
    CHECK,
    PENCIL,
    SEARCH,
}
enum ElementType{
    CHAPETER,
    FILE,
    ALERT,
    DEADLINE,
    MAXIMUM,
    MINIMUM,
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
    /** コンストラクタ */
    constructor(type:ElementType, value:any, label:string="", description:string="", isError=false)
    {
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
    title:string;
    /** 概要
     * 
     * 未指定の場合、空白文字
     */
    description:string;
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
        this.title = 'title' in json ? json['title']: "";
        this.description = 'description' in json ? json['description']: "";
        
        // console.log('date: ', d);
        const cs = 'chapters' in json ? json['chapters'] as []: [];
        for(let c of cs)
        {
            this.chapters.push(new Chapter(c));
        }
        for(let c of this.chapters)
        {
            this.chapterElements.push(new Element(ElementType.CHAPETER, c));
        }

        return;
    }
}

/** 章立てクラス */
class Chapter
{
    file:string;
    fileElement:Element;
    // alert:string;
    deadline:string;
    deadlineElement:Element;
    maximum:string;
    maximumElement:Element;
    minimum:string;
    minimumElement:Element;
    conditions:string[];
    conditionElements:Element[]=[];
    properties:Element[]=[];
    constructor(json:object)
    {
        this.file = 'file' in json ? json['file']: null;
        // this.alert = 'alert' in json ? new Date(json['alert']): null;
        // this.deadline = 'deadline' in json ? new Date(json['deadline']): null;
        // this.alert = 'alert' in json ? json['alert']: null;
        this.deadline = 'deadline' in json ? json['deadline']: null;
        this.maximum = 'maximum' in json ? json['maximum']: null;
        this.minimum = 'minimum' in json ? json['minimum']: null;
        this.conditions = 'conditions' in json ? json['conditions'] as []: [];

        this.fileElement = new Element(ElementType.FILE, this.file, this.file);
        this.deadlineElement = new Element(ElementType.DEADLINE, this.deadline);
        this.maximumElement = new Element(ElementType.MAXIMUM, this.maximum);
        this.minimumElement = new Element(ElementType.MINIMUM, this.minimum);
        for(let condition of this.conditions)
        {
            this.conditionElements.push(new Element(ElementType.CONDITION, condition));
        }
        
        this.properties.push(this.fileElement);
        this.properties.push(this.deadlineElement);
        this.properties.push(this.maximumElement);
        this.properties.push(this.minimumElement);
        for(let conditionElement of this.conditionElements)
        {
            this.properties.push(conditionElement);
        }
        return;
    }
}
