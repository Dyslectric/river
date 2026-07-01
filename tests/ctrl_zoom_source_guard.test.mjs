// tests/ctrl_zoom_source_guard.test.mjs
// Guard: Ctrl+scroll zooms (in addition to Shift+scroll), at a slower rate.

import { test, run, assert } from "./harness.mjs";
import { readFileSync } from "node:fs";

const UI = process.env.UI_MJS || "/tmp/iter3/src/ui.mjs";
let src = "";
try { src = readFileSync(UI, "utf8"); } catch (_) {}

test("ui.mjs is readable", () => {
    assert(src.length > 10000, `expected ui.mjs at ${UI}`);
});

test("Ctrl or Shift scroll both zoom", () => {
    assert(/if \(event\.shiftKey \|\| event\.ctrlKey\)/.test(src),
        "wheel zoom triggers on Shift OR Ctrl");
});

test("Ctrl zoom is slower than Shift zoom", () => {
    // Ctrl-only uses a larger divisor (400) than Shift (100), i.e. a quarter of the rate.
    assert(/event\.ctrlKey && !event\.shiftKey \? 400 : 100/.test(src),
        "Ctrl-only zoom uses a 4x-slower divisor");
    assert(/event\.deltaY \/ zoom_divisor/.test(src),
        "zoom step divides deltaY by the chosen divisor");
});

await run();
