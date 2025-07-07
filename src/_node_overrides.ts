export default function () { // overrides for nodejs
    if (typeof window != "undefined") {
        return; // running in browser, or overrides have already been applied
    }
    function proxy(): any { // create a recursive dummy proxy object
        let t:  any = () => { };
        return new Proxy(t, {
            get: function (target, prop) {
                if (prop == "valueOf") return () => 0;
                if (!(prop in target)) return proxy();
                return target[prop];
            },
            set: function (target, prop, value) {
                target[prop] = value;
                return true;
            },
            apply: function (target, thisArg, argumentsList) {
                return proxy();
            },
            construct: function (target, argumentsList, newTarget) {
                return proxy();
            }
        });
    }
    Object.defineProperty(globalThis, "window", { value: globalThis });
    Object.defineProperty(globalThis, "HTMLElement", { value: proxy() });
    Object.defineProperty(globalThis, "Element", { value: proxy() });
    Object.defineProperty(globalThis, "getComputedStyle", { value: proxy() });
    Object.defineProperty(globalThis, "document", { value: proxy() });
    Object.defineProperty(globalThis, "CSSStyleSheet", { value: proxy() });
    Object.defineProperty(globalThis, "RUNNING_IN_NODE", { value: true });
    if (typeof navigator == "undefined") {
        Object.defineProperty(globalThis, "navigator", { value: proxy() });
        Object.defineProperty(globalThis.navigator, "userAgent", { value: "Node.js" });
    }
};