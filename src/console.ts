

/**
 * sets `console.everything` to an array of the console's history\
 * run this before using any console logging functions in order to capture everything
 */

declare global {
    interface Console {
        everything?: Array<any>;
        saveState?: (id?: number) => void;
        restore?: (id?: number) => void;
        [key: string]: any;
    }
}
export function captureConsole() {
    if (console.everything === undefined) {
        console.everything = [];
        if (typeof console.everythin == "undefined") return;
        if (!Array.isArray(console.everything)) return;
        let TS = () => new Date().toLocaleString("sv", { timeZone: 'UTC' }) + "Z"; // timestamp function
        window.onerror = function (error, url, line) { // catches all console errors, includes those not made by console.error
            console.everything?.push({ type: "exception", timeStamp: TS(), value: { error, url, line } });
            return false;
        }
        window.onunhandledrejection = function (e) { // catch some other things, idk
            console.everything?.push({ type: "promiseRejection", timeStamp: TS(), value: e.reason });
        }
        function hookLogType(logType: keyof Console) {
            const original = console[logType].bind(console); // save orginal function
            console["original" + logType] = original;
            return function (...args: any[]) {
                let info = new Error();
                // original.apply(console, [{ info }]);
                console.everything?.push({
                    type: logType,
                    timeStamp: TS(),
                    args: Array.from(args),
                    trace: info.stack?.trim().split("\n").pop(),
                }); // add object to console.everything
                original.apply(console, args); // log message to console
            }
        }
        ['log', 'error', 'warn', 'debug'].forEach(logType => { // hook  each log type
            console[logType] = hookLogType(logType)
        });
        let states = new Map();
        console.saveState = function saveState(id = 0) {
            let everything = [...console.everything as any[]];
            states.set(id, everything);
        }
        console.restore = function restore(id = 0) {
            let everything = states.get(id) || [];
            console.everything = [...everything];
            console.clear();
            // let max = Math.max(...console.everything.map(e => e.trace.length));
            console.everything.forEach(function (log) {
                let original;
                if (original = console["original" + log.type]) {
                    original.apply(console, [...log.args/* , log.trace.padStart(max + 10, " ") + ", ", log.timeStamp */]);
                } else {
                    console.originalerror.apply(console, [...log.args]);
                }
            });
        }
    }
}

type LoggerOptions = Partial<{
    type: "log" | "info" | "warn" | "error";
    baseStyle: string;
    prefix: Partial<{
        enabled: boolean;
        text: string;
        style: string;
    }>;
    brackets: Partial<{
        left: string;
        right: string;
        style: string;
        enabled: boolean;
    }>;
    shouldLog: () => boolean;
}>;
const defaultLoggerOptions: LoggerOptions = {
    type: "log",
    prefix: {
        enabled: false,
        text: "LOG",
        style: "background-color:#7c7c7c;color:white;border-radius:2px;padding:2px;"
    },
    baseStyle: "",
    brackets: {
        left: "[",
        right: "]",
        style: "color:#f0f;font-weight:bold;",
        enabled: false
    },
    shouldLog: () => true
}

function copyObject<T>(obj: T): T {
    const copy = {} as T;
    for (const key in obj) {
        if (typeof obj[key] == "object" && obj[key] !== null) {
            copy[key] = copyObject(obj[key]);
        } else {
            copy[key] = obj[key];
        }
    }
    return copy;
}

function deepExtend(source: any, target: any): typeof source & typeof target {
    for (const key in source) {
        if (target[key] instanceof Object && key in target) {
            target[key] = deepExtend(source[key], target[key]);
        } else {
            target[key] = source[key];
        }
    }
    return target;
}
function complete<A>(a: Partial<A>): A {
    return a as A;
}
const regex = /(?<embed>%[oOdisfc])|(?<raw>(?:[^%]|%[^oOdisfc]|%$)+)/g;
export function customLogger(options: LoggerOptions = defaultLoggerOptions) {
    options = deepExtend(options, copyObject(defaultLoggerOptions));
    const {
        prefix: {
            enabled: enablePrefix,
            text: prefixText,
            style: prefixStyle
        },
        type,
        baseStyle,
        brackets: {
            enabled: enableBrackets,
            left: leftBracket,
            right: rightBracket,
            style: bracketsStyle
        },
        shouldLog
    } = complete(options);
    // pre-parse as much as possible to reduce overhead
    const builder = {
        prefix: enablePrefix ? `%c${prefixText}%c ` : "",
        prefixStyle: enablePrefix ? [prefixStyle, baseStyle] : [],
        leftBracket: enableBrackets ? `%c${leftBracket}%c` : "",
        rightBracket: enableBrackets ? `%c${rightBracket}%c` : "",
        bracketStyle: enableBrackets ? [bracketsStyle, baseStyle] : []
    };
    function parse(args: any[]) {
        if (typeof args[0] !== "string") args.unshift(builder.prefix);
        else args[0] = builder.prefix + args[0];

        const first_arg: string = args.shift();
        const rest_args = builder.prefixStyle.concat([...args]);
        const matches = [...first_arg.matchAll(regex)];
        const first_arg_result: string[] = [];
        const rest_arg_result: any[] = [];

        matches.forEach((match) => {
            const { embed, raw } = match.groups!;
            if (embed) {
                const has_next_embded = rest_args.length > 0;
                const next_embed = rest_args.shift();
                if (embed === "%c") {
                    first_arg_result.push(embed);
                    if (has_next_embded) {
                        rest_arg_result.push(next_embed);
                    }
                } else {
                    first_arg_result.push(builder.leftBracket, embed, builder.rightBracket);
                    rest_arg_result.push(...builder.bracketStyle.concat([next_embed]).concat(builder.bracketStyle));
                }
            } else if (raw) {
                first_arg_result.push(raw);
            }
        });

        const header = first_arg_result.join("");
        const others = rest_arg_result.concat(rest_args);
        if (first_arg_result.length === 0) { return others; }
        return ["%c" + header].concat([baseStyle], others);
    }
    return function (...args: Parameters<typeof console.log>) {
        if (!shouldLog()) return;
        console[type](...parse(args));
    }
}