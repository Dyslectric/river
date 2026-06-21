// tests/curve_drag_source_guard.test.mjs
// Guards that the real ui.mjs contains the Stage D drag-to-curve plumbing.

import { test, run, assert } from "./harness.mjs";
import { readFileSync } from "node:fs";

const UI = process.env.UI_MJS || "/tmp/iter3/src/ui.mjs";
let src = "";
try { src = readFileSync(UI, "utf8"); } catch (_) {}

test("ui.mjs is readable", () => {
    assert(src.length > 10000, `expected ui.mjs at ${UI}`);
});

test("CurveDrag mode is defined", () => {
    assert(/UIMode\.CurveDrag\s*=\s*class extends UIMode/.test(src),
        "UIMode.CurveDrag class present");
});

test("curve_and_skew_from_drag helper is defined", () => {
    assert(/static curve_and_skew_from_drag\(A,\s*B,\s*P\)/.test(src),
        "curve/skew math helper present");
    assert(/CONSTANTS\.CURVE_HEIGHT \* 2/.test(src), "uses the CURVE_HEIGHT*2 conversion");
});

test("Alt+drag on an edge enters CurveDrag (not a separate handle)", () => {
    // Curving is gated on Alt held while pressing a non-vertex (edge), intercepted before
    // the higher-arrow connect arms. Plain drag out of an edge still draws a next arrow.
    assert(/event\.altKey && !this\.is_vertex\(\)/.test(src),
        "Alt + edge press starts curving");
    assert(/new UIMode\.CurveDrag\(ui,\s*this\)/.test(src),
        "the intercept enters CurveDrag");
    assert(!/class:\s*"curve-handle"/.test(src),
        "the separate plain-drag curve handle is removed");
});

test("pointermove applies curve/skew live while curve-dragging", () => {
    assert(/this\.in_mode\(UIMode\.CurveDrag\)/.test(src), "CurveDrag handled in pointermove");
    assert(/edge\.options\.curve = curve/.test(src), "applies fractional curve");
    assert(/edge\.options\.skew = skew/.test(src), "applies skew");
});

test("pointerup commits a curve history action including skew", () => {
    assert(/kind:\s*"curve"/.test(src), "emits a curve history action");
    assert(/skew_from:/.test(src) && /skew_to:/.test(src), "records skew for undo");
});

test("the curve history case restores skew", () => {
    assert(/curve\.skew_from !== undefined/.test(src),
        "curve undo restores skew when present");
});

test("the URL codec accepts fractional curve and validates skew", () => {
    const QUIVER = process.env.QUIVER_MJS || "/tmp/iter3/src/quiver.mjs";
    let q = "";
    try { q = readFileSync(QUIVER, "utf8"); } catch (_) {}
    assert(q.length > 5000, "quiver.mjs readable");
    assert(/assert_kind\(options\.curve,\s*"float"\)/.test(q),
        "curve decoded as float (not integer)");
    assert(!/assert_kind\(options\.curve,\s*"integer"\)/.test(q),
        "the integer curve check is gone");
    assert(/assert_kind\(options\.skew,\s*"float"\)/.test(q), "skew decoded as float");
    assert(/options\.skew >= -1 && options\.skew <= 1/.test(q), "skew range checked");
});

test("skew is a first-class default edge option", () => {
    assert(/skew:\s*0,/.test(src), "Edge.default_options includes skew: 0");
});

await run();
