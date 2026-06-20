// tests/dom_shim.mjs — a small but faithful DOM fake for testing UI components in node.
// Supports: createElement, appendChild/removeChild/remove, classList, dataset,
// get/setAttribute, addEventListener/dispatchEvent (with bubbling), contains, click(),
// textContent, hidden, and a document-level event dispatch for click/keydown.

class FakeClassList {
    constructor(el) { this.el = el; this._set = new Set(); }
    add(...c) { c.forEach((x) => this._set.add(x)); this._reflect(); }
    remove(...c) { c.forEach((x) => this._set.delete(x)); this._reflect(); }
    toggle(c, force) {
        const want = force === undefined ? !this._set.has(c) : force;
        if (want) this._set.add(c); else this._set.delete(c);
        this._reflect();
        return want;
    }
    contains(c) { return this._set.has(c); }
    _reflect() { this.el._attrs.class = [...this._set].join(" "); }
}

class FakeNode {
    constructor(tag, doc) {
        this.tagName = (tag || "").toUpperCase();
        this.doc = doc;
        this.children = [];
        this.parentNode = null;
        this._attrs = {};
        this._listeners = new Map();
        this._text = "";
        this.classList = new FakeClassList(this);
        this.dataset = {};
        this.hidden = false;
        this.style = {};
    }
    get className() { return this._attrs.class || ""; }
    set className(v) {
        this._attrs.class = v;
        this.classList._set = new Set(v ? v.split(/\s+/).filter(Boolean) : []);
    }
    get textContent() {
        if (this.children.length === 0) return this._text;
        return this.children.map((c) => c.textContent).join("");
    }
    set textContent(v) { this._text = String(v); this.children = []; }
    setAttribute(k, v) { this._attrs[k] = String(v); if (k.startsWith("data-")) this.dataset[k.slice(5)] = String(v); }
    getAttribute(k) { return k in this._attrs ? this._attrs[k] : null; }
    removeAttribute(k) { delete this._attrs[k]; }
    appendChild(child) {
        child.parentNode = this;
        this.children.push(child);
        return child;
    }
    removeChild(child) {
        const i = this.children.indexOf(child);
        if (i >= 0) this.children.splice(i, 1);
        child.parentNode = null;
        return child;
    }
    remove() { if (this.parentNode) this.parentNode.removeChild(this); }
    contains(other) {
        if (other === this) return true;
        return this.children.some((c) => c.contains(other));
    }
    querySelectorAll(sel) {
        // supports ".class" and "[attr=val]"-free tag selectors only — enough for tests
        const out = [];
        const want = sel.replace(/^\./, "");
        const byClass = sel.startsWith(".");
        const walk = (n) => {
            for (const c of n.children) {
                if (byClass ? c.classList.contains(want) : c.tagName === sel.toUpperCase()) {
                    out.push(c);
                }
                walk(c);
            }
        };
        walk(this);
        return out;
    }
    addEventListener(type, fn) {
        if (!this._listeners.has(type)) this._listeners.set(type, []);
        this._listeners.get(type).push(fn);
    }
    removeEventListener(type, fn) {
        const arr = this._listeners.get(type);
        if (arr) {
            const i = arr.indexOf(fn);
            if (i >= 0) arr.splice(i, 1);
        }
    }
    dispatchEvent(event) {
        event.target = event.target || this;
        if (typeof event.stopPropagation !== "function") {
            event.stopPropagation = function () { event._stopped = true; };
        } else {
            const orig = event.stopPropagation;
            event.stopPropagation = function () { event._stopped = true; orig.call(event); };
        }
        let node = this;
        while (node) {
            const arr = node._listeners.get(event.type);
            if (arr) arr.slice().forEach((fn) => fn(event));
            if (event._stopped) break; // propagation halted
            node = event.bubbles ? node.parentNode : null;
        }
        return true;
    }
    click() {
        this.dispatchEvent({ type: "click", target: this, bubbles: true, preventDefault() {} });
    }
    focus() { this.doc._focused = this; }
}

export function makeDocument() {
    const doc = {
        documentElement: null,
        body: null,
        _focused: null,
        _listeners: new Map(),
        createElement(tag) { return new FakeNode(tag, doc); },
        createTextNode(t) { const n = new FakeNode("#text", doc); n._text = String(t); return n; },
        addEventListener(type, fn) {
            if (!doc._listeners.has(type)) doc._listeners.set(type, []);
            doc._listeners.get(type).push(fn);
        },
        removeEventListener(type, fn) {
            const arr = doc._listeners.get(type);
            if (arr) { const i = arr.indexOf(fn); if (i >= 0) arr.splice(i, 1); }
        },
        dispatchEvent(event) {
            const arr = doc._listeners.get(event.type);
            if (arr) arr.slice().forEach((fn) => fn(event));
            return true;
        },
    };
    doc.documentElement = new FakeNode("html", doc);
    doc.documentElement.dataset = {};
    doc.documentElement.style = {
        _m: new Map(),
        setProperty(k, v) { this._m.set(k, v); },
        getPropertyValue(k) { return this._m.get(k) || ""; },
    };
    doc.body = new FakeNode("body", doc);
    // Model the real bubble chain: a node's events bubble body -> documentElement, and we
    // bridge documentElement to the document-level listeners (where quiver attaches its
    // canvas/pointer handlers). This lets tests verify that stopPropagation on the selector
    // actually prevents document handlers from firing.
    doc.body.parentNode = doc.documentElement;
    const docElDispatchBridge = doc.documentElement._listeners;
    // When an event bubbles to documentElement, also invoke document-level listeners,
    // unless propagation was stopped before reaching here.
    const origAdd = doc.documentElement.addEventListener.bind(doc.documentElement);
    void origAdd; void docElDispatchBridge;
    doc.documentElement.parentNode = {
        _listeners: doc._listeners,
        get parentNode() { return null; },
    };
    return doc;
}

export function makeWindow() {
    const listeners = new Map();
    return {
        addEventListener(type, fn) {
            if (!listeners.has(type)) listeners.set(type, []);
            listeners.get(type).push(fn);
        },
        removeEventListener(type, fn) {
            const arr = listeners.get(type);
            if (arr) { const i = arr.indexOf(fn); if (i >= 0) arr.splice(i, 1); }
        },
        dispatchEvent(event) {
            const arr = listeners.get(event.type);
            if (arr) arr.slice().forEach((fn) => fn(event));
            return true;
        },
        matchMedia: () => ({ matches: false }),
        CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
    };
}

/// A document-level helper to simulate a click on a node (bubbles to document).
export function simulateClick(doc, node) {
    const event = { type: "click", target: node, bubbles: true, stopPropagation() {}, preventDefault() {} };
    // bubble through ancestors first (component listeners), then document.
    if (node.dispatchEvent) node.dispatchEvent(event);
    doc.dispatchEvent(event);
}

export function simulateKeydown(doc, key) {
    doc.dispatchEvent({ type: "keydown", key, target: doc.documentElement });
}
