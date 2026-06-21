// tests/v_create_source_guard.test.mjs
// Guard: pressing "v" with nothing selected creates a vertex under the cursor.

import { test, run, assert } from "./harness.mjs";
import { readFileSync } from "node:fs";

const UI = process.env.UI_MJS || "/tmp/iter3/src/ui.mjs";
let src = "";
try { src = readFileSync(UI, "utf8"); } catch (_) {}

test("ui.mjs is readable", () => {
    assert(src.length > 10000, `expected ui.mjs at ${UI}`);
});

test("the latest pointer offset is tracked on pointermove", () => {
    assert(/this\.pointer_offset\s*=\s*null/.test(src), "pointer_offset field declared");
    assert(/this\.pointer_offset\s*=\s*this\.offset_from_event\(event\)/.test(src),
        "pointer_offset updated on pointermove");
});

test("a 'v' shortcut is registered", () => {
    assert(/key:\s*"V",\s*context:\s*Shortcuts\.SHORTCUT_PRIORITY\.Defer/.test(src),
        "v shortcut registered");
});

test("'v' only creates when nothing is selected", () => {
    const m = src.match(/key:\s*"V",\s*context:[\s\S]{0,2000}?return true;\s*\}\);/);
    assert(m, "v shortcut body found");
    assert(/this\.selection\.size > 0/.test(m[0]), "guards on empty selection");
    assert(/return false;/.test(m[0]), "yields to other handlers when selected");
});

test("'v' creates a vertex centred under the cursor", () => {
    const m = src.match(/key:\s*"V",\s*context:[\s\S]{0,2000}?return true;\s*\}\);/);
    assert(/position_from_offset\(this\.pointer_offset\.sub\(half\),\s*false\)/.test(m[0]),
        "uses the pointer offset shifted by half a cell (centred)");
    assert(/new Vertex\(this,\s*label,\s*position\)/.test(m[0]), "creates a Vertex there");
    assert(/kind:\s*"create"/.test(m[0]), "commits to history");
});

// Centering math: a vertex's centre should land on the cursor. A position denotes a cell's
// top-left; the vertex renders centred, so we subtract half a cell from the cursor offset
// before converting to a position. Verify the round-trip lands the centre on the cursor.
test("half-cell shift centres the vertex on the cursor (math)", () => {
    const CELL = 128;
    // cursor at pixel (300, 200). Subtract half a cell -> (236, 136).
    const cursor = { x: 300, y: 200 };
    const shifted = { x: cursor.x - CELL / 2, y: cursor.y - CELL / 2 };
    // position (free) = shifted / CELL (uniform grid, origin 0).
    const pos = { x: shifted.x / CELL, y: shifted.y / CELL };
    // vertex centre = offset_from_position(pos) + half a cell = pos*CELL + CELL/2.
    const centre = { x: pos.x * CELL + CELL / 2, y: pos.y * CELL + CELL / 2 };
    assert(Math.abs(centre.x - cursor.x) < 1e-9, "centre x on cursor");
    assert(Math.abs(centre.y - cursor.y) < 1e-9, "centre y on cursor");
});

await run();
