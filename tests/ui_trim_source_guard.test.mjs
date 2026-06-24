// tests/ui_trim_source_guard.test.mjs
// Guards for the LaTeX/KaTeX-only fork changes:
//  - the renderer selector is removed (renderer fixed to katex)
//  - the LaTeX and Typst export buttons are removed
//  - KaTeX loads via a path relative to import.meta.url (fixes share-URL load failure)

import { test, run, assert } from "./harness.mjs";
import { readFileSync } from "node:fs";

const UI = process.env.UI_MJS || "/tmp/iter3/src/ui.mjs";
let src = "";
try { src = readFileSync(UI, "utf8"); } catch (_) {}

test("ui.mjs is readable", () => {
    assert(src.length > 10000, `expected ui.mjs at ${UI}`);
});

test("KaTeX is imported via a path relative to import.meta.url (share-URL fix)", () => {
    assert(/new URL\("\.\/KaTeX\/katex\.mjs",\s*import\.meta\.url\)\.href/.test(src),
        "KaTeX JS URL is relative to import.meta.url");
    assert(/import\(katex_js_url\)/.test(src), "KaTeX imported from the relative URL");
    assert(!/import\("\/KaTeX\/katex\.mjs"\)/.test(src),
        "the absolute /KaTeX/ import must be gone");
});

test("KaTeX CSS is loaded via a relative URL too", () => {
    assert(/new URL\("\.\/KaTeX\/katex\.css",\s*import\.meta\.url\)\.href/.test(src),
        "KaTeX CSS href must be relative to import.meta.url");
});

test("renderer <select> is removed", () => {
    assert(!/new DOM\.Element\("select",\s*\{\s*name:\s*"renderer"\s*\}\)/.test(src),
        "renderer select element must be gone");
    assert(!/renderer_select/.test(src), "no renderer_select references remain");
});

test("LaTeX and Typst export buttons are removed", () => {
    assert(!/export_to_latex/.test(src), "export_to_latex removed");
    assert(!/export_to_typst/.test(src), "export_to_typst removed");
});

test("URL and HTML export remain", () => {
    assert(/display_port_pane\("export",\s*"base64"\)/.test(src), "URL export kept");
    assert(/display_port_pane\("export",\s*"html"\)/.test(src), "HTML export kept");
});

test("default renderer is katex (fork is LaTeX-only)", () => {
    assert(/DEFAULT_RENDERER:\s*"katex"/.test(src), "renderer fixed to katex");
});

await run();
