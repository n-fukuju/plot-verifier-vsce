import * as fs from 'fs';
import * as vscode from 'vscode';

import { Plot } from './plot';


/** 読み込み用ファクトリ */
export async function getPlot(refresh=false): Promise<Plot>
{
    const plotFile = getPlotFile();
    if(plotFile){
        let plot = '{"chapters":[]}';
        if(fs.existsSync(plotFile.fsPath))
        {
            const plotData = await vscode.workspace.fs.readFile(plotFile);
            plot = Buffer.from(plotData).toString('utf8');
        } else { console.log('plot ファイルが存在しません。: ', plotFile.fsPath); }

        try{
            const p = new Plot(getWorkspaceFolder(), plotFile, JSON.parse(plot));
            return Promise.resolve(p);
        } catch(e){
            console.log('plot ファイルを開けませんでした。: ', e);
            return Promise.reject('plot ファイルを開けませんでした。');
        }
    }else{
        return Promise.reject('plot ファイルを開けませんでした。');
    }
}

/** 書き込み */
// export async function setPlot(plot:Plot): Promise<void>
// {
//     const plotFile = getPlotFile();
//     if(plotFile)
//     {
//         // 書き込み
//         await vscode.workspace.fs.writeFile(plotFile, Buffer.from(plot.forSerialize()));
//     }
//     else
//     {
//         return Promise.reject('処理できませんでした。');
//     }
// }

/**
 * 設定ファイルのパスを取得する。
 * 取得できなかった場合、undefined
 */
export function getPlotFile(fileName:string='plot.json'):vscode.Uri|undefined
{
    const folder = getFolder();
    if(folder)
    {
        return vscode.Uri.joinPath(vscode.Uri.file(folder), fileName);
    }
}

/**
 * ログのパスを取得する。
 * 取得できなかった場合、undefined
 */
export function getWorkloadFile(fileName:string='plot_workload.json'):vscode.Uri|undefined
{
    const folder = getFolder();
    if(folder)
    {
        return vscode.Uri.joinPath(vscode.Uri.file(folder), fileName);
    }
}

/**
 * ログのパスを取得する。
 * 取得できなかった場合、undefined
 */
export function getWorkloadLogFile(fileName:string='plot_workload_log.json'):vscode.Uri|undefined
{
    const folder = getFolder();
    if(folder)
    {
        return vscode.Uri.joinPath(vscode.Uri.file(folder), fileName);
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