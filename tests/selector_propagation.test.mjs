// tests/selector_propagation.test.mjs
// Regression for the iter3 browser bug: clicking the theme dropdown leaked pointer
// events to quiver's document-level canvas handlers (starting a drag/deselect).
// The selector must stop pointer/mouse/touch *down* events (not just `click`) at its root.

import { test, run, assert, assertEq } from "./harness.mjs";
import { makeDocument, makeWindow } from "./dom_shim.mjs";

globalThis.window = makeWindow();
const { ThemeSelector } = await import("../src/theme_selector.mjs");

function setup() {
    const doc = makeDocument();
    doc.documentElement.dataset.theme = "light";

    // Emulate quiver's document-level handlers (the things that must NOT fire when the
    // user interacts with the selector).
    const canvasEvents = [];
    for (const type of ["pointerdown", "mousedown", "touchstart", "pointerup", "mouseup"]) {
        doc.addEventListener(type, (e) => canvasEvents.push({ type, target: e.target }));
    }

    const sel = new ThemeSelector({
        doc,
        themes: ["light", "dark", "mocha"],
        applyTheme: () => {},
    });
    sel.mount(doc.body);
    return { doc, sel, canvasEvents };
}

// Helper to dispatch a bubbling pointer-type event from a node.
function fireFrom(node, type) {
    node.dispatchEvent({ type, target: node, bubbles: true, preventDefault() {} });
}

test("pointerdown on the button does not reach document handlers", () => {
    const { sel, canvasEvents } = setup();
    fireFrom(sel.button, "pointerdown");
    assertEq(canvasEvents.length, 0, "no document pointerdown should fire");
});

test("mousedown on a menu item does not reach document handlers", () => {
    const { sel, canvasEvents } = setup();
    sel.show();
    fireFrom(sel.items.get("dark"), "mousedown");
    assertEq(canvasEvents.length, 0, "no document mousedown should fire");
});

test("touchstart on the root does not reach document handlers", () => {
    const { sel, canvasEvents } = setup();
    fireFrom(sel.root, "touchstart");
    assertEq(canvasEvents.length, 0, "no document touchstart should fire");
});

test("pointerup inside the selector does not reach document handlers", () => {
    const { sel, canvasEvents } = setup();
    sel.show();
    fireFrom(sel.items.get("mocha"), "pointerup");
    assertEq(canvasEvents.length, 0, "no document pointerup should fire");
});

test("control: a pointerdown OUTSIDE the selector still reaches document handlers", () => {
    const { doc, canvasEvents } = setup();
    const outside = doc.createElement("div");
    doc.body.appendChild(outside);
    fireFrom(outside, "pointerdown");
    assert(canvasEvents.length >= 1, "outside pointerdown should reach the canvas/document");
    assertEq(canvasEvents[0].type, "pointerdown");
});

test("click still works for selection despite the down-event guard", () => {
    const doc = makeDocument();
    doc.documentElement.dataset.theme = "light";
    const calls = [];
    const sel = new ThemeSelector({
        doc, themes: ["light", "dark"], applyTheme: (n) => calls.push(n),
    });
    sel.mount(doc.body);
    sel.show();
    sel.items.get("dark").click();
    assertEq(calls.length, 1, "selection click still fires");
    assertEq(calls[0], "dark");
});

await run();
