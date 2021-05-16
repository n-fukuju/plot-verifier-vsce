import * as fs from 'fs';
import * as vscode from 'vscode';

import { Plot } from './plot';


/** 読み込み */
export async function getPlot(refresh=false): Promise<void>
{
    this.plot = null;
    
    const plotFile = this.getPlotFile();
    if(plotFile){
        let plot = '{"chapters":[]}';
        if(fs.existsSync(plotFile.fsPath))
        {
            const plotData = await vscode.workspace.fs.readFile(plotFile);
            plot = Buffer.from(plotData).toString('utf8');
        }
        const p = new Plot(getWorkspaceFolder(), JSON.parse(plot));
        this.plot = p;
        console.log("json.parse(): ", p);
        // ファイル読み込み中に、初回表示が過ぎてしまうため、明示的に呼び出し。
        if(refresh){
            // TODO 呼び出し元で処理
            this._onDidChangeTreeData.fire(undefined);
        }
    }else{
        throw Error('plotファイルを開けませんでした。');
    }
}

export async function setPlot()
{
    // const folder = this.getFolder();
    const plotFile = getPlotFile();
    if(plotFile)
    {
        // 書き込み
        await vscode.workspace.fs.writeFile(plotFile, Buffer.from(this.plot.forSerialize()));
    }
    else
    {
        // TODO 例外throw
        vscode.window.showWarningMessage('開いているフォルダがないため、処理できません。');
    }
}

/**
 * 設定ファイルを取得する
 * 取得できなかった場合、undefined
 */
export function getPlotFile(fileName:string='plot.json'):vscode.Uri|undefined
{
    const folder = getFolder();
    if(folder)
    {
        return vscode.Uri.joinPath(vscode.Uri.file(folder), 'fileName');
    }
}

/**
 * 作業中のフォルダを取得する。
 * 取得できなかった場合、undefined
 */
export function getFolder():string|undefined
{
    return getWorkspaceFolder()?.uri.fsPath;
}

/** VSCodeで開いているフォルダを取得する。 */
function getWorkspaceFolder():vscode.WorkspaceFolder
{
    // 現在開いているエディタのフォルダ
    const editor = vscode.window.activeTextEditor;
    const resource = editor?.document.uri;
    if(resource?.scheme === 'file')
    {
        const folder = vscode.workspace.getWorkspaceFolder(resource);
        if(folder)
        {
            return folder;
        }
    }

    // ワークスペースの先頭フォルダ
    if(vscode.workspace.workspaceFolders?.length > 0)
    {
        return vscode.workspace.workspaceFolders[0];
    }
}