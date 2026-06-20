// tests/theme.test.mjs — tests the theme token engine.
// theme.mjs touches document/localStorage/window; we stub a minimal DOM before import.

import { test, run, assert, assertEq } from "./harness.mjs";

// --- Minimal DOM / storage stubs (must exist BEFORE importing theme.mjs) ---------

const _store = new Map();
globalThis.localStorage = {
    getItem: (k) => (_store.has(k) ? _store.get(k) : null),
    setItem: (k, v) => _store.set(k, String(v)),
    removeItem: (k) => _store.delete(k),
};

const _rootStyle = new Map();
globalThis.document = {
    documentElement: {
        dataset: {},
        style: {
            setProperty: (k, v) => _rootStyle.set(k, v),
            getPropertyValue: (k) => _rootStyle.get(k) || "",
        },
    },
};

let _lastEvent = null;
globalThis.window = {
    matchMedia: () => ({ matches: false }),
    dispatchEvent: (e) => { _lastEvent = e; },
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
};
globalThis.CustomEvent = globalThis.window.CustomEvent;
globalThis.getComputedStyle = () => ({
    getPropertyValue: (k) => _rootStyle.get(k) || "",
});

const { PALETTES, buildTheme, applyTheme, initialTheme, themeColour } =
    await import("../src/theme.mjs");

// --- buildTheme produces a complete, consistent token set ------------------------

const REQUIRED_TOKENS = [
    "--ink", "--paper",
    "--ui-black", "--ui-white", "--ui-blue", "--ui-orange",
    "--ui-background", "--ui-border", "--ui-hover", "--ui-active",
    "--ui-focus", "--ui-text", "--ui-error", "--ui-warning",
    "--ui-panel", "--ui-panel-2",
    "--ui-chip-text", "--ui-chip-text-faded",
    "--cell-hover", "--cell-selected", "--cell-source", "--cell-target",
    "--grid-line",
];

for (const name of Object.keys(PALETTES)) {
    test(`buildTheme(${name}) defines every required token`, () => {
        const t = buildTheme(PALETTES[name]);
        for (const tok of REQUIRED_TOKENS) {
            assert(tok in t, `missing token ${tok} in ${name}`);
            assert(t[tok] && t[tok].length > 0, `empty token ${tok} in ${name}`);
        }
    });
}

test("light theme maps ink to black, paper to white-ish", () => {
    const t = buildTheme(PALETTES.light);
    assertEq(t["--ink"], "hsl(0, 0%, 0%)");
    assertEq(t["--paper"], "hsl(0, 0%, 100%)");
});

test("dark theme inverts: ink light, paper dark", () => {
    const t = buildTheme(PALETTES.dark);
    assertEq(t["--ink"], "hsl(0, 0%, 90%)");
    assertEq(t["--paper"], "hsl(0, 0%, 10%)");
});

test("overlay polarity flips with overlay_on_light", () => {
    const light = buildTheme(PALETTES.light);
    const dark = buildTheme(PALETTES.dark);
    // light tints with black, dark tints with white
    assert(light["--cell-hover"].includes("0%, 0%"), "light hover tints dark");
    assert(dark["--cell-hover"].includes("0%, 100%"), "dark hover tints light");
});

test("mocha is a dark palette using catppuccin base", () => {
    const t = buildTheme(PALETTES.mocha);
    assertEq(t["--paper"], "#1e1e2e");
    assertEq(t["--ink"], "#cdd6f4");
});

test("all four Catppuccin flavours plus light/dark are present", () => {
    for (const name of ["light", "dark", "latte", "frappe", "macchiato", "mocha"]) {
        assert(name in PALETTES, `missing palette: ${name}`);
    }
    assertEq(Object.keys(PALETTES).length, 6);
});

test("catppuccin flavours use their official base colours", () => {
    assertEq(buildTheme(PALETTES.latte)["--paper"], "#eff1f5");
    assertEq(buildTheme(PALETTES.frappe)["--paper"], "#303446");
    assertEq(buildTheme(PALETTES.macchiato)["--paper"], "#24273a");
    assertEq(buildTheme(PALETTES.mocha)["--paper"], "#1e1e2e");
});

test("latte is the only light-overlay catppuccin flavour", () => {
    // Latte tints overlays with black (light theme); the dark flavours tint with white.
    assert(buildTheme(PALETTES.latte)["--cell-hover"].includes("0%, 0%"), "latte tints dark");
    for (const name of ["frappe", "macchiato", "mocha"]) {
        assert(buildTheme(PALETTES[name])["--cell-hover"].includes("0%, 100%"),
            `${name} should tint light`);
    }
});

// --- applyTheme writes vars, tags root, persists, fires event --------------------

test("applyTheme sets every token on :root", () => {
    applyTheme("dark");
    for (const tok of REQUIRED_TOKENS) {
        assert(_rootStyle.get(tok), `root missing ${tok} after apply`);
    }
});

test("applyTheme tags documentElement.dataset.theme", () => {
    applyTheme("mocha");
    assertEq(document.documentElement.dataset.theme, "mocha");
});

test("applyTheme persists to localStorage", () => {
    applyTheme("dark");
    assertEq(localStorage.getItem("quiver-theme"), "dark");
});

test("applyTheme fires quiver-theme-change with the name", () => {
    // Other suites in the same process may reassign globalThis.window, so install our
    // capturing stub right here and restore it after, making this order-independent.
    _lastEvent = null;
    const myWindow = {
        matchMedia: () => ({ matches: false }),
        dispatchEvent: (e) => { _lastEvent = e; },
        CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
    };
    const saved = globalThis.window;
    globalThis.window = myWindow;
    globalThis.CustomEvent = myWindow.CustomEvent;
    try {
        applyTheme("dark");
        assert(_lastEvent, "event fired");
        assertEq(_lastEvent.type, "quiver-theme-change");
        assertEq(_lastEvent.detail.name, "dark");
    } finally {
        globalThis.window = saved;
    }
});

test("applyTheme falls back to light on an unknown name", () => {
    applyTheme("does-not-exist");
    assertEq(document.documentElement.dataset.theme, "light");
});

// --- initialTheme respects persisted choice -------------------------------------

test("initialTheme returns the persisted theme", () => {
    localStorage.setItem("quiver-theme", "mocha");
    assertEq(initialTheme(), "mocha");
});

test("initialTheme defaults to light when nothing saved & no dark pref", () => {
    localStorage.removeItem("quiver-theme");
    assertEq(initialTheme(), "light");
});

// --- themeColour reads back from the CSS layer ----------------------------------

test("themeColour reads an applied token", () => {
    applyTheme("dark");
    assertEq(themeColour("--ink"), "hsl(0, 0%, 90%)");
});

test("themeColour returns fallback for an undefined token", () => {
    assertEq(themeColour("--nope", "black"), "black");
});

// --- contrast / non-inversion regressions (the iter3.2 toolbar bug) -------------

// Parse an hsl()/hsla() lightness, or a #hex luminance, into a 0..100 scale.
function lightness(colour) {
    let m = colour.match(/hsla?\(\s*[\d.]+\s*,\s*[\d.]+%\s*,\s*([\d.]+)%/i);
    if (m) return parseFloat(m[1]);
    m = colour.match(/^#([0-9a-f]{6})$/i);
    if (m) {
        const n = parseInt(m[1], 16);
        const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        // Rec. 601 luma -> 0..100
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255 * 100;
    }
    return null;
}

for (const name of Object.keys(PALETTES)) {
    test(`chip text contrasts with chip surface in ${name} (no collapse)`, () => {
        const t = buildTheme(PALETTES[name]);
        const bg = lightness(t["--ui-black"]);   // chip surface
        const fg = lightness(t["--ui-chip-text"]); // chip text
        assert(bg !== null && fg !== null, "lightness parseable");
        assert(Math.abs(fg - bg) >= 40,
            `chip text/bg too close in ${name}: |${fg}-${bg}| < 40`);
    });

    test(`faded chip text still readable on chip surface in ${name}`, () => {
        const t = buildTheme(PALETTES[name]);
        const bg = lightness(t["--ui-black"]);
        const fg = lightness(t["--ui-chip-text-faded"]);
        assert(Math.abs(fg - bg) >= 30,
            `faded text/bg too close in ${name}: |${fg}-${bg}| < 30`);
    });
}

test("chip surface stays dark across all themes (no per-theme inversion)", () => {
    for (const name of Object.keys(PALETTES)) {
        const t = buildTheme(PALETTES[name]);
        const bg = lightness(t["--ui-black"]);
        assert(bg < 50, `chip surface should be dark in ${name}, got L=${bg}`);
    }
});

await run();
