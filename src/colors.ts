import { flattenChildNodes } from "./arrays";
import { map } from "./math";
import { extend } from "./utility";
type color = {
    r: number;
    g: number;
    b: number;
    [key: string]: number;
}
/**
 * returns css rgb string based off of a percent value of a gradient
 * @param p number in range from 0-100
 * @param colors array of rgb colors
 */
export function rgbMix(
    p: number,
    colors: color[] = [
        { r: 0xff, g: 0, b: 0 }, // 0% red
        { r: 0xff, g: 0x7f, b: 0 }, // 20% orange
        { r: 0xff, g: 0xff, b: 0 }, // 40% yellow
        { r: 0, g: 0xff, b: 0 }, // 60% green
        { r: 0, g: 0, b: 0xff }, // 80% blue
        { r: 0xff, g: 0, b: 0xff }, // 100% purple
    ]
) {
    p = typeof p === "string" ? parseInt(p) : p; // convert p to a number if it is a string
    let numChunks = colors.length - 1; // get number of sub-gradients
    let chunkSize = 100 / numChunks; // get what percent each sub-gradient represents out of the whole gradient
    for (let i = 1; i <= numChunks; i++) { // loop through sub-gradients and find if p is within that gradient
        if (p <= chunkSize * i) {
            let percent = ((p + (1 - i) * chunkSize) * numChunks) / 100; // get percent relative to the sub-gradient
            let color1 = colors[i], color2 = colors[i - 1]; // get left/right colors for sub-gradient
            let result: number[] = [];
            Object.keys(colors[0]).forEach((e) => {
                result.push(Math.floor((color1[e] * percent + color2[e] * (1 - percent)) * 100) / 100); // blend colors according to where p is within the sub-gradient
            });
            return "rgb(" + result.join(",") + ")"; // return result
        }
    }
}

/**
 * generates a gradient of colors from the specified array
 * @param count number of colors to generate
 * @param colors array of colors in gradient
 */
export function gradient(count: number, colors: color[] = [
    { r: 0xff, g: 0, b: 0 }, // 0% red
    { r: 0xff, g: 0x7f, b: 0 }, // 20% orange
    { r: 0xff, g: 0xff, b: 0 }, // 40% yellow
    { r: 0, g: 0xff, b: 0 }, // 60% green
    { r: 0, g: 0, b: 0xff }, // 80% blue
    { r: 0xff, g: 0, b: 0xff }, // 100% purple
]): string[] {
    if (count == 1) { // only one color needed, so just return the first color in the gradient range
        let { r, g, b } = colors[0];
        return [`rgb(${r},${g},${b})`];
    }
    let arr = new Array(count).fill(""); // make array of how many colors you need
    arr = arr.map((e, n) => rgbMix(map(n, 0, count - 1, 0, 100), colors)); // fill array with colors
    return arr;
}

/**
 * returns the value of the given css variable name
 * @param varname css variable name
 */
export function getColor(varname: string, ...append: string[]): string {
    let color = getComputedStyle(document.querySelector(":root") as Element).getPropertyValue(varname); // get css variable value
    if (color.match(/^#[a-zA-Z0-9]{3}$/g)) { // check if color is 3-digit hex
        color = "#" + color.substring(1).split("").map(e => e.padStart(2, e)).join("") + append.join(""); // convert color to 6-digit hex
    }
    return color + append.join(""); // append is mostly useless
}

/**
 * return white or black depending on the contrast of the given color
 * @param rgb rgb(R, G, B) formatted color
 */
export function getContrastColor(rgb: string): "#000000" | "#FFFFFF" {
    let [r, g, b] = rgb.replaceAll(/[^0-9 ]/g, "").split(" ").map(e => parseFloat(e));
    return (r * 0.299 + g * 0.587 + b * 0.114) > 186 ? '#000000' : '#FFFFFF';
}

export class Color {
    static hexRegex = /^#([0-9a-f]{3}){1,2}$/i;
    static hexaRegex = /^#([0-9a-f]{4}){1,2}$/i;
    static rgbRegex = /^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/;
    static rgbaRegex = /^rgba\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3}),\s*(\d?\.?\d+)\)$/;
    static hslRegex = /^hsl\((\d{1,3}),\s*(\d{1,3})%,\s*(\d{1,3})%\)$/;
    static hslaRegex = /^hsla\((\d{1,3}),\s*(\d{1,3})%,\s*(\d{1,3})%,\s*(\d?\.?\d+)\)$/;
    static hslToRgb(h: number, s: number, l: number) {
        let r, g, b;
        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = Color.hueToRgb(p, q, h + 1 / 3);
            g = Color.hueToRgb(p, q, h);
            b = Color.hueToRgb(p, q, h - 1 / 3);
        }
        return [Math.min(Math.floor(r * 256), 255), Math.min(Math.floor(g * 256), 255), Math.min(Math.floor(b * 256), 255)];
    }
    static rgbToHsl(r: number, g: number, b: number) {
        (r /= 255), (g /= 255), (b /= 255);
        const vmax = Math.max(r, g, b), vmin = Math.min(r, g, b);
        let h = 0, s, l = (vmax + vmin) / 2;
        if (vmax === vmin) {
            return [0, 0, l]; // achromatic
        }
        const d = vmax - vmin;
        s = l > 0.5 ? d / (2 - vmax - vmin) : d / (vmax + vmin);
        if (vmax === r) h = (g - b) / d + (g < b ? 6 : 0);
        if (vmax === g) h = (b - r) / d + 2;
        if (vmax === b) h = (r - g) / d + 4;
        h /= 6;
        return [h, s, l];
    }
    static hueToRgb(p: number, q: number, t: number) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    }
    a: number = -1;
    r: number = -1;
    g: number = -1;
    b: number = -1;
    constructor(color: string) {
        if (color.match(Color.hexRegex)) {
            this.a = 1;
            if (color.length == 4) {
                this.r = parseInt(color[1] + color[1], 16);
                this.g = parseInt(color[2] + color[2], 16);
                this.b = parseInt(color[3] + color[3], 16);
            } else {
                this.r = parseInt(color[1] + color[2], 16);
                this.g = parseInt(color[3] + color[4], 16);
                this.b = parseInt(color[5] + color[6], 16);
            }
        } else if (color.match(Color.hexaRegex)) {
            if (color.length == 5) {
                this.r = parseInt(color[1] + color[1], 16);
                this.g = parseInt(color[2] + color[2], 16);
                this.b = parseInt(color[3] + color[3], 16);
                this.a = parseInt(color[4] + color[4], 16);
            } else {
                this.r = parseInt(color[1] + color[2], 16);
                this.g = parseInt(color[3] + color[4], 16);
                this.b = parseInt(color[5] + color[6], 16);
                this.a = parseInt(color[7] + color[8], 16);
            }
        } else if (color.match(Color.rgbRegex)) {
            let match = color.match(Color.rgbRegex);
            if (!match) return;
            console.log("rgb match", match);
            this.r = parseInt(match[1]);
            this.g = parseInt(match[2]);
            this.b = parseInt(match[3]);
            this.a = 1;
        } else if (color.match(Color.rgbaRegex)) {
            let match = color.match(Color.rgbaRegex);
            if (!match) return;
            this.r = parseInt(match[1]);
            this.g = parseInt(match[2]);
            this.b = parseInt(match[3]);
            this.a = parseFloat(match[4]);
        } else if (color.match(Color.hslRegex)) {
            let match = color.match(Color.hslRegex);
            if (!match) return;
            let h = parseInt(match[1]);
            let s = parseInt(match[2]);
            let l = parseInt(match[3]);
            let [r, g, b] = Color.hslToRgb(h, s, l);
            extend(this, { r, g, b });
            this.a = 1;
        } else if (color.match(Color.hslaRegex)) {
            let match = color.match(Color.hslaRegex);
            if (!match) return;
            let h = parseInt(match[1]);
            let s = parseInt(match[2]);
            let l = parseInt(match[3]);
            let [r, g, b] = Color.hslToRgb(h, s, l);
            extend(this, { r, g, b });
            this.a = parseFloat(match[4]);
        } else if (color in CSSColors) {
            // @ts-ignore
            let hex = CSSColors[color];
            this.r = parseInt(hex.substring(1, 3), 16);
            this.g = parseInt(hex.substring(3, 5), 16);
            this.b = parseInt(hex.substring(5, 7), 16);
            this.a = 1;
        } else {
            console.error("Invalid color:", color);
        }
    }
    toHex() { return `#${this.r.toString(16).padStart(2, "0")}${this.g.toString(16).padStart(2, "0")}${this.b.toString(16).padStart(2, "0")}`; }
    toHexa() { return `#${this.r.toString(16).padStart(2, "0")}${this.g.toString(16).padStart(2, "0")}${this.b.toString(16).padStart(2, "0")}${this.a.toString(16).padStart(2, "0")}`; }
    toRGB() { return `rgb(${this.r}, ${this.g}, ${this.b})`; }
    toRGBA() { return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`; }
    toHSL() {
        let [h, s, l] = Color.rgbToHsl(this.r, this.g, this.b);
        return `hsl(${h}, ${s}%, ${l}%)`;
    }
    toHSLA() {
        let [h, s, l] = Color.rgbToHsl(this.r, this.g, this.b);
        return `hsla(${h}, ${s}%, ${l}%, ${this.a})`;
    }
}

export const CSSColors = {
    aliceblue: "#f0f8ff", antiquewhite: "#faebd7", aqua: "#00ffff", aquamarine: "#7fffd4", azure: "#f0ffff",
    beige: "#f5f5dc", bisque: "#ffe4c4", black: "#000000", blanchedalmond: "#ffebcd", blue: "#0000ff",
    blueviolet: "#8a2be2", brown: "#a52a2a", burlywood: "#deb887", cadetblue: "#5f9ea0", chartreuse: "#7fff00",
    chocolate: "#d2691e", coral: "#ff7f50", cornflowerblue: "#6495ed", cornsilk: "#fff8dc", crimson: "#dc143c",
    cyan: "#00ffff", darkblue: "#00008b", darkcyan: "#008b8b", darkgoldenrod: "#b8860b", darkgray: "#a9a9a9",
    darkgreen: "#006400", darkgrey: "#a9a9a9", darkkhaki: "#bdb76b", darkmagenta: "#8b008b", darkolivegreen: "#556b2f",
    darkorange: "#ff8c00", darkorchid: "#9932cc", darkred: "#8b0000", darksalmon: "#e9967a", darkseagreen: "#8fbc8f",
    darkslateblue: "#483d8b", darkslategray: "#2f4f4f", darkslategrey: "#2f4f4f", darkturquoise: "#00ced1",
    darkviolet: "#9400d3", deeppink: "#ff1493", deepskyblue: "#00bfff", dimgray: "#696969", dimgrey: "#696969",
    dodgerblue: "#1e90ff", firebrick: "#b22222", floralwhite: "#fffaf0", forestgreen: "#228b22", fuchsia: "#ff00ff",
    gainsboro: "#dcdcdc", ghostwhite: "#f8f8ff", gold: "#ffd700", goldenrod: "#daa520", gray: "#808080",
    green: "#008000", greenyellow: "#adff2f", grey: "#808080", honeydew: "#f0fff0", hotpink: "#ff69b4",
    indianred: "#cd5c5c", indigo: "#4b0082", ivory: "#fffff0", khaki: "#f0e68c", lavender: "#e6e6fa",
    lavenderblush: "#fff0f5", lawngreen: "#7cfc00", lemonchiffon: "#fffacd", lightblue: "#add8e6", lightcoral: "#f08080",
    lightcyan: "#e0ffff", lightgoldenrodyellow: "#fafad2", lightgray: "#d3d3d3", lightgreen: "#90ee90",
    lightgrey: "#d3d3d3", lightpink: "#ffb6c1", lightsalmon: "#ffa07a", lightseagreen: "#20b2aa", lightskyblue: "#87cefa",
    lightslategray: "#778899", lightsteelblue: "#b0c4de", lightyellow: "#ffffe0", lime: "#00ff00", limegreen: "#32cd32",
    linen: "#faf0e6", magenta: "#ff00ff", maroon: "#800000", mediumaquamarine: "#66cdaa", mediumblue: "#0000cd",
    mediumorchid: "#ba55d3", mediumpurple: "#9370db", mediumseagreen: "#3cb371", mediumslateblue: "#7b68ee",
    mediumspringgreen: "#00fa9a", mediumturquoise: "#48d1cc", mediumvioletred: "#c71585", midnightblue: "#191970",
    mintcream: "#f5fffa", mistyrose: "#ffe4e1", moccasin: "#ffe4b5", navajowhite: "#ffdead", navy: "#000080",
    oldlace: "#fdf5e6", olive: "#808000", olivedrab: "#6b8e23", orange: "#ffa500", orangered: "#ff4500",
    orchid: "#da70d6", palegoldenrod: "#eee8aa", palegreen: "#98fb98", paleturquoise: "#afeeee", palevioletred: "#db7093",
    papayawhip: "#ffefd5", peachpuff: "#ffdab9", peru: "#cd853f", pink: "#ffc0cb", plum: "#dda0dd", powderblue: "#b0e0e6",
    purple: "#800080", red: "#ff0000", rosybrown: "#bc8f8f", royalblue: "#4169e1", saddlebrown: "#8b4513",
    salmon: "#fa8072", sandybrown: "#f4a460", seagreen: "#2e8b57", seashell: "#fff5ee", sienna: "#a0522d",
    silver: "#c0c0c0", skyblue: "#87ceeb", slateblue: "#6a5acd", slategray: "#708090", slategrey: "#708090", snow: "#fffafa",
    springgreen: "#00ff7f", steelblue: "#4682b4", tan: "#d2b48c", teal: "#008080", thistle: "#d8bfd8", tomato: "#ff6347",
    turquoise: "#40e0d0", violet: "#ee82ee", wheat: "#f5deb3", white: "#ffffff", whitesmoke: "#f5f5f5", yellow: "#ffff00",
    yellowgreen: "#9acd32"
};
