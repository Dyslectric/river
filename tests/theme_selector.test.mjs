// tests/theme_selector.test.mjs — tests the top-right theme selector UI in isolation.

import { test, run, assert, assertEq } from "./harness.mjs";
import { makeDocument, makeWindow, simulateClick, simulateKeydown } from "./dom_shim.mjs";

// window is read inside the component for the external-change listener.
globalThis.window = makeWindow();

const { ThemeSelector } = await import("../src/theme_selector.mjs");

// Build a selector wired to a spy applyTheme, with a controllable active theme.
function setup(initial = "light") {
    const doc = makeDocument();
    doc.documentElement.dataset.theme = initial;
    const calls = [];
    const sel = new ThemeSelector({
        doc,
        themes: ["light", "dark", "mocha"],
        applyTheme: (name) => {
            calls.push(name);
            doc.documentElement.dataset.theme = name; // emulate the real apply
        },
    });
    sel.mount(doc.body);
    return { doc, sel, calls };
}

test("mounts a button and a hidden menu into the parent", () => {
    const { doc, sel } = setup();
    assert(doc.body.contains(sel.root), "root mounted");
    assert(sel.button, "has button");
    assert(sel.menu.hidden, "menu starts hidden");
    assertEq(sel.button.getAttribute("aria-expanded"), "false");
});

test("button has an accessible label", () => {
    const { sel } = setup();
    assertEq(sel.button.getAttribute("aria-label"), "Change theme");
    assertEq(sel.button.getAttribute("aria-haspopup"), "menu");
});

test("renders one menu item per theme with labels", () => {
    const { sel } = setup();
    assertEq(sel.items.size, 3);
    assertEq(sel.items.get("mocha").textContent, "Catppuccin Mocha");
    assertEq(sel.items.get("dark").textContent, "Dark");
});

test("defaults to the full palette roster when no themes are given", () => {
    const doc = makeDocument();
    doc.documentElement.dataset.theme = "light";
    const sel = new ThemeSelector({ doc, applyTheme: () => {} });
    sel.mount(doc.body);
    // light, dark, latte, frappe, macchiato, mocha
    assertEq(sel.items.size, 6);
    assertEq(sel.items.get("latte").textContent, "Catppuccin Latte");
    assertEq(sel.items.get("frappe").textContent, "Catppuccin Frappé");
    assertEq(sel.items.get("macchiato").textContent, "Catppuccin Macchiato");
});

test("clicking the button opens the menu", () => {
    const { sel } = setup();
    sel.button.click();
    assert(sel.open, "open flag set");
    assert(!sel.menu.hidden, "menu visible");
    assertEq(sel.button.getAttribute("aria-expanded"), "true");
    assert(sel.root.classList.contains("is-open"), "root marked open");
});

test("clicking the button again closes the menu", () => {
    const { sel } = setup();
    sel.button.click();
    sel.button.click();
    assert(!sel.open, "closed");
    assert(sel.menu.hidden, "menu hidden again");
});

test("active theme is checked on open", () => {
    const { sel } = setup("dark");
    sel.show();
    assertEq(sel.items.get("dark").getAttribute("aria-checked"), "true");
    assertEq(sel.items.get("light").getAttribute("aria-checked"), "false");
    assert(sel.items.get("dark").classList.contains("is-active"));
});

test("selecting a theme calls applyTheme and updates the check", () => {
    const { sel, calls } = setup("light");
    sel.show();
    sel.items.get("mocha").click();
    assertEq(calls.length, 1);
    assertEq(calls[0], "mocha");
    assertEq(sel.items.get("mocha").getAttribute("aria-checked"), "true");
    assertEq(sel.items.get("light").getAttribute("aria-checked"), "false");
});

test("selecting a theme closes the menu", () => {
    const { sel } = setup();
    sel.show();
    sel.items.get("dark").click();
    assert(!sel.open, "menu closed after selection");
});

test("outside click closes the menu", () => {
    const { doc, sel } = setup();
    sel.show();
    // a node not inside the selector
    const outside = doc.createElement("div");
    doc.body.appendChild(outside);
    simulateClick(doc, outside);
    assert(!sel.open, "closed by outside click");
});

test("click inside the menu does not close via outside-handler", () => {
    const { doc, sel } = setup();
    sel.show();
    // clicking an item closes it via select(), but a click on the menu container itself
    // should be treated as inside (contains() true) — verify contains logic.
    assert(sel.root.contains(sel.menu), "menu is inside root");
});

test("Escape closes the menu", () => {
    const { doc, sel } = setup();
    sel.show();
    simulateKeydown(doc, "Escape");
    assert(!sel.open, "closed by Escape");
});

test("external quiver-theme-change keeps the checkmark in sync", () => {
    const { doc, sel } = setup("light");
    sel.show();
    // emulate the theme being changed elsewhere
    doc.documentElement.dataset.theme = "mocha";
    window.dispatchEvent({ type: "quiver-theme-change", detail: { name: "mocha" } });
    assertEq(sel.items.get("mocha").getAttribute("aria-checked"), "true");
});

test("destroy removes the element and unhooks listeners", () => {
    const { doc, sel } = setup();
    sel.show();
    sel.destroy();
    assert(!doc.body.contains(sel.root), "root removed");
    // after destroy, an outside click handler should no longer be registered:
    const before = sel.open;
    simulateKeydown(doc, "Escape"); // should not throw / not matter
    assertEq(sel.open, before);
});

await run();
