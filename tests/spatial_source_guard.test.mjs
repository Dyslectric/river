// tests/spatial_source_guard.test.mjs
// Asserts the REAL ui.mjs routes identity queries through the Stage B spatial helpers and
// has no stray direct position-map READS left (writes are allowed in Stage B).

import { test, run, assert } from "./harness.mjs";
import { readFileSync } from "node:fs";

const UI = process.env.UI_MJS || "/tmp/iter3/src/ui.mjs";
let src = "";
try { src = readFileSync(UI, "utf8"); } catch (_) { src = ""; }

test("ui.mjs is readable", () => {
    assert(src.length > 10000, `expected ui.mjs at ${UI}`);
});

test("vertex_at / has_vertex_at / vertex_near helpers are defined", () => {
    assert(/vertex_at\(position\)\s*\{/.test(src), "vertex_at defined");
    assert(/has_vertex_at\(position\)\s*\{/.test(src), "has_vertex_at defined");
    assert(/vertex_near\(position,\s*radius/.test(src), "vertex_near defined");
});

test("no direct position-map READS remain outside the helper definitions", () => {
    // Count positions.has( and positions.get( occurrences. The only legitimate ones are
    // the two inside vertex_at/has_vertex_at. Anything beyond that is an un-rerouted site.
    const reads = (src.match(/\.positions\.(has|get)\(/g) || []).length;
    assert(reads <= 2,
        `expected <=2 position reads (inside helpers only), found ${reads}`);
});

test("vertex_near scans the identity index, not the position map", () => {
    // It must iterate cells_by_id so it can see fractional/free vertices.
    const m = src.match(/vertex_near\(position[\s\S]*?cells_by_id\.values\(\)/);
    assert(m, "vertex_near should scan cells_by_id.values()");
});

test("call sites use the helpers (spot checks)", () => {
    // Drag collision goes through a spatial query (vertex_near with the dragged selection
    // excluded as of Stage C, or has_vertex_at in Stage B).
    assert(
        /this\.vertex_near\(new_position\(cell\)/.test(src)
        || /this\.has_vertex_at\(new_position\(cell\)\)/.test(src),
        "drag collision rerouted through a spatial helper");
    assert(/this\.vertex_at\(this\.focus_position\)/.test(src), "focus lookup rerouted");
    assert(
        /ui\.has_vertex_at\(cell\.position\)/.test(src)
        || /ui\.vertex_near\(cell\.position,\s*0\.5,\s*this\.selection\)/.test(src),
        "release collision rerouted (spatial, excluding the moving selection)");
});

await run();
