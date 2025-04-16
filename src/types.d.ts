// this file only exists because vscode doesn't like the Proxy global object being used without being defined in javascript
// type definitions taken from https://github.com/microsoft/TypeScript/blob/8e5e2e0/src/lib/es2015.proxy.d.ts

import type React = require("react");

interface ProxyHandler<T extends object> {
    /**
     * A trap method for a function call.
     * @param target The original callable object which is being proxied.
     */
    apply?(target: T, thisArg: any, argArray: any[]): any;

    /**
     * A trap for the `new` operator.
     * @param target The original object which is being proxied.
     * @param newTarget The constructor that was originally called.
     */
    construct?(target: T, argArray: any[], newTarget: Function): object;

    /**
     * A trap for `Object.defineProperty()`.
     * @param target The original object which is being proxied.
     * @returns A `Boolean` indicating whether or not the property has been defined.
     */
    defineProperty?(target: T, property: string | symbol, attributes: PropertyDescriptor): boolean;

    /**
     * A trap for the `delete` operator.
     * @param target The original object which is being proxied.
     * @param p The name or `Symbol` of the property to delete.
     * @returns A `Boolean` indicating whether or not the property was deleted.
     */
    deleteProperty?(target: T, p: string | symbol): boolean;

    /**
     * A trap for getting a property value.
     * @param target The original object which is being proxied.
     * @param p The name or `Symbol` of the property to get.
     * @param receiver The proxy or an object that inherits from the proxy.
     */
    get?(target: T, p: string | symbol, receiver: any): any;

    /**
     * A trap for `Object.getOwnPropertyDescriptor()`.
     * @param target The original object which is being proxied.
     * @param p The name of the property whose description should be retrieved.
     */
    getOwnPropertyDescriptor?(target: T, p: string | symbol): PropertyDescriptor | undefined;

    /**
     * A trap for the `[[GetPrototypeOf]]` internal method.
     * @param target The original object which is being proxied.
     */
    getPrototypeOf?(target: T): object | null;

    /**
     * A trap for the `in` operator.
     * @param target The original object which is being proxied.
     * @param p The name or `Symbol` of the property to check for existence.
     */
    has?(target: T, p: string | symbol): boolean;

    /**
     * A trap for `Object.isExtensible()`.
     * @param target The original object which is being proxied.
     */
    isExtensible?(target: T): boolean;

    /**
     * A trap for `Reflect.ownKeys()`.
     * @param target The original object which is being proxied.
     */
    ownKeys?(target: T): ArrayLike<string | symbol>;

    /**
     * A trap for `Object.preventExtensions()`.
     * @param target The original object which is being proxied.
     */
    preventExtensions?(target: T): boolean;

    /**
     * A trap for setting a property value.
     * @param target The original object which is being proxied.
     * @param p The name or `Symbol` of the property to set.
     * @param receiver The object to which the assignment was originally directed.
     * @returns A `Boolean` indicating whether or not the property was set.
     */
    set?(target: T, p: string | symbol, newValue: any, receiver: any): boolean;

    /**
     * A trap for `Object.setPrototypeOf()`.
     * @param target The original object which is being proxied.
     * @param newPrototype The object's new prototype or `null`.
     */
    setPrototypeOf?(target: T, v: object | null): boolean;
}

interface ProxyConstructor {
    /**
     * Creates a revocable Proxy object.
     * @param target A target object to wrap with Proxy.
     * @param handler An object whose properties define the behavior of Proxy when an operation is attempted on it.
     */
    revocable<T extends object>(target: T, handler: ProxyHandler<T>): { proxy: T; revoke: () => void; };

    /**
     * Creates a Proxy object. The Proxy object allows you to create an object that can be used in place of the
     * original object, but which may redefine fundamental Object operations like getting, setting, and defining
     * properties. Proxy objects are commonly used to log property accesses, validate, format, or sanitize inputs.
     * @param target A target object to wrap with Proxy.
     * @param handler An object whose properties define the behavior of Proxy when an operation is attempted on it.
     */
    new <T extends object>(target: T, handler: ProxyHandler<T>): T;
}
declare var Proxy: ProxyConstructor;
declare type Proxy = ProxyConstructor;

export type EventListener<T extends keyof HTMLElementEventMap> = [HTMLElement, [T, HTMLElementEventMap[T]]][];

export type JSONML = [
    keyof HTMLElementTagNameMap,
    any?,
    ...(JSONML | string | null | undefined)
];
export interface DevtoolsFormatter {
    label?: string;
    header?: (obj: any) => JSONML | null;
    hasBody?: (object: any) => boolean | null;
    body: (obj: any) => JSONML | null;
}

declare global {
    var RUNNING_IN_NODE: boolean;
    var devtoolsFormatters: DevtoolsFormatter[];
    interface HTMLElement {
        /**
         * converts an HTMLElement to a React component
         * @param listeners list of event listeners to add to the element
         */
        toReactElement(listeners: [HTMLElement, EventListener<keyof HTMLElementEventMap>[]][]): React.ReactElement;

        /**
         * wrapper for {@link HTMLElement.append}\
         * returns the element itself to chain methods
         * @param elements Elements to append
         */
        add(...elements: HTMLElement[]): this;
    }

    interface Math {
        /**
         * Rounds a number to a specified number of decimals
         * @param num number to round
         * @param decimals number of decimals to round to
         * @returns rounded number
         */
        roundf(num: number, decimals: number): number;

        /**
         * proportionately maps a number from an input range to an output range
         * @param x value
         * @param inmin input range lower bound
         * @param inmax input range upper bound
         * @param outmin output range lower bound
         * @param outmax output range upper bound
         * @param cmp whether to clamp the input value to the input range
         * @returns mapped value
         */
        map(x: number, inmin: number, inmax: number, outmin: number, outmax: number, cmp?: boolean): number;

        /**
         * clamps a number to a range\
         * \
         * if the number is outside the range, move it to the\
         * closest position inside the range, else do nothing
         * @param x value
         * @param min minimum of range
         * @param max maximum of range
         * @returns number clamped to range
         */
        clamp(x: number, min: number, max: number): number;

        /**
         * generate a random number within a range
         * @param min min value of range
         * @param max max value of range
         * @returns random number
         */
        rand(min: number, max: number): number;

        /**
         * generate a range of numbers from 0 to the given number
         * @param range number of elements in the array
         */
        range(range: number): number[];

        /**
         * generate a range of numbers between start and stop
         * @param start range start
         * @param stop range end
         */
        range(start: number, stop: number): number[];

        /**
         * generate a range of numbers between start and stop, stepping by the given amount
         * @param start range start
         * @param stop range end
         * @param step step between numbers
         */
        range(start: number, stop: number, step: number): number[];
    }

    interface Array<T> {
        /**
         * returns a copy of the array with all duplicate values removed
         */
        unique(): T[];
    }

    interface CSSStyleSheet {
        cssText: string;
    }
}

export type Narrow<T> = | (T extends infer U ? U : never) | Extract<T, any> | ([T] extends [[]] ? [] : { [K in keyof T]: Narrow<T[K]> })
type BasicAny = string | number | boolean;
type NestedBasicAnyArray = (BasicAny | NestedBasicAnyArray)[];
