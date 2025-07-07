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