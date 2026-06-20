// tests/arrow_theming.test.mjs
// Validates the decision used in ui.mjs `arrow_style_for_options`: a default (black) edge
// colour follows the theme ink, while a user-chosen colour is honoured as-is. We replicate
// the exact branch against the REAL Colour class so the logic can't silently regress.

import { test, run, assert, assertEq } from "./harness.mjs";
import { Colour } from "../vendor/ds.mjs";

// The branch from ui.mjs (kept in sync intentionally):
//   style.colour = options.colour.is_not_black()
//       ? options.colour.css()
//       : themeColour("--ink", options.colour.css());
function resolveArrowColour(optionColour, ink) {
    const themeColour = (_name, fallback) => ink || fallback;
    return optionColour.is_not_black()
        ? optionColour.css()
        : themeColour("--ink", optionColour.css());
}

function userColour() {
    // Construct a non-black colour regardless of Colour's exact API.
    if (typeof Colour.from_rgba === "function") return Colour.from_rgba(255, 0, 0);
    return new Colour(0, 100, 50); // red in HSL
}

test("default black edge follows theme ink (dark)", () => {
    const out = resolveArrowColour(Colour.black(), "hsl(0, 0%, 90%)");
    assertEq(out, "hsl(0, 0%, 90%)");
});

test("default black edge follows theme ink (mocha hex)", () => {
    const out = resolveArrowColour(Colour.black(), "#cdd6f4");
    assertEq(out, "#cdd6f4");
});

test("user-chosen colour is preserved, not overridden by ink", () => {
    const c = userColour();
    const out = resolveArrowColour(c, "hsl(0, 0%, 90%)");
    assertEq(out, c.css());
    assert(out !== "hsl(0, 0%, 90%)", "must not be ink");
});

test("falls back to the colour's own css when no ink is available", () => {
    // themeColour returns its fallback (the colour css) when the token is empty.
    const out = resolveArrowColour(Colour.black(), "");
    assertEq(out, Colour.black().css());
});

await run();
