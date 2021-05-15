import { Element, ElementType } from './element';

/** 章立てクラス（監視対象ファイルの抽象化） */
export class Chapter
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
        const file = 'file' in json ? json['file']: null;
        const deadline = 'deadline' in json ? json['deadline']: undefined;
        const minimums = 'minimum' in json ? json['minimum'] as []: [];
        const maximums = 'maximum' in json ? json['maximum'] as []: [];
        const conditions = 'conditions' in json ? json['conditions'] as []: [];

        this.fileElement = new Element(this, ElementType.file, file, file);
        this.deadlineElement = new Element(this, ElementType.deadline, deadline);
        for(let minimum of minimums)
        {
            this.minimumElements.push(new Element(this, ElementType.minimum, minimum));
        }
        for(let maximum of maximums)
        {
            this.maximumElements.push(new Element(this, ElementType.maximum, maximum));
        }
        for(let condition of conditions)
        {
            this.conditionElements.push(new Element(this, ElementType.condition, condition));
        }
        
        this.properties.push(this.fileElement);
        this.properties.push(this.deadlineElement);
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
            case ElementType.deadline:
                this.deadlineElement = undefined;
                this.properties = this.properties.filter(x=> x.type!==ElementType.deadline);
                break;
            case ElementType.minimum:
                this.minimumElements = this.minimumElements.filter(x=> x!==element);
                this.properties = this.properties.filter(x=> x!==element);
                break;
            case ElementType.maximum:
                this.maximumElements = this.maximumElements.filter(x=> x!==element);
                this.properties = this.properties.filter(x=> x!==element);
                break;
            case ElementType.condition:
                this.conditionElements = this.conditionElements.filter(x=> x!==element);
                this.properties = this.properties.filter(x=> x!==element);
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
            case ElementType.minimum:
                index1 = this.minimumElements.indexOf(element);
                if(this.movable(index1, this.minimumElements.length, up))
                {
                    index2 = this.properties.indexOf(element);
                    // 取り除いてから追加する。
                    this.minimumElements = this.minimumElements.filter(x=> x!==element);
                    this.properties = this.properties.filter(x=> x!==element);
                    this.minimumElements.splice(up?index1-1:index1+1, 0, element);
                    this.properties.splice(up?index2-1:index2+1, 0, element);
                    return true;
                }
                break;
            case ElementType.maximum:
                index1 = this.maximumElements.indexOf(element);
                if(this.movable(index1, this.maximumElements.length, up))
                {
                    index2 = this.properties.indexOf(element);
                    // 取り除いてから追加する。
                    this.maximumElements = this.maximumElements.filter(x=> x!==element);
                    this.properties = this.properties.filter(x=> x!==element);
                    this.maximumElements.splice(up?index1-1:index1+1, 0, element);
                    this.properties.splice(up?index2-1:index2+1, 0, element);
                    return true;
                }
                break;
            case ElementType.condition:
                index1 = this.conditionElements.indexOf(element);
                if(this.movable(index1, this.conditionElements.length, up))
                {
                    index2 = this.properties.indexOf(element);
                    // 取り除いてから追加する。
                    this.conditionElements = this.conditionElements.filter(x=> x!==element);
                    this.properties = this.properties.filter(x=> x!==element);
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
