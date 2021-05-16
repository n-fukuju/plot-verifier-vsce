import * as path from 'path';
import * as vscode from 'vscode';

export function getIcon(icon:Icon, context:vscode.ExtensionContext)
{
    switch(icon)
    {
        case Icon.alert:
            return {
                light: context.asAbsolutePath(path.join('resources', 'color', 'alert.svg')),
                dark: context.asAbsolutePath(path.join('resources', 'color', 'alert.svg'))
            };
        case Icon.bug:
            return {
                light: context.asAbsolutePath(path.join('resources', 'light', 'bug.svg')),
                dark: context.asAbsolutePath(path.join('resources', 'dark', 'bug.svg'))
            };
        case Icon.calendar:
            return {
                light: context.asAbsolutePath(path.join('resources', 'light', 'calendar.svg')),
                dark: context.asAbsolutePath(path.join('resources', 'dark', 'calendar.svg'))
            };
        case Icon.check:
            return {
                light: context.asAbsolutePath(path.join('resources', 'light', 'check.svg')),
                dark: context.asAbsolutePath(path.join('resources', 'dark', 'check.svg'))
            };
        case Icon.fountainpen:
            return {
                light: context.asAbsolutePath(path.join('resources', 'light', 'fountainPen.svg')),
                dark: context.asAbsolutePath(path.join('resources', 'dark', 'fountainPen.svg'))
            };
        case Icon.pencil:
            return {
                light: context.asAbsolutePath(path.join('resources', 'light', 'pencil.svg')),
                dark: context.asAbsolutePath(path.join('resources', 'dark', 'pencil.svg'))
            };
        case Icon.quillpen:
            return {
                light: context.asAbsolutePath(path.join('resources', 'light', 'quillPen.svg')),
                dark: context.asAbsolutePath(path.join('resources', 'dark', 'quillPen.svg'))
            };
        case Icon.search:
            return {
                light: context.asAbsolutePath(path.join('resources', 'light', 'search.svg')),
                dark: context.asAbsolutePath(path.join('resources', 'dark', 'search.svg'))
            };
    }
    return null;
}


/** アイコン */
export enum Icon{
    /** アラート */
    alert,
    /** バグ */
    bug,
    /** カレンダー */
    calendar,
    /** チェック */
    check,
    /** 万年筆 */
    fountainpen,
    /** 鉛筆 */
    pencil,
    /** 羽ペン */
    quillpen,
    /** 検索 */
    search,
}