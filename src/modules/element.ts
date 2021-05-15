import { Chapter } from './chapter';

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

export enum ElementType{
    /** 章立て */
    chapter,
    /** ファイル */
    file,
    /** 期日 */
    deadline,
    /** 最小 */
    minimum,
    /** 最大 */
    maximum,
    /** 記述 */
    condition,
}