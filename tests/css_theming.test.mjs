// tests/css_theming.test.mjs
// Cheap regression guards on the shipped main.css: the theming-critical rules that were
// added by hand (and are easy to drop in a future edit) must remain present. These read
// the ACTUAL edited main.css from the iter3 tree.

import { test, run, assert } from "./harness.mjs";
import { readFileSync } from "node:fs";

const CSS_PATH = process.env.MAIN_CSS || "/tmp/iter3/src/main.css";
let css = "";
try {
    css = readFileSync(CSS_PATH, "utf8");
} catch (_) {
    css = "";
}

// Collapse whitespace for tolerant matching.
const norm = css.replace(/\s+/g, " ");

test("main.css is readable", () => {
    assert(css.length > 1000, `expected non-trivial CSS at ${CSS_PATH}`);
});

test("page background uses the --paper token", () => {
    assert(
        /background:\s*var\(--paper/.test(norm),
        "body background should reference var(--paper)",
    );
});

test(".label defines a themable text colour via --ink", () => {
    // Find the .label { ... } block and check it contains color: var(--ink ...)
    const m = norm.match(/\.label\s*\{([^}]*)\}/);
    assert(m, ".label block should exist");
    assert(
        /color:\s*var\(--ink/.test(m[1]),
        ".label should set color: var(--ink ...)",
    );
});

test(".label also sets fill via --ink (Typst path)", () => {
    const m = norm.match(/\.label\s*\{([^}]*)\}/);
    assert(m && /fill:\s*var\(--ink/.test(m[1]), ".label should set fill: var(--ink ...)");
});

test("no stray 'background: white' literal on body (should be tokenised)", () => {
    // The original `body { ... background: white; ... }` must now be var(--paper).
    const bodyBlock = norm.match(/(^|[^.\w])body\s*\{([^}]*)\}/);
    if (bodyBlock) {
        assert(
            !/background:\s*white\s*;/.test(bodyBlock[2]),
            "body should not hardcode background: white",
        );
    }
});

test("the .global bottom bar sets chip text colour", () => {
    const m = norm.match(/\.global\s*\{([^}]*)\}/);
    assert(m, ".global block should exist");
    assert(
        /color:\s*var\(--ui-chip-text/.test(m[1]),
        ".global should set color: var(--ui-chip-text ...) so its labels contrast",
    );
});

test("the import/export wrapper sets chip text colour", () => {
    const m = norm.match(/\.panel\s*>\s*\.wrapper\s*\{([^}]*)\}/);
    assert(m, ".panel > .wrapper block should exist");
    assert(/color:\s*var\(--ui-chip-text/.test(m[1]), "wrapper should set chip text colour");
});

test("toolbar label text uses chip-text tokens (not hardcoded grey)", () => {
    // The normal label rule and the disabled/faded rule must both be tokenised.
    assert(/color:\s*var\(--ui-chip-text\b/.test(norm), "normal toolbar label tokenised");
    assert(/color:\s*var\(--ui-chip-text-faded/.test(norm), "faded toolbar label tokenised");
});

await run();
