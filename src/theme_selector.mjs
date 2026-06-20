// src/theme_selector.mjs
//
// A top-right button that opens a small popup menu of themes. Selecting one calls
// applyTheme() from theme.mjs; the active theme is checked. Closes on outside-click,
// Escape, or selection.
//
// Design:
//  - Plain DOM, but `document` is injectable (constructor opt) so it's testable under a
//    light shim and trivially swappable for quiver's DOM.Element wrapper if you prefer.
//  - Reflects external theme changes: listens for the `quiver-theme-change` event that
//    theme.mjs fires, so if the theme is changed elsewhere (keyboard shortcut, startup),
//    the menu's checkmark stays in sync.
//  - No inline colours — everything themable is driven by the CSS tokens, so the
//    selector itself reskins with the rest of the UI.
//
// Drop-in: `new ThemeSelector({ applyTheme, themes }).mount(document.body)`.
// In quiver you'd mount it into the toolbar/header container instead of body.

import { PALETTES, applyTheme as defaultApply } from "./theme.mjs";

const DEFAULT_LABELS = {
    light: "Light",
    dark: "Dark",
    latte: "Catppuccin Latte",
    frappe: "Catppuccin Frappé",
    macchiato: "Catppuccin Macchiato",
    mocha: "Catppuccin Mocha",
};

export class ThemeSelector {
    /// opts:
    ///   doc        - document to build in (default: global document)
    ///   applyTheme - fn(name) to switch theme (default: theme.mjs applyTheme)
    ///   themes     - ordered array of theme names (default: keys of PALETTES)
    ///   labels     - map name -> display label
    ///   getActive  - fn() -> current theme name (default: reads :root dataset)
    constructor(opts = {}) {
        this.doc = opts.doc || (typeof document !== "undefined" ? document : null);
        if (!this.doc) throw new Error("ThemeSelector needs a document.");
        this.applyTheme = opts.applyTheme || defaultApply;
        this.themes = opts.themes || Object.keys(PALETTES);
        this.labels = Object.assign({}, DEFAULT_LABELS, opts.labels || {});
        this.getActive = opts.getActive
            || (() => this.doc.documentElement.dataset.theme || this.themes[0]);

        this.open = false;
        this._build();
        this._wire_global_listeners();
    }

    _build() {
        const d = this.doc;

        // Root container, fixed to the top-right of the viewport.
        this.root = d.createElement("div");
        this.root.className = "theme-selector";
        this.root.setAttribute("data-component", "theme-selector");

        // Stop pointer/mouse/touch interactions on the selector from reaching the canvas
        // or the document-level handlers quiver attaches (which would start a drag, pan,
        // or deselect). The host app listens on *down*/*start* (not just click), so we must
        // swallow those specifically. Outside-click handling still works because we listen
        // for `click` on the document separately and check containment.
        const swallow = (e) => { e.stopPropagation(); };
        for (const type of [
            "pointerdown", "mousedown", "touchstart",
            "pointerup", "mouseup", "touchend",
            "dblclick", "contextmenu", "wheel",
        ]) {
            this.root.addEventListener(type, swallow);
        }

        // The toggle button.
        this.button = d.createElement("button");
        this.button.className = "theme-selector__button";
        this.button.setAttribute("type", "button");
        this.button.setAttribute("aria-haspopup", "menu");
        this.button.setAttribute("aria-expanded", "false");
        this.button.setAttribute("title", "Change theme");
        this.button.setAttribute("aria-label", "Change theme");
        // A simple glyph; swap for an SVG icon to match quiver's icon set if desired.
        this.button.textContent = "◑";
        this.button.addEventListener("click", (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // The popup menu.
        this.menu = d.createElement("ul");
        this.menu.className = "theme-selector__menu";
        this.menu.setAttribute("role", "menu");
        this.menu.hidden = true;

        this.items = new Map();
        for (const name of this.themes) {
            const li = d.createElement("li");
            li.setAttribute("role", "none");

            const item = d.createElement("button");
            item.className = "theme-selector__item";
            item.setAttribute("type", "button");
            item.setAttribute("role", "menuitemradio");
            item.dataset.theme = name;
            item.textContent = this.labels[name] || name;
            item.addEventListener("click", (e) => {
                e.stopPropagation();
                this.select(name);
            });

            li.appendChild(item);
            this.menu.appendChild(li);
            this.items.set(name, item);
        }

        this.root.appendChild(this.button);
        this.root.appendChild(this.menu);

        this._sync_active();
    }

    _wire_global_listeners() {
        const d = this.doc;
        // Outside-click closes the menu.
        this._onDocClick = (e) => {
            if (this.open && !this.root.contains(e.target)) this.close();
        };
        d.addEventListener("click", this._onDocClick);

        // Escape closes the menu.
        this._onKeydown = (e) => {
            if (this.open && e.key === "Escape") {
                this.close();
                this.button.focus && this.button.focus();
            }
        };
        d.addEventListener("keydown", this._onKeydown);

        // External theme changes keep the checkmark in sync.
        const target = (typeof window !== "undefined") ? window : d;
        this._onThemeChange = () => this._sync_active();
        target.addEventListener("quiver-theme-change", this._onThemeChange);
        this._eventTarget = target;
    }

    /// Mark the active theme item as checked.
    _sync_active() {
        const active = this.getActive();
        for (const [name, item] of this.items) {
            const on = name === active;
            item.setAttribute("aria-checked", on ? "true" : "false");
            item.classList.toggle("is-active", on);
        }
    }

    toggle() { this.open ? this.close() : this.show(); }

    show() {
        this.open = true;
        this.menu.hidden = false;
        this.button.setAttribute("aria-expanded", "true");
        this.root.classList.add("is-open");
        this._sync_active();
    }

    close() {
        this.open = false;
        this.menu.hidden = true;
        this.button.setAttribute("aria-expanded", "false");
        this.root.classList.remove("is-open");
    }

    select(name) {
        this.applyTheme(name);
        this._sync_active(); // immediate; the event listener also covers external paths
        this.close();
    }

    /// Attach to a parent element (DOM node or anything with appendChild).
    mount(parent) {
        parent.appendChild(this.root);
        return this;
    }

    /// Tear down listeners and remove from the DOM.
    destroy() {
        this.doc.removeEventListener("click", this._onDocClick);
        this.doc.removeEventListener("keydown", this._onKeydown);
        this._eventTarget.removeEventListener("quiver-theme-change", this._onThemeChange);
        this.root.remove && this.root.remove();
    }
}

/// Convenience factory + mount in one call.
export function installThemeSelector(parent, opts = {}) {
    const sel = new ThemeSelector(opts);
    sel.mount(parent || opts.doc?.body || document.body);
    return sel;
}
