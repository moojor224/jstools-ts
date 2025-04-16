
type FilterStartingWith<Keys, Needle extends string> = (Keys extends `${Needle}${infer _X}` ? Keys : never);
type FunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? K : never }[keyof T];
type ElementProps<T> = Pick<T, keyof Omit<T, FunctionPropertyNames<T>>> & Pick<T, FilterStartingWith<keyof T, "on">>;


/**
 * creates a new element with the specified tag name and properties
 * @param tag tag name of the element to create
 * @param data properties to set on the element
 */
export function createElement<Tag extends keyof HTMLElementTagNameMap>(tag: Tag, data?: Partial<ElementProps<HTMLElementTagNameMap[Tag]>>): HTMLElementTagNameMap[Tag] {
    const el = document.createElement(tag);
    function create(tag: any, data?: Record<any, any>) {
        if (!data) return tag;
        Object.keys(data).forEach((e) => { // loop through object properties
            if (typeof data[e] === "object" && !(e == "ref" && "current" in data[e] && tag instanceof HTMLElement)) { // if value is object, recurse
                createElement(tag[e] || (tag[e] = {}), data[e]);
            } else {
                if (tag instanceof window.Element) { // if tag is an html element
                    if (e.substring(0, 2) == "on" && typeof data[e] == "function") { // if property is an event listener
                        tag.addEventListener(e.substring(2), data[e]); // add event listener
                    } else {
                        (tag as any)[e] = data[e]; // else, set property
                    }
                } else {
                    tag[e] = data[e]; // else, set property
                }
            }
        });
        return tag; // return result
    }
    return create(el, data);
}