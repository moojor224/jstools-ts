import override from "./_node_overrides";
import { createElement } from "./createElement.js";
// @ts-ignore
import { Prism } from "./lib/prism.js";
import { extend, getStack, makeTemplate, objectToJSONML, prismToJSONML, wrapInQuotes } from "./utility.js";
import { validStyles } from "./validStyles.js";
override();

const selectorExclusionRegex = /:?:(after|before|hover|link|visited|active|focus(-within)?)/g;

// console.log("validStyles", validStyles.join("\n"));
const checkValidSelector = function (selector: string) {
    selector = selector.trim();
    if (typeof selector != "string") return false;
    if (selector.length == 0) return false;
    try {
        let sheet = new CSSStyleSheet();
        sheet.insertRule(selector + "{}");
        return true;
    } catch (e) {
        return false;
    }
}

export class jst_CSSRule {
    stylesheet: jst_CSSStyleSheet | jst_CSSRule | null = null;

    _style: Partial<CSSStyleDeclaration & { [key: `--${string}`]: string | number | symbol; }> = {};
    style = new Proxy(this._style, {
        get: (target, prop) => {
            return target[prop as keyof CSSStyleDeclaration];
        },
        set: (target, prop, value) => {
            let newName = prop;
            if (typeof prop == "string" && !prop.startsWith("--")) {
                newName = prop.replaceAll(/[A-Z]/g, e => `-${e.toLowerCase()}`);
                if (!validStyles.includes(newName as any)) throw new Error("Invalid style property: " + prop);
            }
            // @ts-ignore
            target[newName] = value;
            this.update();
            return true;
        }
    });
    selector = "";
    stack: Stack | null = null;
    constructor(selector: string, styles: typeof this._style = {}) {
        if (!checkValidSelector(selector) && !globalThis.RUNNING_IN_NODE) throw new Error("Invalid selector: " + selector);
        let givenstyles = Object.entries(styles);
        let invalid = givenstyles.filter(e => !(validStyles.includes(e[0] as any) || e[0].startsWith("--"))).map(e => e[0]).join(", ");
        if (invalid.length > 0) throw new Error("Invalid style properties: " + invalid);
        givenstyles.forEach(e => {
            let changed = e[0].match(/[A-Z]/);
            let newName = e[0].replaceAll(/[A-Z]/g, e => `-${e.toLowerCase()}`); // convert name to valid css notation
            if (changed) {
                if (!validStyles.includes(newName as any)) return;
                // @ts-ignore
                styles[newName] = e[1];
                // @ts-ignore
                delete styles[e[0]];
            }
        });
        extend(this._style, styles);
        this.selector = selector;
        this.stack = getStack();
    }

    /**
     * returns the final selector of this style rule by combining all parent selectors
     */
    computedSelector(join = ",\n"): string {
        let selectorChain = [this.selector];
        let target: jst_CSSRule = this;
        while (target.stylesheet instanceof jst_CSSRule) {
            target = target.stylesheet;
            selectorChain.unshift(target.selector);
        }
        let combined = selectorChain.reduceRight(function (previousValue, currentValue) {
            let result: string[] = [];
            currentValue.split(",").forEach(e => {
                previousValue.split(",").forEach(f => {
                    result.push((e.trim() + " " + f.trim()).trim());
                });
            });
            return result.join(join).trim();
        }, "");
        combined = combined.replaceAll(/ (&|&?(?=[>]))/g, ""); // remove unnecessary spaces and combine selectors that should be combined
        return combined;
    }

    compile(minify: boolean = false): string {
        let selector = this.computedSelector(minify ? "," : ",\n");
        let part, whole, join;
        if (minify) {
            part = makeTemplate`${0}:${1}`;
            whole = makeTemplate`${0}{${1}}${2}`;
            join = ";";
        } else {
            part = makeTemplate`${0}: ${1};`;
            whole = makeTemplate`${0} {\n    ${1}\n}\n\n${2}`;
            join = "\n    ";
        }
        let rules = Object.entries(this._style).map(e => part(...e)).join(join);
        if (rules.length == 0) whole = makeTemplate`${2}`; // if there are no rules, return only the compiled child rules
        return whole(selector, rules, this.sub_rules.map(e => e.compile(minify)).join(""));
    }

    /**
     * force-updates the style of any attached elements and any parent styles
     */
    update() {
        this.attachedElements.forEach(([el]) => {
            extend(el.style, this._style);
        });
        if (this.stylesheet) this.stylesheet.update();
    }

    attachedElements: [HTMLElement, string][] = [];
    /**
     * attaches the rule to an element
     * @param el the elenet to attach the rule to
     */
    attachTo(...el: HTMLElement[]) {
        let rule = this; // save reference to this rule
        function attach(el: HTMLElement) {
            if (!(el instanceof HTMLElement)) return; // only allow html elements
            let style = ""; // the original style
            if (el.hasAttribute("style")) { // if the element has a style attribute
                style = el.getAttribute("style") || ""; // save the style
            }
            rule.attachedElements.push([el, style]); // add the element to the list of attached elements
            extend(el.style, rule._style); // extend the element's style with the rule's style
        }
        el.forEach(e => attach(e)); // loop through given elements
    }

    /**
     * detaches the rule from an element and optionally reverts the element to its original style
     * @param el the element to detach the rule from
     * @param revert whether to revert the element to its original style
     */
    detachFrom(el: HTMLElement, revert: boolean = true) {
        if (!(el instanceof HTMLElement)) return; // only allow html elements
        const found = this.attachedElements.find(e => e[0] == el)!;
        const index = this.attachedElements.indexOf(found); // find the index of the element
        if (index < 0) return; // if the element is not attached, return
        let detachedEl = this.attachedElements.splice(index, 1)[0]; // remove the element from the list
        if (revert) detachedEl[0].style = detachedEl[1]; // if revert is true, revert the element to its original style
    }

    sub_rules: jst_CSSRule[] = [];
    /**
     * adds child rules to the current rule
     * @param rules the ruels to add
     */
    addRules(...rules: jst_CSSRule[]): jst_CSSRule {
        rules.forEach(rule => {
            if (rule instanceof jst_CSSRule) {
                this.sub_rules.push(rule);
                rule.stylesheet = this;
            }
        });
        return this;
    }

    /**
     * looks for a rule in the stylesheet by its selector
     * @param selector the selector to search for
     */
    findRule(selector: string): jst_CSSRule | null {
        return null
    } // placeholder

    /**
     * checks the document to see if the rule is being used
     * @param logResults whether to console.log the results after running
     */
    checkCoverage(logResults: boolean = false): { count: number; elements: HTMLElement[]; rule: jst_CSSRule; } {
        let elements;
        let selector = this.computedSelector();
        try {
            elements = Array.from(document.querySelectorAll(selector.replaceAll(selectorExclusionRegex, "")));
        } catch (err) {
            elements = Array.from(document.querySelectorAll(selector));
        }
        let results = { count: elements.length, elements: elements as HTMLElement[], rule: this };
        if (logResults) {
            console.groupCollapsed("Checking coverage for rule:", this);
            console.log("Found", elements.length, `elements with selector: "${this.computedSelector()}"`);
            if (elements.length > 0) console.log("Elements", elements);
            console.groupEnd();
        }
        return results;
    }
}
type Stack = { file: string, lineno: string, charno: string, trace: string[] };
export class jst_CSSStyleSheet {
    sub_rules: jst_CSSRule[] = [];
    init_stack: Stack | null = null;
    /**
     * creates a new stylesheet
     * @param rules array of rules
     */
    constructor(...rules: jst_CSSRule[]) {
        this.sub_rules = rules.filter(e => e instanceof jst_CSSRule);
        this.init_stack = getStack();
    }

    /**
     * add rules to the stylesheet
     * @param rules the rules to add
     */
    addRules(...rules: jst_CSSRule[]) {
        rules.forEach(rule => {
            if (!(rule instanceof jst_CSSRule)) {
                return;
            }
            this.sub_rules.push(rule);
            if (this.injected) {
                rule.stylesheet = this;
            }
        });
    }

    /** force-updates the stylesheet if it has been injected */
    update() {
        if (this.injected && this.styleElement) {
            this.styleElement.innerHTML = this.compile(true);
        }
    }

    /**
     * compiles the stylesheet into css text
     * @param minify whether to minify the result or not
     */
    compile(minify: boolean = false): string {
        let join = "\n";
        if (minify) join = "";
        let compiled = this.sub_rules.map(e => {
            if (this.injected) {
                e.stylesheet = this;
            }
            return e.compile(minify)
        });
        return compiled.join(join);
    }

    styleElement: HTMLStyleElement | null = null;
    /** whether the stylesheet has been injected */
    injected = false;
    /** whether to inject the stylesheet as a link or a style element */
    link = false;
    /** 
     * injects the stylesheet into the document
     * @param update whether to update the stylesheet if a rule is changed
     * @returns the compiled stylesheet
     */
    inject(update: boolean = false): string {
        if (this.injected) return "";
        let compiled = this.compile(true);
        let sheet = this;
        let style = (function () {
            if (sheet.link) {
                return createElement("link", { rel: "stylesheet", href: "data:text/css;base64," + btoa(compiled) });
            }
            return createElement("style", { innerHTML: compiled });
        })();
        document.head.append(style);
        this.styleElement = style;
        this.injected = true;
        return compiled;
    }

    /**
     * looks for a rule in the stylesheet by its selector
     * @param selector the selector to search for
     */
    findRule(selector: string): jst_CSSRule | null {
        return null
    } // placeholder

    /**
     * checks the webpage to see which css rules in the sheet are currently being used
     * @param logResults whether to console.log the results after running
     */
    checkCoverage(logResults: boolean = false) {
        if (logResults) {
            console.groupCollapsed("Checking coverage for stylesheet", this);
        }
        let coverageResults = this.sub_rules.flatMap(e => flatRule(e)).map(e => e.checkCoverage(logResults));
        let covered = 0, total = coverageResults.length, unused: jst_CSSRule[] = [];
        coverageResults.forEach(e => {
            if (e.count > 0) covered++;
            else unused.push(e.rule);
        });
        if (logResults) {
            console.log(`Coverage: ${covered}/${total} rules covered`);
            if (unused.length > 0) console.log("Unused rules", unused);
            console.groupEnd();
        }
    }

    /** whether the current stylesheet is watching for coverage */
    _watchingCoverage = false;
    _covered: any[] = [];
    _rules: jst_CSSRule[] = [];
    /**
     * tracks which rules in the stylesheet are used at any point during the coverage watch\
     * get the results by calling watchCoverage(false)
     */
    watchCoverage(end = true) {
        if (end && this._watchingCoverage) return; // if already watching, return
        if (!end) {
            this._watchingCoverage = false;
            let results = { covered: this._covered, uncovered: this._rules.filter(e => !this._covered.includes(e)), stats: {} };
            console.log("results", results);
            let stats = {
                covered: results.covered?.length,
                uncovered: results.uncovered.length,
                percentCovered: results.covered.length * 100 / (results.covered.length + results.uncovered.length),
                percentUncovered: results.uncovered.length * 100 / (results.covered.length + results.uncovered.length),
            };
            results.stats = stats;
            return results;
        }
        this._watchingCoverage = true;
        this._rules = this.sub_rules.flatMap(e => flatRule(e));
        this._covered = [];
        let sheet = this;
        let interval = window.setInterval(function () {
            if (!sheet._watchingCoverage) {
                window.clearInterval(interval);
                return;
            }
            let temp: jst_CSSRule[] = [];
            sheet._rules.forEach(rule => {
                if (document.querySelector(rule.computedSelector().replaceAll(selectorExclusionRegex, ""))) {
                    temp.push(rule);
                    sheet._covered.push(rule);
                }
            });
            temp.forEach(rule => {
                sheet._rules.splice(sheet._rules.indexOf(rule), 1);
            });
        });
    }
}

/**
 * @param rule
 */
function flatRule(rule: jst_CSSRule): jst_CSSRule[] {
    let result = [rule];
    rule.sub_rules.forEach(e => result.push(...flatRule(e)));
    return result;
}

/**
 * @param selector
 */
// function findRule(selector: string): jst_CSSRule {
//     let rules: jst_CSSRule[] = this.sub_rules.flatMap(e => flatRule(e));
//     let found = rules.find(rule => {
//         let computed = rule.computedSelector();
//         return computed == selector || computed.split(",").map(e => e.trim()).includes(selector);
//     });
//     return found;
// }
// jst_CSSRule.prototype.findRule = findRule;
// jst_CSSStyleSheet.prototype.findRule = findRule;

if (!Array.isArray(window.devtoolsFormatters)) window.devtoolsFormatters = [];


window.devtoolsFormatters.push({
    label: "jst_CSSStyleSheet",
    header: function (obj) {
        if (obj instanceof jst_CSSStyleSheet) {
            return ["div", { style: "font-weight:bold" }, "jst_CSSStyleSheet"];
        }
        return null;
    },
    hasBody: function (obj: any) {
        return obj instanceof jst_CSSStyleSheet;
    },
    body: function (obj) {
        if (obj instanceof jst_CSSStyleSheet) {
            return ["div", { style: "" }, prismToJSONML(Prism.highlight(obj.compile(), Prism.languages.css as string, "css"))];
        }
        return null;
    }
}, {
    label: "jst_CSSRule",
    hasBody: function (obj) {
        return obj instanceof jst_CSSRule;
    },
    header: function (obj) {
        if (obj instanceof jst_CSSRule) {
            return ["div", { style: "font-weight:bold" }, "jst_CSSRule:" + wrapInQuotes(obj.selector)];
        }
        return null;
    },
    body: function (obj) {
        if (obj instanceof jst_CSSRule) {
            let dat = objectToJSONML(obj.stack);
            return ["div", { style: "font-weight:normal" },
                ["div", {}, ["span", { style: "color:#75bfff" }, "Selector: "], ["span", { style: "color:#ff7de9" }, wrapInQuotes(obj.selector)]],
                ["div", {}, ["span", { style: "color:#75bfff" }, "Computed Selector: "], ["span", { style: "color:#ff7de9" }, wrapInQuotes(obj.computedSelector())]],
                ["div", {}, ["span", { style: "color:#75bfff" }, "Initialized at: "], ["span", { /* style: "color:#a8c7fa" */ }, ["object", {
                    object: {
                        __collapsed: true,
                        __label: "stack",
                        __data: dat,
                        __raw: true,
                    }
                }]]],
                ["div", {}, ["span", { style: "color:#75bfff" }, "compiled:"],
                    ["object", {
                        object: {
                            __collapsed: true,
                            __label: "normal",
                            __data: ["div", { style: "border:1px solid red;padding:5px" }, obj.compile(false)],
                            __raw: true,
                        }
                    }],
                    ["object", {
                        object: {
                            __collapsed: true,
                            __label: "minified",
                            __data: ["div", { style: "border:1px solid red;padding:5px" }, obj.compile(true)],
                            __raw: true,
                        }
                    }],
                ],
                obj.sub_rules.length > 0 ? ["div", {},
                    "Sub Rules:",
                    [
                        "ol",
                        { style: "margin:0" },
                        ...obj.sub_rules.map(e => ["li", { style: "padding:0;margin:0" }, ["object", { object: e }]])
                    ]
                ] : ""
            ];
        }
        return null;
    }
});

if (!("cssText" in CSSStyleSheet.prototype)) {
    Object.defineProperty(CSSStyleSheet.prototype, "cssText", {
        get: function () {
            return Array.from((this as CSSStyleSheet).cssRules).map(rule => rule.cssText || "").join("\n");
        }
    });
}

function camelCaseToHyphen(str: string) {
    return str.replace(/[A-Z]/g, e => `-${e.toLowerCase()}`);
}

/**
 * converts a css object to a string
 * @param object css object to convert to string
 */
export function cssObjToString(object: CSSStyleDeclaration): string {
    return Object.entries(object).map(e => `${camelCaseToHyphen(e[0])}: ${e[1]};`).join("\n");
}