import React from "react";
import { createElement } from "./createElement.js";
import { DevtoolsFormatter, Narrow } from "./types.js";
import { extend } from "./utility.js";
const { useState, useEffect } = React;

if (!Array.isArray(window.devtoolsFormatters)) {
    window.devtoolsFormatters = [];
}

let settingsFormatter: DevtoolsFormatter = {
    label: "settings formatter",
    header: function (obj) {
        if (obj instanceof Settings) { // return header if object is a Settings object
            return ['div', { style: 'font-weight:bold;' }, `Settings: `, ["span", { style: "font-style:italic;" }, obj.config.name]];
        }
        return null;
    },
    hasBody: function (obj) {
        return obj instanceof Settings;
    },
    body: function (obj) {
        if (obj instanceof Settings) {
            return ["div", {}, ...obj.sections.map(section => {
                return [
                    "div",
                    ["object", {
                        object: section // embed section object
                    }]
                ]
            })];
        }
        return null;
    }
};
if (!window.devtoolsFormatters.includes(settingsFormatter)) { // only add one instance of the formatter
    window.devtoolsFormatters.push(settingsFormatter);
}

interface SettingsConfig {
    name?: string;
}

export class Settings {
    config: SettingsConfig = {};
    sections: Section[] = [];
    constructor(config: typeof this.config = {}, sections: Section[] = []) {
        extend(this.config, config); // apply config to this
        if (!Array.isArray(sections)) { // turn sections into array if it isn't already
            sections = [sections];
        }
        this.sections = sections.filter(e => e instanceof Section); // filter all non-Section elements out of sections array
        sections.forEach(section => {
            if (section instanceof Section) {
                section.settings_obj = this; // set parent object of each section
            }
        });
    }

    render(): HTMLDivElement {
        // devlog("render settings");
        let div = createElement("div", { // main settings div
            className: "settings"
        }).add(
            createElement("h2", { innerHTML: this.config.name })
        );
        div.add(...this.sections.map(s => s.render())); // render all subsections and add them to the settings div
        return div;
    }

    getSection(id: string): Section | undefined {
        return this.sections.find(e => e.config.id == id);
    }

    export(): string {
        return JSON.stringify(Object.fromEntries(this.sections.map(e => ([e.config.id, Object.fromEntries(e.options.map(e => [e.config.id, e.config.value]))]))));
    }

    import(data: string): void {
        let json = JSON.parse(data);
        this.sections.forEach(section => {
            section.options.forEach(option => {
                if (section.config.id || "" in json) {
                    if (option.config.id in json[section.config.id || ""]) {
                        option.value = json[section.config.id || ""][option.config.id];
                    }
                }
            });
        });
    }

    #eventListeners: Record<string, Function[]> = {};
    dispatchEvent(event: Event): boolean {
        let cont = true;
        if (this.#eventListeners[event.type]) {
            for (let i = 0; i < this.#eventListeners[event.type].length; i++) {
                let c = this.#eventListeners[event.type][i](event);
                if (event.defaultPrevented || (!c && c != undefined)) {
                    cont = false;
                    break;
                }
            }
        }
        return !event.defaultPrevented && cont;
    }

    on<K extends keyof OptionEventsMap<keyof OptionTypes>>(type: K, callback: (event: OptionEventsMap<keyof OptionTypes>[K]) => any) {
        if (!this.#eventListeners[type]) this.#eventListeners[type] = [];
        this.#eventListeners[type].push(callback);
    }

    off(type: string, callback: Function) {
        if (this.#eventListeners[type]) this.#eventListeners[type].splice(this.#eventListeners[type].indexOf(callback), 1);
    }

    bindToReactElement<T extends any[]>(
        callback: (settings: this, ...args: T) => HTMLElement = (((settings: this, ...args: T) => { }) as typeof callback),
        args: Narrow<T> = [] as Narrow<T>
    ) {
        let settings = this;
        function Component() {
            const [value, setValue] = useState(0);
            useEffect(() => { // listen for changes to option's value
                function changeListener() {
                    setValue(value + 1); // ensure value is different to enforce re-render
                }
                settings.on("change", changeListener); // listen for changes
                return () => settings.off("change", changeListener); // stop listening when component reloads
            });
            let listeners: any[] = [];
            let old = HTMLElement.prototype.addEventListener;
            HTMLElement.prototype.addEventListener = function (...args: any[]) {
                listeners.push([this, args]);
                old.apply(this, args as [string, EventListenerOrEventListenerObject, (boolean | AddEventListenerOptions)?]);
            }
            // @ts-ignore
            let result = callback.apply(settings, [settings].concat(args));
            if (!(result instanceof HTMLElement)) {
                result = createElement("span").add(result);
            }
            let reactNode = result;
            HTMLElement.prototype.addEventListener = old;
            return reactNode.toReactElement(listeners);
        }
        return React.createElement(Component);
    }
}

let sectionFormatter: DevtoolsFormatter = {
    label: "section formatter",
    header: function (obj) {
        if (obj instanceof Section) { // return header if object is a Section object
            return ["div", { // main wrapper div
                style: "border:1px solid #000;border-radius:9px;padding-top:10px;background-color:#454d55;width:300px;color:white"
            }, ["div", { style: "padding:0 10px;display: block;font-size:1.5em;font-weight:bold;margin-block-start:.83em;margin-block-end:.83em" }, obj.config.name], // "h2"
                ...obj.options.map(option => { // each option
                    return [
                        "div", // "label"
                        { style: "border-top:1px solid #000;width:100%;display:flex;justify-content:space-between;padding:10px;box-sizing:border-box;-webkit-user-select:none;-moz-user-select:none;user-select:none;" },
                        ["span", {}, option.config.name],
                        ["div", {}, ["span", { style: "float:right" }, (function () {
                            if (Array.isArray(option.config.values)) {
                                return ["object", {
                                    object: { // dropdown list of values
                                        __expandable: true,
                                        title: option.config.value,
                                        contents: [
                                            ...option.config.values.map(e => ["div", {}, e])
                                        ]
                                    }
                                }];
                            }
                            return option.config.value + "";
                        })()]]
                    ];
                })
            ];
        } else if (obj.__expandable) {
            return ["div", {}, obj.title || "custom object"];
        }
        return null;
    },
    hasBody: function (obj) {
        if (obj.__expandable) {
            return true;
        }
        return false;
    },
    body: function (obj) {
        if (obj.__expandable) {
            return ["div", {}, ...obj.contents]
        }
    }
};
if (!window.devtoolsFormatters.includes(sectionFormatter)) { // only add one instance of the formatter
    window.devtoolsFormatters.push(sectionFormatter);
}
interface SectionConfig {
    name: string;
    id: string;
}
export class Section {
    settings_obj: Settings | null = null;
    config: Partial<SectionConfig> = {};
    options: Option<any>[] = [];

    constructor(config: SectionConfig, options: Option<any>[] = []) {
        this.config = extend({
            name: "section",
            id: "section"
        }, config); // apply config to this
        if (!Array.isArray(options)) { // turn options into array if it isn't one already
            options = [options];
        }
        this.options = options.filter(e => e instanceof Option); // remove all non-Option items from array
        options.forEach(option => {
            if (option instanceof Option) {
                option.section_obj = this; // set parent object for each option
            }
        });
    }

    getOption(id: string): Option<keyof OptionTypes> | undefined { // returns the section object with the given id
        return this.options.find(e => e.config.id == id);
    }

    render(): HTMLElement {
        // devlog("render section");
        let section = createElement("section").add(
            createElement("h2", { innerHTML: this.config.name }) // section title
        );
        section.add(...this.options.map(o => o.render())); // render all options in this section
        return section;
    }

    #eventListeners: Record<string, Function[]> = {};
    dispatchEvent(event: Event): boolean {
        let cont = true;
        if (this.#eventListeners[event.type]) {
            for (let i = 0; i < this.#eventListeners[event.type].length; i++) {
                let c = this.#eventListeners[event.type][i](event);
                if (event.defaultPrevented || (!c && c != undefined)) {
                    cont = false;
                    break;
                }
            }
        }
        let settings = this.settings_obj;
        let parent_cont = true;
        if(settings && !event.defaultPrevented && cont) {
            parent_cont = !!settings.dispatchEvent(event);
        }
        return !event.defaultPrevented && cont && parent_cont;
        return (!event.defaultPrevented && cont) ? this.settings_obj?.dispatchEvent(event) || false : false;
    }

    on<K extends keyof OptionEventsMap<keyof OptionTypes>>(type: K, callback: (event: OptionEventsMap<keyof OptionTypes>[K]) => any) {
        if (!this.#eventListeners[type]) this.#eventListeners[type] = [];
        this.#eventListeners[type].push(callback);
    }

    off(type: string, callback: Function) {
        if (this.#eventListeners[type]) this.#eventListeners[type].splice(this.#eventListeners[type].indexOf(callback), 1);
    }
}

type OptionTypes = {
    "dropdown": string;
    "toggle": boolean;
    "list": { [key: string]: boolean };
    "text": string;
}

type OptionInputTypes = {
    "dropdown": HTMLSelectElement;
    "toggle": HTMLInputElement;
    "list": HTMLDivElement;
    "text": HTMLInputElement;
}

interface OptionConfig<T extends keyof OptionTypes> {
    name: string;
    type: T;
    value?: OptionTypes[T];
    values?: OptionTypes[T][];
    id: string;
    maxHeight?: string;
    input?: OptionInputTypes[T];
}

interface OptionEventsMap<T extends keyof OptionTypes> {
    "change": {
        val: OptionTypes[T];
        opt: Option<T>;
        cont: boolean;
    } & Event;
}



export class Option<T extends (keyof OptionTypes | keyof OptionInputTypes)> {
    config: OptionConfig<T> = {
        name: "option",
        type: "toggle" as T,
        value: false,
        maxHeight: "calc(infinity + 1px)"
    } as unknown as OptionConfig<T>;
    constructor(config: OptionConfig<T>) {
        extend(this.config, config); // apply config to this
        // @ts-ignore
        if (config.value == undefined && config.values) { // if value is not specified, set value to first value in values
            // @ts-ignore
            this.config.value = config.values[0];
        }
    }
    get value(): OptionTypes[T] {
        return this.config.value as OptionTypes[T];
    }
    set value(val: OptionTypes[T]) {
        this.config.value = val;
        if (this.config.input) {
            if (this.config.type == "toggle") {
                (this.config.input as HTMLInputElement).checked = val as boolean;
            } else if (this.config.type == "dropdown" || this.config.type == "text") {
                (this.config.input as HTMLSelectElement).value = val as string;
            } else if (this.config.type == "list") {
                let options = Object.keys(val);
                options.forEach(e => {
                    let i = this.config.input?.querySelector(`input[name="${e}"]`);
                    if (i) {
                        (i as HTMLInputElement).checked = (val as {
                            [key: string]: boolean;
                        })[e];
                    }
                });
            }
        }
    }
    /** the parent section object, if it exists */
    section_obj: Section | null = null;
    /** creates an HTML element containing the input method defined by config.type */
    createInput(): OptionInputTypes[T] {
        let input: any; // initialize variable
        let option = this; // save reference to this
        if (this.config.type == "toggle") { // standard on/off toggle
            input = createElement("input", {
                type: "checkbox",
                className: "slider", // pure css toggle switch
                checked: !!option.config.value
            });
        } else if (this.config.type == "dropdown") {
            input = createElement("select");
            let values = [];
            if (this.config.values || (!["undefined", "null"].includes(typeof this.config.values))) { // if list of values is defined
                if (!Array.isArray(this.config.values)) { // if values is not an array, make it one
                    this.config.values = [this.config.values as any];
                }
                values.push(...this.config.values); // add defined values to list
            }
            values = Array.from(new Set(values)); // remove duplicates
            // input.add(...args);
            values.forEach(v => input.add(createElement("option", {
                innerHTML: v + ""
            })));
            // if specified value is not in the list of predefined values, add it as a placeholder
            if (this.config.value && !this.config.values?.includes(this.config.value)) {
                input.insertAdjacentElement("afterBegin", createElement("option", { // insert option element at beginning of select list
                    innerHTML: this.config.value as string,
                    value: this.config.value as string,
                    hidden: true, // visually hide placeholder from dropdown
                    disabled: true // prevent user from selecting it
                }));
            }
            input.value = this.config.value || (this.config.values as any[])[0];
        } else if (this.config.type == "list") {
            input = createElement("div");
            let options = Object.keys(option.config.value as object);
            options.forEach(e => {
                let label = createElement("label").add(
                    createElement("span", { innerHTML: e })
                );
                let cb = createElement("input", {
                    type: "checkbox",
                    checked: (option.config.value as { [key: string]: boolean; })[e],
                    name: e
                });
                label.add(cb);
                input.add(label);
            });
            input = createElement("div").add(input);
        } else if (this.config.type == "text") {
            input = createElement("input", {
                type: "text",
                value: (option.config.value + "") || ""
            });
        }
        input.style.maxHeight = this.config.maxHeight;
        input.classList.add("option-" + this.config.type); // add class to input element
        input.addEventListener("change", function (event: Event) { // when setting is changed, dispatch change event on the options object
            let evt = new Event("change", { cancelable: true });
            let val, reset: () => void = () => { };
            if (option.config.type == "toggle") {
                val = input.checked;
                reset = () => input.checked = option.config.value;
            } else if (option.config.type == "dropdown" || option.config.type == "text") {
                val = input.value;
                reset = () => input.value = option.config.value;
            } else if (option.config.type == "list") {
                let options = Object.keys(option.config.value as object);
                options.forEach(e => {
                    let i = input.querySelector(`input[name="${e}"]`);
                    if (i) {
                        (option.config.value as { [key: string]: boolean; })[e] = i.checked;
                    }
                });
                val = option.config.value;
                reset = () => {
                    options.forEach(e => {
                        let i = input.querySelector(`input[name="${e}"]`);
                        if (i) {
                            i.checked = (option.config.value as { [key: string]: boolean; })[e];
                        }
                    });
                }
            }
            Object.defineProperty(evt, "val", { value: val, writable: true });
            Object.defineProperty(evt, "opt", { value: option, writable: true });
            let cont = option.dispatchEvent(evt);
            if (cont) {
                // @ts-ignore
                option.value = evt.val;
            } else {
                reset();
                event.preventDefault();
            }
        });
        option.config.input = input; // save input element to config object
        return input;
    }
    /** creates an HTML label element containing the option's name and it's input element, generated from {@link createInput} */
    render(): HTMLLabelElement {
        let label = createElement("label"); // clicking a label will activate the first <input> inside it, so the 'for' attribute isn't required
        let span = createElement("span", {
            innerHTML: this.config.name
        });
        let input = this.createInput();
        label.add(span, input as HTMLElement);
        return label;
    }
    /**
     * binds the option object to a React element
     * 
     * accepts a callback function that is called with the option object, and any additional arguments when the option's value changes
     * 
     * the callback function should return an HTMLElement to render
     * @param callback callback function to call when the option's value changes
     * @param args arguments to pass to the callback function
     */
    bindToReactElement<T extends any[]>(callback: (option: this, ...args: T) => HTMLElement, args: Narrow<T>): React.ReactNode {
        let option = this;
        function Component() {
            const [value, setValue] = useState(0);
            useEffect(() => { // listen for changes to option's value
                function changeListener() {
                    setValue(value + 1); // ensure value is different to enforce re-render
                }
                option.on("change", changeListener); // listen for changes
                return () => option.off("change", changeListener); // stop listening when component reloads
            });
            let listeners: any[] = [];
            let old = HTMLElement.prototype.addEventListener;
            HTMLElement.prototype.addEventListener = function (...args: any[]) {
                listeners.push([this, args]);
                old.apply(this, args as [any, any]);
            }
            let result = callback.apply(option, [option].concat(args) as any);
            if (!(result instanceof HTMLElement)) {
                result = createElement("span").add(result);
            }
            let reactNode = result;
            HTMLElement.prototype.addEventListener = old;
            return reactNode.toReactElement(listeners);
        }
        return React.createElement(Component);
    }
    /** a simple wrapper function to cast an Option object to a specific type of Option */
    as<T extends keyof OptionTypes>(type: T): Option<T> {
        return this as unknown as Option<T>;
    }
    /** simple wrapper function to expose possible values as a type */
    values<T extends string>(...arr: T[]): this & { value: T, config: { value: T } } {
        return this as unknown as this & { value: T, config: { value: T } };
    }
    /**
     * similar to {@link bindToReactElement}, but accepts an array of options
     * @param options options to watch
     * @param callback
     * @param args
     */
    static bindOptionsToReactElement<T extends Option<any>[], A extends any[]>(options: Narrow<T>, callback: (options: T, ...args: A) => HTMLElement, args: Narrow<A>): React.ReactElement {
        function Component() {
            const [value, setValue] = useState(0);
            useEffect(() => { // listen for changes to option's value
                function changeListener() {
                    setValue(value + 1); // ensure value is different to enforce re-render
                }
                // @ts-ignore
                options.forEach(option => option.on("change", changeListener)); // listen for changes
                // @ts-ignore
                return () => options.forEach(option => option.off("change", changeListener)); // stop listening when component reloads
            });
            let listeners: any[] = [];
            let old = HTMLElement.prototype.addEventListener;
            HTMLElement.prototype.addEventListener = function (...args: any[]) {
                listeners.push([this, args]);
                old.apply(this, args as any);
            }
            let result = callback.apply(options, [options].concat(args) as any);
            if (!(result instanceof HTMLElement)) {
                result = createElement("span").add(result);
            }
            let reactNode = result;
            HTMLElement.prototype.addEventListener = old;
            return reactNode.toReactElement(listeners);
        }
        return React.createElement(Component);
    }
    #eventListeners: Record<string, any> = {};
    /**
     * dispatches an event on the Option object
     * @param event the event to dispatch
     */
    dispatchEvent(event: Event): boolean {
        let cont = true;
        if (this.#eventListeners[event.type]) {
            for (let i = 0; i < this.#eventListeners[event.type].length; i++) {
                let c = this.#eventListeners[event.type][i](event);
                if (event.defaultPrevented || (!c && c != undefined)) {
                    cont = false;
                    break;
                }
            }
        }
        let section = this.section_obj;
        let parent_cont = true;
        if(section && !event.defaultPrevented && cont) {
            parent_cont = !!section.dispatchEvent(event);
        }
        return !event.defaultPrevented && cont && parent_cont;
        return (!event.defaultPrevented && cont) ? (!!this.section_obj?.dispatchEvent(event)) : false;
    }
    /**
     * listens for an event
     * @param type type of event
     * @param listener callback function
     */
    on<K extends keyof OptionEventsMap<keyof OptionTypes>>(event: K, listener: (event: OptionEventsMap<T>[K]) => any): void {
        if (!this.#eventListeners[event]) this.#eventListeners[event] = [];
        this.#eventListeners[event].push(listener);
    }
    /**
     * stops the specified callback from listening for the specified event
     * @param event type of event
     * @param listener callback function
     */
    off(event: string, listener: Function): void {
        if (this.#eventListeners[event]) this.#eventListeners[event].splice(this.#eventListeners[event].indexOf(listener), 1);
    }
}
// export class Option<T extends keyof OptionTypes> {
//     static types: Record<keyof OptionTypes, typeof Option<any>>;
//     private validator: typeof OptionSchemas[T];
//     private type: T;
//     section_obj: Section | null = null;
//     config: OptionConfig<T>;
//     input: OptionTypes[typeof this.type]["input"] | null = null;

//     public static construct<T extends keyof OptionTypes>(type: T, config: OptionConfig<T>): Option<T> {
//         return new this.types[type](config);
//     }

//     constructor(config: OptionConfig<T>) {
//         this.config = extend(defaultConfig(config.type), config);
//         this.validator = OptionSchemas[config.type];
//         this.type = config.type;
//         if (!("value" in this.config) && "values" in config) {
//             this.config.value = config.values ? config.values[0] : undefined;
//         }
//     }

//     get value(): OptionTypes[T]["value"] {
//         return this.config.value!;
//     }
//     set value(val) { }
//     render(): HTMLElement {
//         return createElement("div");
//     }
// }

// export class ToggleOption extends Option<"toggle"> {
//     // simple true-false toggle option
//     constructor(config: OptionConfig<"toggle">) {
//         super(config);
//         this.config.value = !!this.config.value;
//     }
//     set value(val: OptionTypes["toggle"]["value"]) {
//         this.config.value = val;
//         if (this.input) {
//             this.input.checked = val;
//         }
//     }
//     render() {
//         const self = this;
//         const input = createElement("input", {
//             type: "checkbox",
//             className: "slider", // pure css toggle switch
//             checked: this.config.value
//         });
//         input.style.maxHeight = "" + this.config.maxHeight;
//         input.classList.add("option-" + this.config.type); // add class to input element
//         input.addEventListener("change", function (event) { // when setting is changed, dispatch change event on the options object
//             let evt: Event & {
//                 val?: OptionTypes["toggle"]["value"];
//                 opt?: ToggleOption;
//             } = new Event("change", { cancelable: true });
//             const val = input.checked;
//             const reset = () => input.checked = self.value;
//             evt.val = val;
//             evt.opt = self;
//             let cont = self.dispatchEvent(evt);
//             if (cont) {
//                 self.value = evt.val;
//             } else {
//                 reset();
//                 event.preventDefault();
//             }
//         });
//         this.input = input; // save input element to config object
//         return input;
//     }
// }
// export class DropdownOption extends Option<"dropdown"> {
//     // select a value from a list of options
//     constructor(config: OptionConfig<"dropdown">) {
//         super(config);
//     }
//     set value(val: OptionTypes["dropdown"]["value"]) {
//     }
// }
// export class ListOption extends Option<"list"> {
//     constructor(config: OptionConfig<"list">) {
//         super(config);
//     }
//     set value(val: OptionTypes["list"]["value"]) {
//     }
// }
// export class TextOption extends Option<"text"> {
//     constructor(config: OptionConfig<"text">) {
//         super(config);
//     }
//     set value(val: OptionTypes["text"]["value"]) {
//     }
// }

// needs to be assigned after definition because subclasses need to be defined after superclass
// Option.types = {
//     toggle: ToggleOption,
//     dropdown: DropdownOption,
//     list: ListOption,
//     text: TextOption,
// };