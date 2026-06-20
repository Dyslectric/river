// tests/identity_source_guard.test.mjs
// Asserts the REAL ui.mjs contains the Stage A identity plumbing, so it can't be silently
// dropped by a later edit. Reads the edited source directly.

import { test, run, assert } from "./harness.mjs";
import { readFileSync } from "node:fs";

const UI = process.env.UI_MJS || "/tmp/iter3/src/ui.mjs";
let src = "";
try { src = readFileSync(UI, "utf8"); } catch (_) { src = ""; }

test("ui.mjs is readable", () => {
    assert(src.length > 10000, `expected ui.mjs at ${UI}`);
});

test("Cell has a stable uid field", () => {
    assert(/this\.id\s*=\s*Cell\.NEXT_UID\+\+/.test(src),
        "Cell constructor should assign this.id = Cell.NEXT_UID++");
    assert(/Cell\.NEXT_UID\s*=\s*0/.test(src), "Cell.NEXT_UID must be initialised");
});

test("UI builds a cells_by_id identity index", () => {
    assert(/this\.cells_by_id\s*=\s*new Map\(\)/.test(src),
        "UI should declare this.cells_by_id");
});

test("add_cell indexes by id", () => {
    assert(/this\.cells_by_id\.set\(cell\.id,\s*cell\)/.test(src),
        "add_cell should index the cell by id");
});

test("remove_cell de-indexes by id", () => {
    assert(/this\.cells_by_id\.delete\(removed\.id\)/.test(src),
        "remove_cell should remove the cell from the id index");
});

test("position map is still vertex-keyed (behaviour unchanged in Stage A)", () => {
    // Stage A keeps the positions map as the behavioural source of truth.
    assert(/this\.positions\.set\(`\$\{cell\.position\}`,\s*cell\)/.test(src),
        "positions map should still be maintained in Stage A");
});

await run();
