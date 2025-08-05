interface RecursiveChildren {
    children?: RecursiveChildren[];
    [key: string]: any;
}
/**
 * takes in an object and returns a flattened array of all it's children
 * @param arr object to flatten
 */
export function flattenChildren(arr: RecursiveChildren): any[] {
    let children: any[] = [];
    if (arr.children) {
        children = arr.children;
    }
    return [arr, (children.flatMap((e: RecursiveChildren) => flattenChildren(e)) || [])].flatMap(e => e);
}

/**
 * takes in an HTMLElement and returns an array of all it's descendants
 * @param el element to flatten
 * @returns array of all children
 */
export function flattenChildNodes(el: HTMLElement): HTMLElement[] {
    return [el, ...([...el.childNodes].flatMap((e) => flattenChildNodes(e as HTMLElement)) || [])];
}

/**
 * generates a 2d array
 * @param num the minimum number of items
 */
export function rectangle(num: number): any[][] {
    let height = Math.ceil(Math.sqrt(num));
    let width = height;
    while (height * width - width >= num) {
        height--;
    }
    let arr = new Array(height).fill(0).map(e => new Array(width));
    return arr;
}

/**
 * reshapes a 1d array into a 2d array with the given length and width
 * @param arr the input array
 * @param length 
 * @param width 
 */
export function reshape(arr: any[], length: number, width: number): any[][] {
    arr = [...arr]; // clone array
    let result: any[] = [];
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < length; y++) {
            if (result[x] == undefined) {
                result[x] = [];
            }
            result[x].push(arr.shift());  // change to pop to rotate array by 180°
        }
    }
    return result;
}

/**
 * interleaves arrays
 * @param fill whther to fill arrays with null to match longest array's length
 * @param arrays arrays to interleave
 * @returns interleaved arrays
 */
export function interleaveArrays(fill: boolean, ...arrays: any[]): any[] {
    if (fill) {
        let max = Math.max(...arrays.map(e => e.length)); // get max length of all arrays
        arrays = arrays.map(arr => [...arr, ...new Array(max - arr.length).fill(null)]); // fill all arrays with null so that they're all the same length
    }
    const result: any[] = [];
    while (arrays.filter(e => e.length > 0).length > 0) { // while at least one array still has at least one item in it
        arrays.forEach(arr => { // loop through each array
            if (arr.length > 0) result.push(arr.shift()); // remove first element from array and add it to result array
        });
    }
    return result;
}

Array.prototype.unique = function () {
    return Array.from(new Set(this));
}

class jst_Array<T> {
    private _arr: T[];
    constructor(length: number);
    constructor(...items: T[]);
    constructor(...args: any[]) {
        this._arr = new Array<T>(...args);
        this[Symbol.iterator] = function* () {
            for (var i = 0; i < this._arr.length; i++) {
                yield this._arr[i];
            }
        }
    }
    static from(...args: Parameters<typeof Array.from>): jst_Array<any> {
        const arr = Array.from(...args);
        return new jst_Array().concat(arr);
    }
    static isArray(arg: any): arg is any[] {
        return Array.isArray(arg);
    }
    static of(...args: Parameters<typeof Array.of>): ReturnType<typeof Array.of> {
        return Array.of(...args);
    }
    get length() { return this._arr.length; }
    toString(): string { return this._arr.toString(); }
    toLocaleString(): string { return this._arr.toLocaleString(); }
    pop(): T | undefined { return this._arr.pop(); }
    push(...args: Parameters<InstanceType<typeof Array<T>>["push"]>): jst_Array<T> {
        this._arr.push(...args);
        return this;
    }
    concat(...items: Parameters<InstanceType<typeof Array<T>>["concat"]>): jst_Array<T> {
        const newArr = this._arr.concat(...items);
        const arr = new jst_Array<T>();
        newArr.forEach(e => arr.push(e));
        return arr;
    }
    join(separator?: string): string {
        return this._arr.join(separator);
    }
    reverse(): jst_Array<T> {
        this._arr.reverse();
        return this;
    }
    shift(): T | undefined { return this._arr.shift(); }
    slice(...args: Parameters<InstanceType<typeof Array<T>>["slice"]>): jst_Array<T> {
        const newArr = this._arr.slice(...args);
        const arr = new jst_Array<T>();
        newArr.forEach(e => arr.push(e));
        return arr;
    }
    sort(...args: Parameters<InstanceType<typeof Array<T>>["sort"]>): jst_Array<T> {
        this._arr.sort(...args);
        return this;
    }
    splice(...args: Parameters<InstanceType<typeof Array<T>>["splice"]>): jst_Array<T> {
        this._arr.splice(...args);
        return this;
    }
    unshift(...args: Parameters<InstanceType<typeof Array<T>>["unshift"]>): jst_Array<T> {
        this._arr.unshift(...args);
        return this;
    }
    indexOf(...args: Parameters<InstanceType<typeof Array<T>>["indexOf"]>): number { return this._arr.indexOf(...args); }
    lastIndexOf(...args: Parameters<InstanceType<typeof Array<T>>["indexOf"]>): number { return this._arr.lastIndexOf(...args); }
    every(...args: Parameters<InstanceType<typeof Array<T>>["every"]>) { return this._arr.every(...args); }
    some(...args: Parameters<InstanceType<typeof Array<T>>["some"]>) { return this._arr.some(...args); }
    forEach(...args: Parameters<InstanceType<typeof Array<T>>["forEach"]>): jst_Array<T> {
        this._arr.forEach(...args);
        return this;
    }
    map<K extends any>(callbackfn: (value: T, index: number, array: T[]) => K, thisArg?: any): jst_Array<K> {
        const newArr = this._arr.map(callbackfn, thisArg);
        const arr = new jst_Array<K>();
        newArr.forEach(e => arr.push(e));
        return arr;
    }
    filter(...args: Parameters<InstanceType<typeof Array<T>>["filter"]>): jst_Array<T> {
        const newArr = this._arr.filter(...args);
        const arr = new jst_Array<T>();
        newArr.forEach(e => arr.push(e));
        return arr;
    }
    reduce(...args: Parameters<InstanceType<typeof Array<T>>["reduce"]>) { return this._arr.reduce(...args); }
    reduceRight(...args: Parameters<InstanceType<typeof Array<T>>["reduceRight"]>) { return this._arr.reduceRight(...args); }
    [n: number]: T;
    [Symbol.iterator] = function* () {
        yield 1 as T;
    };
    [Symbol.unscopables] = {
        at: true,
        copyWithin: true,
        entries: true,
        fill: true,
        find: true,
        findIndex: true,
        findLast: true,
        findLastIndex: true,
        flat: true,
        flatMap: true,
        includes: true,
        keys: true,
        toReversed: true,
        toSorted: true,
        toSpliced: true,
        values: true,
    }
}