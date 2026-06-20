// theme.mjs — a Dedekind-inspired token/preset engine for quiver.
//
// Drop this in src/theme.mjs. It defines named palettes, derives the full set of
// CSS custom properties from each, injects them into :root, and persists the choice.
//
// Design notes:
// - quiver already declares ~17 CSS vars in main.css. This module is the source of
//   truth for ALL of them plus the greys that were previously hardcoded downstream.
// - The model mirrors Dedekind's theme/presets.js: a small palette object per theme,
//   and a buildTheme() that expands it into the variable set the UI consumes. We do it
//   in plain JS (no React) so it fits quiver's vanilla stack.
// - Palette *values* (e.g. Catppuccin hexes) are just data. Avoid copying Dedekind's
//   buildTheme CODE verbatim — Dedekind is GPL-3.0, quiver is MIT.

/// Base palettes. Each is the minimal set of "raw" colours a theme is defined by;
/// buildTheme() expands these into the ~30 semantic variables the app uses.
export const PALETTES = {
    light: {
        // The canvas / page is effectively white in quiver's original design.
        ink:        "hsl(0, 0%, 0%)",      // arrows, text, default foreground
        paper:      "hsl(0, 0%, 100%)",    // canvas background
        panel:      "hsl(0, 0%, 96%)",     // UI panel background
        panel_2:    "hsl(0, 0%, 90%)",     // secondary panel / buttons
        line:       "hsla(0, 0%, 0%, 0.2)",// borders, grid lines
        accent:     "hsl(200, 100%, 45%)", // selection blue (slightly deeper)
        accent_text: "hsl(200, 100%, 38%)", // accent as foreground text
        on_accent:  "hsl(0, 0%, 100%)",     // text on the accent surface
        highlight:  "hsl(30, 100%, 50%)",  // highlight orange
        error:      "hsl(0, 50%, 50%)",
        warning:    "hsl(50, 100%, 70%)",
        // Fixed-role dark "chip" surface (toolbar/tooltips/dark controls) and its text.
        // Dark across ALL themes so its light text always contrasts.
        chip:            "hsl(0, 0%, 12%)",
        chip_text:       "hsl(0, 0%, 96%)",
        chip_text_faded: "hsl(0, 0%, 72%)",
        // Whether overlays should be dark-on-light (light theme) — controls the
        // alpha-overlay polarity for hover/selected cells.
        overlay_on_light: true,
    },

    dark: {
        ink:        "hsl(0, 0%, 90%)",
        paper:      "hsl(0, 0%, 10%)",
        panel:      "hsl(0, 0%, 15%)",
        panel_2:    "hsl(0, 0%, 22%)",
        line:       "hsla(0, 0%, 100%, 0.2)",
        accent:     "hsl(200, 90%, 60%)",
        accent_text: "hsl(200, 90%, 70%)",
        on_accent:  "hsl(0, 0%, 8%)",       // dark text on the bright accent
        highlight:  "hsl(30, 100%, 55%)",
        error:      "hsl(0, 55%, 55%)",
        warning:    "hsl(50, 100%, 70%)",
        chip:            "hsl(0, 0%, 18%)",
        chip_text:       "hsl(0, 0%, 95%)",
        chip_text_faded: "hsl(0, 0%, 68%)",
        overlay_on_light: false,
    },

    // ---- Catppuccin flavours (palette values only — data, not GPL code). ----
    // Official hexes from https://catppuccin.com/palette. Role mapping follows the
    // Catppuccin style guide: base = surface/paper, mantle = panel, surface0 = secondary
    // surface & chip, text = ink, subtext0 = faded text, blue = accent, peach = highlight,
    // red = error, yellow = warning. Latte is the light flavour.
    latte: {
        ink:             "#4c4f69", // text
        paper:           "#eff1f5", // base
        panel:           "#e6e9ef", // mantle
        panel_2:         "#ccd0da", // surface0
        line:            "hsla(231, 14%, 35%, 0.18)",
        accent:          "#1e66f5", // blue
        accent_text:     "#1e66f5", // already deep enough for foreground
        on_accent:       "#eff1f5", // base — light text on the deep blue
        on_accent_faded: "hsla(0, 0%, 100%, 0.6)",
        highlight:       "#fe640b", // peach
        error:           "#d20f39", // red
        warning:         "#df8e1d", // yellow
        chip:            "#4c4f69", // text (dark chip on a light theme)
        chip_text:       "#eff1f5", // base
        chip_text_faded: "#ccd0da", // surface0
        overlay_on_light: true,
    },

    frappe: {
        ink:             "#c6d0f5", // text
        paper:           "#303446", // base
        panel:           "#292c3c", // mantle
        panel_2:         "#414559", // surface0
        line:            "hsla(227, 24%, 87%, 0.16)",
        accent:          "#8caaee", // blue
        accent_text:     "#8caaee", // pastel reads as foreground on dark surfaces
        on_accent:       "#232634", // crust — dark text on the pastel accent
        highlight:       "#ef9f76", // peach
        error:           "#e78284", // red
        warning:         "#e5c890", // yellow
        chip:            "#414559", // surface0
        chip_text:       "#c6d0f5", // text
        chip_text_faded: "#a5adce", // subtext0
        overlay_on_light: false,
    },

    macchiato: {
        ink:             "#cad3f5", // text
        paper:           "#24273a", // base
        panel:           "#1e2030", // mantle
        panel_2:         "#363a4f", // surface0
        line:            "hsla(228, 39%, 88%, 0.16)",
        accent:          "#8aadf4", // blue
        accent_text:     "#8aadf4",
        on_accent:       "#181926", // crust
        highlight:       "#f5a97f", // peach
        error:           "#ed8796", // red
        warning:         "#eed49f", // yellow
        chip:            "#363a4f", // surface0
        chip_text:       "#cad3f5", // text
        chip_text_faded: "#a5adcb", // subtext0
        overlay_on_light: false,
    },

    mocha: {
        ink:             "#cdd6f4", // text
        paper:           "#1e1e2e", // base
        panel:           "#181825", // mantle
        panel_2:         "#313244", // surface0
        line:            "hsla(226, 64%, 88%, 0.18)",
        accent:          "#89b4fa", // blue
        accent_text:     "#89b4fa",
        on_accent:       "#11111b", // crust
        highlight:       "#fab387", // peach
        error:           "#f38ba8", // red
        warning:         "#f9e2af", // yellow
        chip:            "#313244", // surface0
        chip_text:       "#cdd6f4", // text
        chip_text_faded: "#a6adc8", // subtext0
        overlay_on_light: false,
    },
};

/// Expand a palette into the full semantic variable set. This is the analogue of
/// Dedekind's buildTheme(): raw colours in, named tokens out. Add a token here and it
/// becomes available app-wide as var(--token-name).
export function buildTheme(p) {
    // Overlay colour used for hover/selected/source/target cell tints. On light themes
    // we tint with translucent black; on dark themes with translucent white, so the
    // tint reads against the paper either way.
    const tint = (a) => p.overlay_on_light
        ? `hsla(0, 0%, 0%, ${a})`
        : `hsla(0, 0%, 100%, ${a})`;

    return {
        // Foreground / background.
        "--ink": p.ink,                 // NEW: themable replacement for literal "black"
        "--ink-faded": p.overlay_on_light // canvas hint/placeholder text (dim foreground)
            ? "hsla(0, 0%, 0%, 0.4)"
            : "hsla(0, 0%, 100%, 0.4)",
        "--paper": p.paper,             // NEW: canvas background (was transparent/white)

        // UI colours (names kept compatible with quiver's existing main.css).
        // `--ui-black` / `--ui-white` denote a FIXED-ROLE dark chip surface and its light
        // text (the toolbar, tooltips, dark controls). They must NOT invert per theme, or
        // text and background collapse to the same lightness. We bind them to dedicated
        // chip roles instead of ink/panel.
        "--ui-black": p.chip,           // dark chip surface (toolbar background)
        "--ui-white": p.chip_text,      // light text on the chip
        "--ui-blue": p.accent,
        // Text/glyph colour to sit ON the accent when accent is used as a BACKGROUND
        // (selection chips, active toolbar, selected hints). Catppuccin accents are bright
        // pastels, so light text on them is invisible — they need dark text. We use the
        // theme's deepest surface (crust/paper) for guaranteed contrast.
        "--ui-on-accent": p.on_accent,
        // A dimmed version of on-accent for placeholder text inside a focused (accent-
        // filled) input. on_accent is dark on the bright pastel accents, so this is a
        // dark translucent by default; light themes with a deep accent can override.
        "--ui-on-accent-faded": p.on_accent_faded || "hsla(0, 0%, 0%, 0.5)",
        // A deeper accent for use as FOREGROUND text/borders on light surfaces, where the
        // bright pastel accent would wash out. Falls back to the accent if unset.
        "--ui-blue-text": p.accent_text || p.accent,
        "--ui-orange": p.highlight,
        "--ui-background": p.paper,     // was `transparent`; now explicit so dark works
        "--ui-border": p.line,
        "--ui-hover": tint(0.10),
        "--ui-active": tint(0.20),
        "--ui-focus": p.accent,
        "--ui-text": p.ink,
        "--ui-error": p.error,
        "--ui-warning": p.warning,

        // Toolbar label text on the dark chip. Two tiers: normal and "faded" (disabled).
        // Both are light, on the chip surface, with comfortable contrast.
        "--ui-chip-text": p.chip_text,
        "--ui-chip-text-faded": p.chip_text_faded,

        // Secondary surfaces.
        "--ui-panel": p.panel,
        "--ui-panel-2": p.panel_2,

        // Cell states.
        "--cell-hover": tint(0.10),
        "--cell-selected": tint(0.20),
        "--cell-source": tint(0.20),
        "--cell-target": tint(0.20),

        // Grid lines.
        "--grid-line": p.line,
    };
}

const STORAGE_KEY = "quiver-theme";
const VALID = new Set(Object.keys(PALETTES));

/// Apply a named theme: write all variables onto :root and tag it for CSS selectors.
export function applyTheme(name) {
    if (!VALID.has(name)) name = "light";
    const vars = buildTheme(PALETTES[name]);
    const root = document.documentElement;
    for (const [k, v] of Object.entries(vars)) {
        root.style.setProperty(k, v);
    }
    root.dataset.theme = name;
    try { localStorage.setItem(STORAGE_KEY, name); } catch (_) { /* ignore */ }
    // Let the arrow renderer (which writes SVG fills in JS, not CSS) re-read --ink.
    window.dispatchEvent(new CustomEvent("quiver-theme-change", { detail: { name } }));
}

/// The currently active theme name (persisted, defaulting to OS preference).
export function initialTheme() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && VALID.has(saved)) return saved;
    } catch (_) { /* ignore */ }
    const prefersDark = window.matchMedia
        && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
}

/// Read a themable colour from the CSS layer, for code that paints to SVG/canvas
/// (e.g. arrow.mjs) and therefore can't rely on CSS cascade. Falls back to black.
export function themeColour(varName, fallback = "black") {
    const v = getComputedStyle(document.documentElement)
        .getPropertyValue(varName).trim();
    return v || fallback;
}

/// Call once at startup.
export function setupTheme() {
    applyTheme(initialTheme());
}
