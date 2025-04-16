/**
 * sets the tab's favicon to a square with the specified color
 * @param color color of the square
 */
export function tabColor(color: string) {
    function isValidCSSColor(color2: string) { // checks if string is valid css color
        if (["unset", "initial", "inherit"].includes(color2)) { // valid css colors that should return false
            return false;
        }
        const s = document.createElement("div").style; // get style property of temp element
        s.color = color2; // set color property
        return s.color !== ""; // check if color property is still there
    }
    if (!isValidCSSColor(color)) { // check if provided color is valid
        return;
    }
    let c = document.createElement("canvas"); // create dummy canvas
    c.width = 1; // set favicon dimensions
    c.height = 1; // 1x1 is fine since it's a solid color
    let ctx = c.getContext("2d")!;
    ctx.fillStyle = color; // set color
    ctx.fillRect(0, 0, 128, 128); // fill canvas with color
    let link: HTMLLinkElement = document.querySelector("link[rel=icon]") || document.createElement("link"); // find favicon link or create new one
    link.href = c.toDataURL(); // convert to base64
    link.rel = "icon"; // set rel
    document.head.append(link); // append new element
}
