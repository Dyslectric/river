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

test("focused inputs use on-accent text (not ink) so they contrast with the accent fill", () => {
    // The label/name input and number input fill with the accent on focus; their text must
    // be on-accent, never --ink (which is light on dark themes -> invisible on the fill).
    const labelFocus = norm.match(/\.label-input:focus\s*\{([^}]*)\}/);
    assert(labelFocus, ".label-input:focus block should exist");
    assert(/color:\s*var\(--ui-on-accent/.test(labelFocus[1]),
        ".label-input:focus must use var(--ui-on-accent ...)");
    assert(!/color:\s*var\(--ink\b/.test(labelFocus[1]),
        ".label-input:focus must NOT use --ink (invisible on accent in dark themes)");
});

test("the token swap stays thorough (few remaining non-token colour literals)", () => {
    // Count colour literals OUTSIDE the intentional :root fallback block, not inside a
    // var(...) fallback, and not transparent. The :root block is the static safety net the
    // JS theme engine overrides at runtime, so it's excluded. What remains should be only
    // alpha-only overlays/borders/shadows that read on any theme. Cap it so a future edit
    // reintroducing opaque hardcoded UI colours fails loudly.
    const lines = css.split("\n");
    // Find the :root { ... } span to exclude.
    let rootStart = -1, rootEnd = -1, depth = 0;
    for (let i = 0; i < lines.length; i++) {
        if (rootStart === -1 && /:root\s*\{/.test(lines[i])) { rootStart = i; depth = 1; continue; }
        if (rootStart !== -1 && rootEnd === -1) {
            depth += (lines[i].match(/\{/g) || []).length;
            depth -= (lines[i].match(/\}/g) || []).length;
            if (depth <= 0) { rootEnd = i; break; }
        }
    }
    const colourRe = /#[0-9a-fA-F]{3,8}\b|hsla?\(|rgba?\(|:\s*(white|black|lightgrey|grey|gray)\b/;
    let offenders = 0;
    const offendingLines = [];
    for (let i = 0; i < lines.length; i++) {
        if (rootStart !== -1 && i >= rootStart && i <= rootEnd) continue; // skip :root block
        const line = lines[i];
        if (!colourRe.test(line)) continue;
        if (/var\(--/.test(line)) continue;
        if (/transparent/.test(line)) continue;
        offenders++;
        offendingLines.push(`${i + 1}: ${line.trim()}`);
    }
    // After the swap these are all alpha-only overlays/borders/shadows (~10).
    assert(offenders <= 12,
        `too many non-token colour literals outside :root (${offenders}):\n` +
        offendingLines.join("\n"));
});

await run();
