import { clear } from "./elements.js";

/**
 * combines a list of selectors or elements into a single object that functions mostly like a single element
 * @param selectors list of selectors or elements
 */
export function bulkElements(...selectors: (HTMLElement | string)[]) {
    let elements: HTMLElement[] = []; // array of elements
    function convertToArray(s: (HTMLElement | string | any)[]) { // recursively flatten arrays, NodeLists, single elements, and strings
        s.forEach(e => {
            if (typeof e == "string") { // array element is a CSS selector
                try {
                    elements.push(...document.querySelectorAll(e) as NodeListOf<HTMLElement>)
                } catch (err) {
                    console.error(e, "is not a valid selector");
                }
            } else if (e instanceof HTMLElement) { // array element is a single element
                elements.push(e);
            } else if (e instanceof NodeList || Array.isArray(e)) { // array element is an array or NodeList
                convertToArray(Array.from(e));
            } else { // array element is not a selector, element, array, or NodeList
                console.error(e, "is not a valid selector or element");
            }
        });
    }
    convertToArray(selectors);
    function makeProxy(property: keyof HTMLElement) {
        return new Proxy({}, {
            get: function (target, prop) {
                return elements.map(e => {
                    const propValue = e[property];
                    if (propValue && typeof propValue === 'object' && prop in propValue) {
                        return (propValue as any)[prop];
                    }
                    return undefined;
                });
            },
            set: function (target, prop, value) {
                elements.forEach(e => {
                    const propValue = e[property];
                    if (propValue && typeof propValue === 'object' && prop in propValue) {
                        (propValue as any)[prop] = value;
                    }
                });
                return true;
            },
        });
    }
    return {
        _elements: elements,
        classList: {
            add: function (...classes: string[]) {
                elements.forEach(e => e.classList.add(...classes));
            },
            remove: function (...classes: string[]) {
                elements.forEach(e => e.classList.remove(...classes));
            },
        },
        style: makeProxy("style"),
        get innerHTML() {
            return elements.map(e => e.innerHTML) as unknown as string;
        },
        set innerHTML(value) {
            elements.forEach(e => e.innerHTML = value);
        },
        clear: function () {
            elements.forEach(e => clear(e));
        }
    };
}