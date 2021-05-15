import * as vscode from 'vscode';


export function getPlot(){
    // TODO Plotクラスをファイル化
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