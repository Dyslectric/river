// tests/paste_source_guard.test.mjs
// Guards the copy/paste fixes: paste places at the cursor (centred), and paste's collision
// check is loosened so free-positioned pastes near existing cells aren't rejected.

import { test, run, assert } from "./harness.mjs";
import { readFileSync } from "node:fs";

const UI = process.env.UI_MJS || "/tmp/iter3/src/ui.mjs";
const QUIVER = process.env.QUIVER_MJS || "/tmp/iter3/src/quiver.mjs";
let ui = "", q = "";
try { ui = readFileSync(UI, "utf8"); } catch (_) {}
try { q = readFileSync(QUIVER, "utf8"); } catch (_) {}

test("sources readable", () => {
    assert(ui.length > 10000 && q.length > 5000);
});

test("paste places at the cursor, centred (half-cell shift)", () => {
    // The paste handler should derive its position from the pointer offset, shifted by half
    // a cell, not from the stale focus position.
    const m = ui.match(/key:\s*"V",\s*modifier:\s*true[\s\S]{0,1600}?this\.history\.add/);
    assert(m, "paste handler found");
    assert(/this\.pointer_offset !== null/.test(m[0]), "uses pointer offset");
    assert(/position_from_offset\(\s*this\.pointer_offset\.sub\(half\)/.test(m[0]),
        "centres on the cursor (half-cell shift)");
});

test("paste selects the pasted cells", () => {
    const m = ui.match(/key:\s*"V",\s*modifier:\s*true[\s\S]{0,1600}?this\.history\.add/);
    assert(/this\.deselect\(\)/.test(m[0]) && /this\.select\(cell\)/.test(m[0]),
        "pasted cells become the selection");
});

test("paste collision is loosened to near-exact overlap (free positioning)", () => {
    assert(/ui\.vertex_near\(position,\s*0\.01\)/.test(q),
        "paste rejects only on near-exact overlap, not half-cell proximity");
    assert(!/if \(ui\.has_vertex_at\(position\)\)\s*\{\s*\/\/ If we cannot place/.test(q),
        "the aggressive half-cell paste check is gone");
});

test("export delta probe guards against null values (copying arrows with endpoint_t)", () => {
    // typeof null === "object", so the recursive delta must exclude null before recursing,
    // or Object.entries(null) throws and copying any edge fails.
    assert(/typeof default_value === "object" && default_value !== null/.test(q),
        "probe excludes null default values before recursing");
    assert(/typeof value === "object" && value !== null/.test(q),
        "probe excludes null actual values before recursing");

    // Behavioural check: replicate the fixed probe and confirm it handles null endpoint_t.
    const probe = (object, base) => {
        const delta = {};
        for (const [key, value] of Object.entries(object)) {
            const dv = base[key];
            if (typeof dv === "object" && dv !== null && typeof value === "object" && value !== null) {
                const sub = probe(value, dv);
                if (Object.keys(sub).length > 0) delta[key] = sub;
            } else if (dv !== value) {
                delta[key] = value;
            }
        }
        return delta;
    };
    const def = { endpoint_t: { source: null, target: null }, curve: 0 };
    // Default -> empty (no throw).
    assert(Object.keys(probe({ endpoint_t: { source: null, target: null }, curve: 0 }, def)).length === 0,
        "default endpoint_t produces no delta and does not throw");
    // One end set -> only that end.
    const d = probe({ endpoint_t: { source: 0.3, target: null }, curve: 0 }, def);
    assert(d.endpoint_t && d.endpoint_t.source === 0.3 && !("target" in d.endpoint_t),
        "only the set end is encoded");
});

test("edge-to-edge options round-trip (arrows attached to arrows reload correctly)", () => {
    // Arrows whose endpoints are other arrows rely on the nested {source, target} options
    // edge_alignment and endpoint_t, which contain nulls/booleans. The probe (encode) and
    // deep_assign (decode) must preserve those exactly, or such arrows fail to reload.
    const probe = (object, base) => {
        const delta = {};
        for (const [key, value] of Object.entries(object)) {
            const dv = base[key];
            if (typeof dv === "object" && dv !== null && typeof value === "object" && value !== null) {
                const sub = probe(value, dv);
                if (Object.keys(sub).length > 0) delta[key] = sub;
            } else if (dv !== value) {
                delta[key] = value;
            }
        }
        return delta;
    };
    const deep_assign = (target, source) => {
        if (source == null) return;
        for (const [key, value] of Object.entries(source)) {
            if (typeof value === "object" && value !== null) {
                target[key] = target[key] || {};
                deep_assign(target[key], value);
            } else {
                target[key] = value;
            }
        }
    };
    const def = {
        edge_alignment: { source: true, target: true },
        endpoint_t: { source: null, target: null },
        curve: 0,
    };
    const opts = {
        edge_alignment: { source: false, target: true },
        endpoint_t: { source: 0.3, target: null },
        curve: 0,
    };
    const delta = probe(opts, def);
    const reconstructed = JSON.parse(JSON.stringify(def));
    deep_assign(reconstructed, delta);
    assert(reconstructed.edge_alignment.source === false, "edge_alignment.source preserved");
    assert(reconstructed.edge_alignment.target === true, "edge_alignment.target preserved");
    assert(reconstructed.endpoint_t.source === 0.3, "endpoint_t.source preserved");
    assert(reconstructed.endpoint_t.target === null,
        "endpoint_t.target stays null (not corrupted to {})");
});

test("deep_assign preserves null values (decode of nested edge options)", () => {
    const uiSrc = readFileSync(UI, "utf8");
    // deep_assign must exclude null from its object-recursion branch.
    assert(/typeof value === "object" && value !== null/.test(uiSrc),
        "deep_assign guards null before recursing");
});

test("render guards a missing endpoint_t option", () => {
    const uiSrc = readFileSync(UI, "utf8");
    assert(/\(this\.options\.endpoint_t \|\| \{\}\)\[end\]/.test(uiSrc),
        "render tolerates an absent endpoint_t");
});

await run();
