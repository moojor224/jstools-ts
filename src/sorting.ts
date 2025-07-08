import { jst_CSSRule as CSSRule, jst_CSSStyleSheet as CSSStyleSheet } from "./CSS";
import { extend } from "./utility";

/**
 * generates a array sort function that sorts an array of objects by a specified property name
 * @param key name of the property to sort by
 * @returns the sort function
 * @example
 * let People = [
 *     {Name: "Name", Surname: "Surname"},
 *     {Name:"AAA", Surname:"ZZZ"},
 *     {Name: "Name", Surname: "AAA"}
 * ];
 * People.sort(dynamicSort("Name"));
 * People.sort(dynamicSort("Surname"));
 * People.sort(dynamicSort("-Surname"));
 */
export function dynamicSort(key: string): (a: any, b: any) => number {
    let sortOrder = 1; // normal sort order
    if (typeof key === "string" && key.startsWith("-")) { // if key starts with a -
        sortOrder = -1; // reversed sort order
        key = key.substring(1); // remove minus from key
    }
    return function (a, b) { // use this function in array.sort(func); to sort it by the given key
        let result = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;  // run comparison and set result to -1,0,1
        return result * sortOrder; // if sortOrder is reversed, this will return 1,0,-1
    };
}

/**
 * generates an array sort function that can sort by object properties with optional fallback properties if two values have the same property value\
 * each given property can also have period-separated nested property names for advanced sorting\
 * adding a minus before any property name will reverse the sort order for that property
 * @param properties list of properties to sort by
 * @example
 * let func = advancedDynamicSort("a", "b");
 * [
 *     {a: 1, b: 2},
 *     {a: 0, b: 3},
 *     {a: 1, b: 1},
 *     {a: 0, b: 1},
 * ].sort(func);
 * result = [
 *     {a: 0, b: 1},
 *     {a: 0, b: 3},
 *     {a: 1, b: 1},
 *     {a: 1, b: 2},
 * ];
 */
export function advancedDynamicSort(...properties: string[]): (a: any, b: any) => number {
    if (properties.length < 1) throw new Error("No properties given to sort by");
    // let w = (d, b) => d() ? (b(), w(d, b)) : 0;
    function dSort(property: string): (a: any, b: any) => number {
        let splitProperty = property.split(".");
        function compare(a: any, b: any, chain: string[]): number {
            // console.log("comparing", a, b, chain);
            let p = chain[0].trim(), // remove whitespace from property name
                sortOrder = 1; // ascending sort order
            if (p[0] == "-") { // reverse the sort order
                sortOrder = -1; // descending sort order
                p = p.substring(1); // remove the minus sign
            }
            // if anything is undefined, or no more properties left in the chain
            if (a[p] === undefined || b[p] === undefined || chain.length == 1) return sortOrder * (a[p] < b[p] ? -1 : a[p] > b[p] ? 1 : 0);
            // if there is more than one property left in the chain
            if (chain.length > 1) return compare(a[p], b[p], chain.slice(1));
            return 0;
        }
        return (a: any, b: any) => compare(a, b, splitProperty); // return callable compare function
    }
    let compares = properties.map(e => dSort(e)); // pre-generate top-level compare functions for increased sorting performance
    return function (a: any, b: any) { // return callable sort function
        let funcs = [...compares], // get copy of compare functions array
            result: number; // stores compare function result (-1,0,1)
        // result = funcs.shift()(a, b);
        // w(_ => result == 0 && funcs.length > 0, _ => result = funcs.shift()(a, b));
        do { // loop through each comparison function until one object is found to be different
            result = funcs.shift()!(a, b); // get the next available comparison function and call it with both objects
        } while (result == 0 && funcs.length > 0);
        return result as number;
    };
}

const defaultSortStyles = new CSSStyleSheet(
    new CSSRule(".sortable", {
        cursor: "pointer",
        userSelect: "none"
    }),
    new CSSRule(".sortable.sort-asc:after", {
        content: '" ▲"'
    }),
    new CSSRule(".sortable.sort-desc:after", {
        content: '" ▼"'
    })
);

/**
 * makes an html table sortable by clicking on the headers
 * @param table the table to make sortable
 * @param options the options for the sorting
 */
export function makeTableSortable(table: HTMLTableElement, options: {
    footers?: number;
    func?: (val: string) => any;
    injectDefaultStyles?: boolean;
} = {} as typeof options) {
    if (table.classList.contains("sortable")) return;
    table.classList.add("sortable");
    let lastColumn: HTMLElement | null = null;
    options = extend({
        footers: 0,
        func: (val: any) => val,
        injectDefaultStyles: true
    }, options);
    let { footers, func, injectDefaultStyles } = options;
    if (injectDefaultStyles && !defaultSortStyles.injected) defaultSortStyles.inject();
    let headers = Array.from(table.tHead?.rows[0].cells || []);
    headers.forEach((header, i) => {
        header.classList.add("sortable");
        header.classList.remove("sort-asc");
        header.classList.remove("sort-desc");
        header.addEventListener("click", () => {
            if (lastColumn !== header) {
                lastColumn?.classList.remove("sort-asc");
                lastColumn?.classList.remove("sort-desc");
                lastColumn = header;
            }
            let sortDir = "-";
            if (header.classList.contains("sort-asc")) {
                header.classList.remove("sort-asc");
                header.classList.add("sort-desc");
                sortDir = "";
            } else if (header.classList.contains("sort-desc")) {
                header.classList.remove("sort-desc");
                header.classList.add("sort-asc");
            } else {
                header.classList.add("sort-asc");
            }
            let rows = Array.from(table.tBodies[0].rows);
            if (typeof footers == "number") {
                for (let i = 0; i < footers; i++) {
                    rows.pop();
                }
            }
            let sortFunc = advancedDynamicSort(`${sortDir}1`);
            if (!func) return;
            let newRows = rows.map(e => [e, func(e.cells[i].textContent || "")]);
            newRows.sort(sortFunc);
            newRows.forEach(row => table.tBodies[0].insertAdjacentElement("afterbegin", row[0]));
        });
    });
}