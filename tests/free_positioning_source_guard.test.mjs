// tests/free_positioning_source_guard.test.mjs
// Asserts the REAL ui.mjs / quiver.mjs contain the Stage C free-positioning plumbing.

import { test, run, assert } from "./harness.mjs";
import { readFileSync } from "node:fs";

const UI = process.env.UI_MJS || "/tmp/iter3/src/ui.mjs";
const QUIVER = process.env.QUIVER_MJS || "/tmp/iter3/src/quiver.mjs";
let ui = "", quiver = "";
try { ui = readFileSync(UI, "utf8"); } catch (_) {}
try { quiver = readFileSync(QUIVER, "utf8"); } catch (_) {}

test("sources are readable", () => {
    assert(ui.length > 10000 && quiver.length > 5000, "ui.mjs and quiver.mjs present");
});

test("position_from_offset takes a snap flag", () => {
    assert(/position_from_offset\(offset,\s*snap\s*=\s*true\)/.test(ui),
        "position_from_offset(offset, snap = true)");
});

test("position_from_event places freely by default (grid removed)", () => {
    // The flexible grid has been removed, so all placement is free — snapping is no longer
    // derived from the Alt key; the default is simply free.
    assert(/position_from_event\(event,\s*snap\s*=\s*false\)/.test(ui),
        "snap defaults to false (free placement)");
});

test("free branch computes a fractional position", () => {
    assert(/col\s*\+\s*col_frac/.test(ui) && /row\s*\+\s*row_frac/.test(ui),
        "fractional position assembled from col/row + fraction");
});

test("vertex_at is now spatial (radius lookup), not a map read", () => {
    assert(/vertex_at\(position\)\s*\{\s*return this\.vertex_near\(position,\s*0\.5\)/.test(
        ui.replace(/\n/g, " ").replace(/\s+/g, " ")),
        "vertex_at delegates to vertex_near");
});

test("grid_key buckets fractional positions for the flexible grid", () => {
    assert(/grid_key\(coord\)\s*\{\s*return Math\.round\(coord\)/.test(
        ui.replace(/\n/g, " ").replace(/\s+/g, " ")),
        "grid_key rounds");
    assert(/grid_key\(cell\.position\.x\)/.test(ui), "constraints keyed by grid_key");
});

test("vertex_near can exclude the dragged selection", () => {
    assert(/vertex_near\(position,\s*radius\s*=\s*0\.5,\s*exclude\s*=\s*null\)/.test(ui),
        "vertex_near has an exclude parameter");
    assert(/this\.mode\.selection\)/.test(ui), "drag collision passes the selection to exclude");
});

test("import collision check uses the spatial helper", () => {
    // Paste/import rejects placement only on near-exact overlap (free positioning allows
    // overlapping), via a tight-radius spatial query.
    assert(/ui\.vertex_near\(position,\s*0\.01\)/.test(quiver)
        || /ui\.has_vertex_at\(position\)/.test(quiver),
        "quiver import uses a spatial occupancy check");
});

test("vertex move is gated behind Ctrl (Ctrl+Alt frees it)", () => {
    // The vertex content_element pointerdown should start a move on Ctrl, suppressing
    // the connect-arming, and Ctrl must no longer trigger panning.
    assert(/event\.ctrlKey && this\.is_vertex\(\)/.test(ui),
        "vertex move requires Ctrl on a vertex");
    assert(!/new UIMode\.Pan\("Control"\)/.test(ui),
        "Ctrl should no longer be bound to panning");
});

test("decoder accepts fractional vertex positions (float), not naturals", () => {
    // The share-URL 'malformed diagram' bug: positions were validated as naturals, which
    // rejected free-positioned (fractional) vertices. They must now be floats.
    const decodeRegion = quiver.match(/this cell is a vertex[\s\S]*?assert_kind\(label, "string"\)/i);
    assert(decodeRegion, "vertex decode block found");
    assert(/assert_kind\(x, "float"\)/.test(decodeRegion[0]), "x validated as float");
    assert(/assert_kind\(y, "float"\)/.test(decodeRegion[0]), "y validated as float");
});

test("edge endpoints remain natural (array indices, not positions)", () => {
    assert(/assert_kind\(endpoint, "natural"\)/.test(quiver),
        "edge endpoint indices stay natural");
});

await run();

// (Appended) 8-direction constraint guard.
import { readFileSync as _rf } from "node:fs";
test("Ctrl+Alt+Shift drag constrains free move to 8 directions", () => {
    const s = _rf(process.env.UI_MJS || "/tmp/iter3/src/ui.mjs", "utf8");
    assert(/constrain_to_8_directions\(origin,\s*position\)/.test(s),
        "8-direction helper defined");
    assert(/event\.ctrlKey && event\.altKey && event\.shiftKey/.test(s),
        "gated on Ctrl+Alt+Shift");
    assert(/Math\.round\(Math\.atan2\(delta\.y,\s*delta\.x\)\s*\/\s*step\)/.test(s),
        "snaps angle to 45° steps");
});
