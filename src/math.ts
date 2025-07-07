/**
 * rounds a number {v} to the nearest multiple of {t}
 * @param v the value to round
 * @param t the multiple to round to
 */
export function roundf(v: number, t: number): number {
    return Math.round(v / t) * t;
}
Math.roundf = roundf;

/**
 * proportionately maps a number from an input range to an output range
 * @param x value
 * @param inmin input range lower bound
 * @param inmax input range upper bound
 * @param outmin output range lower bound
 * @param outmax output range upper bound
 * @param cmp whether to clamp the input value to the input range
 */
export function map(x: number, inmin: number, inmax: number, outmin: number, outmax: number, cmp: boolean = false): number {
    return ((cmp ? clamp(x, inmin, inmax) : x) - inmin) * (outmax - outmin) / (inmax - inmin) + outmin;
}
Math.map = map;

/**
 * clamps a number to a range\
 * \
 * if the number is outside the range, move it to the\
 * closest position inside the range, else do nothing
 * @param val value
 * @param min minimum of range
 * @param max maximum of range
 * @returns number clamped to range
 */
export function clamp(val: number, min: number, max: number): number {
    // note:                      v------this------v   v----and this----v   are used to get the min/max values, even if min > max
    return Math.max(Math.min(val, Math.max(min, max)), Math.min(min, max));
}
Math.clamp = clamp;

/**
 * generate a random number within a range
 * @param min min value of range
 * @param max max value of range
 */
export function rand(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}
Math.rand = rand;

export function range(start: number): number[];
export function range(start: number, stop: number): number[];
export function range(start: number, stop: number, step: number): number[];
/**
 * generate a range of numbers. functionally the same as python's range function
 * @param start range start
 * @param stop range end
 * @param step step between numbers
 */
export function range(start: number, stop?: number, step?: number) {
    let args = [start, stop, step].filter(e => typeof e != "undefined");
    if (args.length == 1) return range(0, args[0], 1);
    if (args.length == 2) return range(args[0], args[1], 1);
    let arr = [];
    for (let i = args[0]; i < args[1]; i += args[2]) arr.push(i);
    return arr;
    // let obj = Object.fromEntries(arr);
    // obj[Symbol.iterator] = function* () {
    //     for (let i = 0; i < arr.length; i++) yield arr[i][0];
    // }
    // return new Proxy(obj, {
    //     ownKeys: () => arr.map(e => e[0] + ""),
    //     get: (target, prop) => {
    //         console.log("get", prop);
    //         return target[prop];
    //     },
    // });
}
Object.defineProperty(Math, "range", {
    value: range
});