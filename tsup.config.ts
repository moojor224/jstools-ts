import fs from "fs";
import path from "path";
import { defineConfig } from "tsup";

const props = await fetch("https://www.w3.org/Style/CSS/all-properties.en.json").then(e => e.json());
const filepath = path.resolve(__dirname, "src", "css-properties.json");
fs.writeFileSync(filepath, JSON.stringify(props), "utf-8");

export default defineConfig({
    entry: ["index.ts"],
    format: ["cjs", "esm", "iife"], // Build for commonJS and ESmodules
    dts: true, // Generate declaration file (.d.ts)
    splitting: false,
    sourcemap: true,
    clean: true,
});