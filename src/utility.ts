import { createElement } from "./createElement";
//@ts-ignore
import { Prism } from "./lib/prism.js";
//@ts-ignore
import { js_beautify } from "./lib/beautify.js";
import { flattenChildNodes } from "./arrays";

/**
 * @param val
 * @param def
 */
export function getValueOrDefault(val: any | undefined, def: any): any | undefined {
    if (val === undefined || val === null) return def;
    return val;
}

/**
 * puts the properties from source onto target
 */
export function extend<T extends { [key: keyof any]: any }, K extends { [key: keyof any]: any }>(target: T, source: K): T & K {
    Object.keys(source).forEach(key => {
        (target as any)[key] = source[key];
    });
    return target as T & K;
}

/**
 * returns an object whose valueof result will always be synced with the return value of the function
 * @param callback function to call
 * @param args arguments to pass to function
 * @example
 * let val = lockValue(function(){
 *     return Math.floor(Math.random() * 10);
 * });
 * console.log(+val);
 * console.log(+val);
 * console.log(+val);
 * console.log(+val);
 * // logs 4 random numbers
 */
export function lockValue(callback: Function, ...args: any[]) {
    return class {
        constructor() { }
        static valueOf() {
            return callback(...args);
        }
    }
}

/**
 * generates a string template function or smth idk
 * @param strings plain-text strings
 * @param keys keys to interpolate
 * 
 * @example
 * const template = makeTemplate`I'm ${"name"}. I'm almost ${"age"} years old.`;
 * template({ name: "MDN", age: 30 }); // "I'm MDN. I'm almost 30 years old."
 * 
 * @example
 * const template = makeTemplate`I'm ${0}. I'm almost ${1} years old.`;
 * template("MDN", 30); // "I'm MDN. I'm almost 30 years old."
 */
export function makeTemplate(strings: TemplateStringsArray, ...keys: any[]): Function {
    return function (...values: any) {
        const dict = values[values.length - 1] || {};
        const result = [strings[0]];
        keys.forEach((key, i) => {
            const value = Number.isInteger(key) ? values[key] : dict[key];
            result.push(value, strings[i + 1]);
        });
        return result.join("");
    };
}

/**
 * uses JSON.stringify and JSON.parse to copy an object and return the copy\
 * WARNING: do not use on objects that contain recursive references, or an error will be thrown
 * @param obj object to copy
 * @example
 * let obj1 = {
 *     a: 1,
 *     b: 2,
 *     c: 3
 * }
 * let obj2 = copyObject(obj1) // {a: 1, b: 2, c: 3}
 * obj1.a = 4;
 * // obj1 == {a: 4, b: 2, c: 3}
 * // obj2 == {a: 1, b: 2, c: 3}
 */
export function copyObject(obj: Narrow<any>): typeof obj {
    let result = obj;
    var type = {}.toString.call(obj).slice(8, -1);
    if (type == 'Set') return new Set([...obj].map(value => copyObject(value))); // convert list of values to array and copy each value
    if (type == 'Map') return new Map([...obj].map(kv => [copyObject(kv[0]), copyObject(kv[1])])); // convert map to array of key-value pairs and copy each pair
    if (type == 'Date') return new Date(obj.getTime()); // make new date from epoch time
    if (type == 'RegExp') return RegExp(obj.source, obj.flags); // make new regexp from source pattern and flags
    if (type == 'Array' || type == 'Object') { // arrays are just objects whose keys are entirely numeric
        result = Array.isArray(obj) ? [] : {}; // make new array or object
        for (var key in obj) { // loop through each value or key in the object
            result[key] = copyObject(obj[key]); // copy and apply each value or key to the new object
        }
    }
    // any other data types that make it through are pass-by-value, so they don't need to be copied
    return result; // return copied object
}

/**
 * converts an entire string to html entities
 * @param str string to convert
 */
export function toHTMLEntities(str: string): string {
    return str.split("").map(e => `&#${e.charCodeAt(0)};`).join("");
}

const PRISM_CLASSES = [ // list of prism.js classes and their corresponding colors
    [["cdata", "comment", "doctype", "prolog"], "#6a9955"],
    [["constant", "symbol", "tag"], "#4fc1ff"],
    [["number"], "#b5cea8"],
    [["attr-name", "builtin", "char", "inserted", "string"], "#ce9178"],
    [["entity", "url", "variable"], "#f4b73d"],
    [["atrule", "attr-value", "keyword", "boolean"], "#569cd6"],
    [["important", "regex"], "#ee9900"],
    [["deleted"], "#ff0000"],
    [["function"], "#dcdcaa"],
    [["parameter", "property", "function-variable"], "#9cdcfe"],
    [["template-punctuation"], "#ce9178"],
    [["interpolation-punctuation"], "#ffff00"],// "#ff8800"],
    [["punctuation", "operator"], "#ffffff"],
    [["class-name"], "#4ec9b0"],
    [["selector"], "#d7ba7d"],
];


interface LogFormattedConfig {
    embedObjects: boolean;
    collapsed: boolean;
    maxDepth: number;
    label: string;
    raw?: boolean;
    extra_logs?: any[];
    enableCustomFormatters?: boolean;
}
/**
 * logs a syntax-highlighted, formatted version of an object to the console
 * @param object the object to parse
 */
// @ts-ignore
export let logFormatted: {
    (object: any, options?: LogFormattedConfig | { raw: true; }): { html: string; logs: string; styles: string[]; };
} = function (object: any, options = {} as LogFormattedConfig): { html: string; logs: string; styles: string[]; } | undefined {
    let { embedObjects, raw, collapsed, maxDepth, label, extra_logs, enableCustomFormatters } = extend({
        embedObjects: false,
        raw: false,
        collapsed: false,
        maxDepth: Infinity,
        label: "formatted log",
        extra_logs: [],
        enableCustomFormatters: false,
    }, options);
    if (enableCustomFormatters) {
        // use custom formatters to make the object interactive
        console.error("custom formatters not implemented yet");
        return logFormatted(object, { embedObjects, raw, collapsed, maxDepth, label, extra_logs, enableCustomFormatters: false });
    } else {
        let objects: any[] = []; // array that holds list of all objects
        let indentAmount = 1; // number of spaces to indent the stringified object by
        let depth = 0; // current depth
        let embedIndex = 0; // how many characters have been stringified
        let indexes: number[] = []; // array of indexes where objects should be embedded
        /**
         * alternative to JSON.stringify that auto-formats the result and supports functions
         * @param obj object to stringify
         */
        function stringify(obj: any): string {
            if (depth > maxDepth) { // prevent stringifying objects deeper than the max depth
                let str = "'<max depth reached>'";
                embedIndex += str.length
                return str;
            }
            const type = typeof obj; // store type of object
            let pad = " ".repeat(indentAmount * 4); // calulate number of spaces to indent
            if (type == "number" || type == "boolean") { // primitives
                let str = "" + obj; // convert to string
                embedIndex += str.length; // add string length to total characters stringified
                return obj;
            } else if (type == "function") {
                objects.push(obj); // add to list of objects
                let beautified = js_beautify(obj.toString().replaceAll("\r", "")); // beautify function to make tabs equal
                let splitFunc = beautified.split("\n"); // split formatted function by lines
                while (splitFunc.length > 1 && splitFunc[1].length == 0) {
                    splitFunc.splice(1, 1);// remove first line of function body if it's blank (optional)
                }
                let padded = splitFunc.map((e: string, n: number) => (n > 0 ? pad.substring(4) + e : e + " ")); // indent all lines after first to match current indent amount and add space to end of first line
                embedIndex += padded[0].length; // length of first line
                indexes.push(embedIndex);
                embedIndex += (padded.slice(1).join("\n").length + 1); // length of all lines after first line + newline between 1st and 2nd line
                return padded.join("\n"); // rejoin function lines and return
            } else if (type == "string") {
                let quote;
                if (!obj.includes('"')) { // if there are no ", wrap with "
                    quote = '"';
                } else if (!obj.includes("'")) { // otherwise, if no ', wrap with '
                    quote = "'";
                } else if (!obj.includes("`")) {
                    quote = '`'; // otherwise, if no `, wrap with `
                } else {
                    quote = '"'; // otherwise, wrap with "
                }
                [
                    ["\n", "\\n"],
                    ["\r", "\\r"],
                    ["\t", "\\t"],
                    [quote, "\\" + quote], // only escape the quotes that are the same as what the string is wrapped with
                ].forEach(e => {
                    obj = obj.replaceAll(e[0], e[1]); // escape quotes and all escape characters
                });
                let str = `${quote}${obj}${quote}`; // wrap string with quotes
                embedIndex += str.length; // add to stringified character count
                return str;
            } else if (type == "object") {
                if (objects.includes(obj)) { // prevent recursion by checking objects that have already been stringified
                    let str = "<already stringified (recursion prevention)>"; // return plain string
                    embedIndex += str.length; // add to character count
                    indexes.push(embedIndex); // save index
                    return str;
                }
                objects.push(obj); // add to list of objects
                let arr: string[] = []; // make array that stores all of this object's properties
                indentAmount++; // increment indent amount
                depth++; // increment depth

                embedIndex += 2; // opening brace/bracket+space
                indexes.push(embedIndex); // embed object after opening brace/bracket
                embedIndex += (1 + // newline after opening brace/bracket
                    pad.length); // first line pad

                if (Array.isArray(obj)) { // object is an array
                    obj.forEach((item, index) => { // loop through array items
                        let str = stringify(item);
                        arr.push(str);
                        if (index < obj.length - 1) {
                            embedIndex += 2 + // comma+newline
                                pad.length; // next line pad
                        }
                    });
                    indentAmount--; // decrement indent amount
                    depth--; // decrement depth
                    embedIndex += (1 + // newline before closing bracket
                        (pad.length - 4) + // end pad
                        1); // closing bracket
                    return `[ \n${pad + arr.join(",\n" + pad)}\n${pad.substring(4)}]`;
                } else {
                    if (!obj) { // typeof null === "object"
                        embedIndex += 4;
                        return "null";
                    }
                    let entries = Object.entries(obj);
                    entries.forEach(function (kvp, index) {
                        let [key, value] = kvp;
                        embedIndex += key.length + // key length
                            2; // colon+space
                        let str = stringify(value); // convert value to string
                        str = `${key}: ${str}`; // create stringified kvp
                        arr.push(str); // add to array
                        if (index < entries.length - 1) { // only increment for comma/newlines between lines (1 less than the number of entries)
                            embedIndex += 2 + // comma+newline
                                pad.length; // next line pad
                        }
                    });
                    indentAmount--; // decrement indent amount
                    depth--; // decrement depth
                    let returnVal = `{ \n${pad + arr.join(",\n" + pad)}\n${pad.substring(4)}}`;
                    embedIndex += 1 + // newline before closing brace
                        (pad.length - 4) +  // end pad
                        1; // closing brace
                    return returnVal;
                }
            } else {
                let str = "" + obj; // convert to string
                embedIndex += str.length; // add string length to character count
                return str;
            }
        }

        let element = createElement("div", { innerHTML: Prism.highlight(stringify(object), Prism.languages.javascript).replaceAll("%", "%%") }); // syntax-highlight stringified code and put the result into a div
        if (typeof object == "object") element.innerHTML = `let ${label} = ${element.innerHTML}`; // add variable name to the beginning of the message

        const regex = /(?<!%)(%%)*%[co]/g; // regex for matching [co] with odd number of 5 before it

        function calcStyle(element: HTMLElement) { // get calculated color of a text node based off of the classes it has
            if (!element.style) return; // if element isa text node, return
            let classList = [...element.classList]; // convert class list to array
            classList.forEach(clss => { // loop through element classes
                PRISM_CLASSES.forEach(pclass => { // check against each prism.js class
                    if (pclass[0].includes(clss)) element.style.color = pclass[1] + "";
                });
            });
        }

        let logs: string[] = [];
        let styles: string[] = [];
        const flattened = flattenChildNodes(element); // get list of all nodes in element
        flattened.forEach(calcStyle); // manually set style.color for each element based off of its classes
        if (embedObjects) { // objects will be embedded into the console.log statement for better inspection
            let index = 0; // current character index
            let lastPercent = false; // whether the last character was a % (functions as an escape character)
            function count(node: HTMLElement) { // count through each character of the node's textContent and inject a %o
                let text = ""; // processed text
                node.textContent?.split("").forEach(function (char) {
                    if (char == "\r") return; // completely ignore carriage returns
                    if (index == indexes[0]) { // if current character count is where a %o needs to be injected
                        indexes.shift(); // remove the inject index
                        text += "%o"; // inject
                    }
                    if (char == "%" && !lastPercent) lastPercent = true; // next character should be escaped
                    else if (lastPercent) { // if this character should be escaped
                        lastPercent = false; // character has been escaped
                        index++; // increment index
                    } else index++;
                    text += char; // add character to processed text
                });
                node.textContent = text; // set node content to processed text
            }
            flattened.forEach(e => { // loop through all nodes and count through the text nodes
                if (e.nodeName.includes("text")) count(e);
            });
        }

        flattened.forEach(e => { // convert text nodes to console log with interleaved formatting
            if (e.nodeName != "#text") return;
            logs.push(`%c${e.textContent}`); // push formatting tag and textContent
            let color = ""; // set color to default
            if ((e.parentNode as HTMLElement)?.style.color) color = `color:${(e.parentNode as HTMLElement)?.style.color};`; // if parent node has color, set it
            styles.push(color); // add style to list
        });
        const joined_logs = logs.join(""); // join all text nodes into one message

        function regexSplit(string: string) { // splits a string along REGEX and returns both the matches and split string
            let str = [], reg = [], match, lastindex = 0, index;
            while (match = regex.exec(string)) { // while string has match to the regex
                index = match.index;
                let kind = match[0], mod = 0; // kind is the string that was matched
                if (kind.length > 2) { // if match  has more than one %
                    str[str.length - 1] += kind.substring(0, kind.length - 2); // add extra % to previous split string
                    mod = kind.length - 2; // offset index by amount of extra %
                    kind = kind.substring(kind.length - 2);
                }
                str.push(string.substring(((lastindex + 2) > index ? index : (lastindex + 2)), index)); // push string from (end of last match to beginning of this match) to list
                lastindex = index + mod; // offset index
                reg.push(kind); // push %[oc] to matches list
            }
            str.push(string.substring(lastindex + 2)); // add final chunk of string to list of splits
            return { split: str, matches: reg, };
        }

        let { matches, split } = regexSplit(joined_logs), final = [], finalStyles = [];
        function calcObject(obj: any) {
            if (typeof obj == "function" && obj.toString().startsWith("class")) {
                return "";
            }
            return obj;
        }
        while (matches.length > 0) {
            let type = matches.shift(); // get %[oc] from list
            final.push(split.shift() || ""); // add first split string to list
            final.push(type); // push %[oc] to list
            if (type == "%o") finalStyles.push(calcObject(objects.shift())); // if %[oc] is %o, push object
            else finalStyles.push(styles.shift() || ""); // else type is %c, so push style
        }
        while (split.length > 0) final.push(split.shift()); // push all remaining strings
        while (embedObjects && objects.length > 0) finalStyles.push(objects.shift()); // push all remaining objects
        while (styles.length > 0) finalStyles.push(styles.shift()); // push all remaining styles
        function checkExtraLogs() {
            if (extra_logs.length > 0) {
                extra_logs.forEach(e => console.log(e));
            }
        }
        const joined_final = final.join(""); // join array into one message
        if (raw) return { logs: joined_final, styles: finalStyles, html: element.outerHTML } // return raw results without logging to console
        else {
            if (collapsed) { // if console log should be inside collapsed console group
                console.groupCollapsed(label); // create collapsed group
                checkExtraLogs(); // log any extra messages
                console.log(joined_final, ...finalStyles); // log formatted message
                console.groupEnd(); // end group
            } else console.log(joined_final, ...finalStyles); // log formatted message
        }
    }
}
Object.defineProperty(logFormatted, "PRISM_CLASSES", {
    value: PRISM_CLASSES
}); // add prism.js classes to logFormatted function

/**
 * stringifies an object
 * @param obj the object to stringify
 */
export function stringify(obj: any): string {
    let objects: any[] = []; // array that holds list of all objects
    let indentAmount = 1; // number of spaces to indent the stringified object by (don't change this)
    let indentWidth = 4; // width of each indent. change this to change indent width
    let depth = 0; // current depth
    let maxDepth = 100;

    function internal_stringify(obj: any) {
        if (depth > maxDepth) { // prevent stringifying objects deeper than the max depth
            let str = "'<max depth reached>'";
            return str;
        }
        const type = typeof obj; // store type of object
        let pad = " ".repeat(indentAmount * indentWidth); // calulate number of spaces to indent
        if (type == "number" || type == "boolean") { // primitives
            return "" + obj;
        } else if (type == "function") {
            return obj.toString().replaceAll("\r", "").trim();
        } else if (type == "string") {
            let quote;
            if (!obj.includes('"')) { // if there are no ", wrap with "
                quote = '"';
            } else if (!obj.includes("'")) { // otherwise, if no ', wrap with '
                quote = "'";
            } else if (!obj.includes("`")) { // otherwise, if no `, wrap with `
                quote = '`';
            } else { // otherwise, wrap with "
                quote = '"';
            }
            [
                ["\n", "\\n"],
                ["\r", "\\r"],
                ["\t", "\\t"],
                [quote, "\\" + quote], // only escape the quotes that are the same as what the string is wrapped with
            ].forEach(e => {
                obj = obj.replaceAll(e[0], e[1]); // escape quotes and all escape characters
            });
            let str = `${quote}${obj}${quote}`; // wrap string with quotes
            return str;
        } else if (type == "object") {
            if (!obj) { // typeof null === "object"
                return "null";
            }
            if (objects.includes(obj)) { // prevent recursion by checking objects that have already been stringified
                let str = "<already stringified (recursion prevention)>"; // return plain string
                return str;
            }
            objects.push(obj); // add to list of objects
            let arr: string[] = []; // make array that stores all of this object's properties
            indentAmount++; // increment indent amount
            depth++; // increment depth

            if (Array.isArray(obj)) { // object is an array
                obj.forEach((item, index) => { // loop through array items
                    let str = internal_stringify(item);
                    arr.push(str);
                });
                indentAmount--; // decrement indent amount
                depth--; // decrement depth
                return `[ \n${pad + arr.join(",\n" + pad)}\n${pad.substring(4)}]`;
            } else {
                let entries = Object.entries(obj);
                entries.forEach(function (kvp, index) {
                    let [key, value] = kvp;
                    let str = internal_stringify(value); // convert value to string
                    str = `${key}: ${str}`; // create stringified kvp
                    arr.push(str); // add to array
                });
                indentAmount--; // decrement indent amount
                depth--; // decrement depth
                return `{\n${pad + arr.join(",\n" + pad)}\n${pad.substring(4)}}`;
            }
        } else {
            return "" + obj; // just convert to string and return
        }
    }
    return internal_stringify(obj);
}

/**
 * logs and returns an object
 * @param arg
 */
export function logAndReturn(arg: any): typeof arg {
    console.log(arg);
    return arg;
}

/**
 * a set of utility functions to convert times to milliseconds
 */
export let timeConversions = (function () {
    let seconds = (t: number) => t * 1000;
    let minutes = (t: number) => t * seconds(60);
    let hours = (t: number) => t * minutes(60);
    let days = (t: number) => t * hours(24);
    let weeks = (t: number) => t * days(7);
    let years = (t: number) => t * days(365);
    return { seconds, minutes, hours, days, weeks, years };
})();

/**
 * checks if a functon is asynchronous
 * @param func the function to check
 */
export function isAsync(func: Function): boolean {
    const AsyncFunction = (async () => { }).constructor;
    return func instanceof AsyncFunction;
}

export const BULK_OPERATIONS = (function () {
    // @ts-ignore
    if (globalThis.jstools_defined) return;
    class Numbers {
        values: number[];
        constructor(...values: number[]) {
            this.values = values;
        }
    }
    let ops = [
        ["divide", (a: number, b: number) => a / b],
        ["multiply", (a: number, b: number) => a * b],
        ["add", (a: number, b: number) => a + b],
        ["subtract", (a: number, b: number) => a - b],
        ["pow", (a: number, b: number) => a ** b],
        ["mod", (a: number, b: number) => a % b],
    ];
    for (let [name, func] of ops) {
        // @ts-ignore
        Numbers.prototype[name] = function (val) {
            // @ts-ignore
            return new Numbers(...this.values.map(e => func(e, val)));
        };
    }
    class Booleans {
        values: boolean[]
        constructor(...values: boolean[]) {
            this.values = values;
        }
        flip() {
            return new Booleans(...this.values.map(e => !e));
        }
    }
    function makeNewClass(clss: any) {
        let newClass = class { values: any[]; constructor(...values: any[]) { this.values = values; } }
        let methods = Object.getOwnPropertyNames(clss.prototype).sort();
        methods.forEach(m => {
            // @ts-ignore
            newClass.prototype[m] = function (...args) {
                return new newClass(...this.values.map(e => e[m].apply(e, args)));
            }
        });
        return newClass;
    }
    function getTypes(...args: any[]) {
        let types = args.map(e => typeof e);
        let unique = [...new Set(types)];
        if (unique.length == 1) {
            return unique[0];
        }
        return "mixed";
    }
    const Strings = makeNewClass(String);
    const Functions = makeNewClass(Function);
    const Objects = makeNewClass(Object);
    function autodetectClass(type: string) {
        switch (type) {
            case "number": return Numbers;
            case "string": return Strings;
            case "boolean": return Booleans;
            case "object": return Objects;
            case "function": return Functions;
            default: return null;
        }
    }
    return {
        Numbers,
        Strings,
        Booleans,
        Objects,
        Functions,
        autodetect: function (...args: any[]) {
            let type = getTypes(...args);
            return autodetectClass(type);
        }
    };
})();

type NestedBasicAnyArray = (BasicAny | NestedBasicAnyArray)[];
type BasicAny = string | number | boolean;
type Narrow<T> = | (T extends infer U ? U : never)
    | Extract<T, number | string | boolean | bigint | symbol | null | undefined | []>
    | ([T] extends [[]] ? [] : { [K in keyof T]: Narrow<T[K]> })
/**
 * creates a readonly enum from the provided values\
 * type declarations make it so that your IDE will show the original values on hover
 */
export function createEnum<E extends Record<string, BasicAny | NestedBasicAnyArray>>(values: Narrow<E>): E {
    return Object.freeze(Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Symbol(value)]))) as unknown as E;
}

/**
 * this type definition actually somehow works better than createEnum, but it might be a bug so I'm leaving createEnum in
 */
export const createTypedEnum: <E extends Record<string, T>, T>(values: Narrow<E>) => E = createEnum as unknown as typeof createTypedEnum;

/**
 * simple wrapper function for a type declaration
 */
export function createDummyEnum<E extends Record<string, T>, T>(values: Narrow<E>): E {
    return values as E;
}

/**
 * creates a readonly constant from the provided values\
 * type declarations make it so that your IDE will show the original values on hover
 */
export function constant<E extends BasicAny | NestedBasicAnyArray>(val: Narrow<E>): E {
    return Object.freeze(val) as E;
}

export function prismToJSONML(prism: string) {
    let el = document.createElement("div");
    el.innerHTML = prism;
    let jsonml = [];
    function getStyle(node: Element) {
        node.classList.remove("token");
        return "color:" + node.classList[0];
        let style = "";
        PRISM_CLASSES.forEach(pclass => {
            // console.log(pclass[0], node.classList[0]);
            if (pclass[0].includes(node.classList[0])) {
                // console.log("includes");
                style = `color:${pclass[1]}`;
            }
        });
        return style;
    }
    function parse(node: Element): [keyof HTMLElementTagNameMap, { style: string }, ...any] | (string | null) {
        if (node.nodeName == "#text") {
            return node.textContent;
        }
        if (!node.childNodes) {
            console.log(node);
        }
        let children = [...node.childNodes].map(e => parse(e as Element));
        return [node.nodeName.toLowerCase() as keyof HTMLElementTagNameMap, {
            style: getStyle(node),
        }, ...children];
    }
    let parsed = parse(el);
    // console.log("converted", el.outerHTML, "to", JSON.stringify(parsed));
    return parsed;
}

export function wrapInQuotes(str: string) {
    if (!str.includes('"')) return `"${str}"`;
    if (!str.includes("'")) return `'${str}'`;
    if (!str.includes("`")) return `\`${str}\``;
    return `"${str.replaceAll('"', '\\"')}"`;
}

export function getBrowserType() {
    let ua = navigator.userAgent;
    if (ua.includes("Edg")) return "Edge";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Safari")) return "Safari";
    if (ua.includes("Opera")) return "Opera";
    return "Unknown";
}

type JSONML = [keyof HTMLElementTagNameMap, ...any] | string | null;

export function objectToJSONML(obj: any) {
    function parse(obj: any): JSONML {
        if (["string", "boolean", "number"].includes(typeof obj)) {
            return ["span", obj];
        }
        if (Array.isArray(obj)) {
            return obj.map(parse) as JSONML;
        }
        let children = Object.entries(obj).map(([key, value]) => {
            return ["div", ["span", { style: "font-weight:bold" }, key + ": "], parse(value)];
        });
        return ["div", ...children];
    }
    return ["div", parse(obj)];
}

/**
 * gets the sha256 hash of a script
 * @param sourceUrl the source url of the script
 * @example
 * let hash = await hashScript("console.log('hello world')");
 */
export async function hashScript(sourceUrl: string): Promise<string> {
    async function hashText(buffer: BufferSource) {
        return await crypto.subtle.digest("SHA-256", buffer);
    }

    async function integrityMetadata(buffer: BufferSource) {
        const hashBuffer = await hashText(buffer);
        const base64string = btoa(
            String.fromCharCode(...new Uint8Array(hashBuffer))
        );

        return `sha256-${base64string}`;
    }

    async function hash(source: string) {
        const response = await fetch(source);
        const buffer = await response.arrayBuffer();
        const integrity = await integrityMetadata(buffer);
        return integrity;
    }
    return await hash(sourceUrl);
}

/**
 * gets the file and line number of where the getStack function is called
 */
export function getStack(): {
    file: string;
    lineno: string;
    charno: string;
    trace: string[];
} {
    let err = new Error().stack!.replace(/^Error/g, "").trim().split("\n");
    let originalLine = err[2].trim().replace(/^@|^at /g, "");
    let file = originalLine.replace(/:\d+:\d+$/g, "");
    let lindex = originalLine.match(/:(\d+):\d+\)?$/g)![0];
    let line = lindex.match(/(?<=^:)\d+(?=:)/g)![0];
    let char = lindex.match(/\d+(?=\)?$)/g)![0];
    return { file, lineno: line, charno: char, trace: err };
}

/**
 * converts an object to a table
 * @param obj object to convert
 * @param callback callback to call on every value before inserting it into the table
 * @example
 * let obj = {
 *     row1: {
 *         col1: "row1col1",
 *         col2: "row1col2",
 *         col3: "row1col3",
 *     },
 *     row2: {
 *         col1: "row2col1",
 *         col2: "row2col2",
 *         col3: "row2col3",
 *     },
 *     row3: {
 *         col1: "row3col1",
 *         col2: "row3col2",
 *         col3: "row3col3",
 *     }
 * };
 * let table = objectToTable(obj);
 */
export function objectToTable(obj: {[key: string]: {[key: string]: any; }; }, header = "", callback: (colname: string, rowName: string, val: any) => any = (colName, rowName, val) => val): HTMLTableElement {
    let rowKeys = Object.keys(obj);
    let colKeys = Object.keys(obj[rowKeys[0]]);
    let table = createElement("table");
    let thead = createElement("thead");
    let tbody = createElement("tbody");
    table.add(thead, tbody);
    let tr = createElement("tr");
    tr.add(createElement("th", { innerHTML: header }));
    thead.add(tr);
    colKeys.forEach(e => {
        tr.appendChild(createElement("th", { innerHTML: e }));
    });
    rowKeys.forEach(e => {
        tbody.add(createElement("tr").add(createElement("td", {
            innerHTML: e
        }), ...colKeys.map(k => createElement("td", {
            innerHTML: callback(e, k, obj[e][k])
        }))));
    });
    return table;
}
