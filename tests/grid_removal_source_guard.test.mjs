// tests/grid_removal_source_guard.test.mjs
// Guards that the flexible grid has been removed: uniform fixed cell size, no reflow,
// blank grid canvas, free placement. These together fixed the "rubber-banding" during
// free drags (the grid reflowing mid-move).

import { test, run, assert } from "./harness.mjs";
import { readFileSync } from "node:fs";

const UI = process.env.UI_MJS || "/tmp/iter3/src/ui.mjs";
let src = "";
try { src = readFileSync(UI, "utf8"); } catch (_) {}

test("ui.mjs is readable", () => {
    assert(src.length > 10000, `expected ui.mjs at ${UI}`);
});

test("cell_size returns a uniform fixed size (no flexible sizing)", () => {
    const m = src.match(/cell_size\(sizes,\s*index\)\s*\{[\s\S]*?\n    \}/);
    assert(m, "cell_size body found");
    assert(/return this\.default_cell_size;/.test(m[0]),
        "cell_size returns default_cell_size unconditionally");
    assert(!/sizes\.get\(index\)\s*\|\|/.test(m[0]),
        "the old variable-size lookup is gone");
});

test("update_col_row_size is a no-op returning false (no reflow)", () => {
    const m = src.match(/update_col_row_size\(\.\.\.positions\)\s*\{[\s\S]*?return false;/);
    assert(m, "update_col_row_size returns false early (no reflow)");
});

test("update_grid renders a blank canvas (no grid lines)", () => {
    const m = src.match(/\n    update_grid\(\)\s*\{[\s\S]*?\n    \}/);
    assert(m, "update_grid body found");
    assert(/clearRect/.test(m[0]), "update_grid clears the canvas");
    assert(/return;/.test(m[0]), "update_grid returns before drawing lines");
    assert(!/context\.lineTo/.test(m[0]), "no line drawing remains in update_grid");
});

test("placement is free by default", () => {
    assert(/position_from_event\(event,\s*snap\s*=\s*false\)/.test(src),
        "free placement default");
});

await run();
