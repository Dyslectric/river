// tests/curve_drag_stage_d.test.mjs
// Stage D: dragging an edge midpoint into a curve. Tests the curve/skew-from-drag math
// against hand-computed ground truth (validated independently before the editor code was
// written). Uses the real Point from ds.mjs and mirrors UI.curve_and_skew_from_drag.

import { test, run, assert, assertClose } from "./harness.mjs";
import { Point } from "../vendor/ds.mjs";

const CURVE_HEIGHT = 24; // CONSTANTS.CURVE_HEIGHT

// Mirror of UI.curve_and_skew_from_drag (kept in sync with ui.mjs).
function curveAndSkew(A, B, P) {
    const chord = B.sub(A);
    const chord_len = chord.length();
    if (chord_len < 1e-6) return { curve: 0, skew: 0 };
    const dir = chord.div(chord_len);
    const normal = new Point(-dir.y, dir.x);
    const M = A.add(B).div(2);
    const PM = P.sub(M);
    const d = PM.x * normal.x + PM.y * normal.y;
    const s = PM.x * dir.x + PM.y * dir.y;
    const curve = d / (CURVE_HEIGHT * 2);
    const skew = Math.max(-1, Math.min(1, 2 * s / chord_len));
    return { curve, skew };
}

const A = new Point(0, 0), B = new Point(100, 0); // horizontal edge, len 100, M=(50,0)

test("perpendicular drag of 48px (one curve unit) gives curve 1, skew 0", () => {
    const r = curveAndSkew(A, B, new Point(50, 48));
    assertClose(r.curve, 1, 1e-9);
    assertClose(r.skew, 0, 1e-9);
});

test("half a unit (24px) gives curve 0.5 (fractional / 'harder curves')", () => {
    const r = curveAndSkew(A, B, new Point(50, 24));
    assertClose(r.curve, 0.5, 1e-9);
});

test("dragging onto the chord gives a straight edge (curve 0)", () => {
    const r = curveAndSkew(A, B, new Point(50, 0));
    assertClose(r.curve, 0, 1e-9);
    assertClose(r.skew, 0, 1e-9);
});

test("dragging the other way gives negative curve", () => {
    const r = curveAndSkew(A, B, new Point(50, -48));
    assertClose(r.curve, -1, 1e-9);
});

test("along-chord offset sets skew (toward B = positive)", () => {
    const r = curveAndSkew(A, B, new Point(75, 48));
    assertClose(r.curve, 1, 1e-9);
    assertClose(r.skew, 0.5, 1e-9); // 2 * 25 / 100
});

test("skew clamps to [-1, 1]", () => {
    const r = curveAndSkew(A, B, new Point(130, 48));
    assertClose(r.skew, 1, 1e-9);
    const r2 = curveAndSkew(A, B, new Point(-30, 48));
    assertClose(r2.skew, -1, 1e-9);
});

test("works for a rotated (vertical) edge", () => {
    // A=(0,0) B=(0,100); dir=(0,1); normal=(-1,0). P 48px to the right -> d=-48 -> curve -1.
    const r = curveAndSkew(new Point(0, 0), new Point(0, 100), new Point(48, 50));
    assertClose(r.curve, -1, 1e-9);
    assertClose(r.skew, 0, 1e-9);
});

test("degenerate zero-length edge yields no curve (no divide-by-zero)", () => {
    const r = curveAndSkew(new Point(5, 5), new Point(5, 5), new Point(10, 10));
    assertClose(r.curve, 0, 1e-9);
    assertClose(r.skew, 0, 1e-9);
});

test("inverts the forward conversion (curve -> pixels -> curve)", () => {
    // Forward: style.curve = options.curve * CURVE_HEIGHT * 2. So a curve of 0.75 is
    // 0.75*48 = 36px perpendicular; dragging to 36px must recover 0.75.
    const px = 0.75 * CURVE_HEIGHT * 2;
    const r = curveAndSkew(A, B, new Point(50, px));
    assertClose(r.curve, 0.75, 1e-9);
});

// --- codec: fractional curve + skew must round-trip (the URL break) --------------

function assert_kind(value, kind) {
    if (kind === "integer" || kind === "natural") {
        return Number.isInteger(value) && (kind !== "natural" || value >= 0);
    }
    if (kind === "float") return typeof value === "number";
    return false;
}

test("fractional curve FAILS the old integer check (root cause of URL break)", () => {
    assert(!assert_kind(0.75, "integer"), "0.75 is not an integer -> old decoder threw");
    assert(!assert_kind(-1.5, "integer"), "-1.5 is not an integer");
});

test("fractional curve PASSES the new float check", () => {
    assert(assert_kind(0.75, "float"), "fractional curve accepted");
    assert(assert_kind(-1.5, "float"), "negative fractional curve accepted");
    assert(assert_kind(2, "float"), "integer curve still accepted (old diagrams)");
});

test("skew validates as a float in [-1, 1]", () => {
    const valid = (s) => assert_kind(s, "float") && s >= -1 && s <= 1;
    assert(valid(0), "0 ok");
    assert(valid(0.5), "0.5 ok");
    assert(valid(-1), "-1 ok");
    assert(valid(1), "1 ok");
    assert(!valid(1.5), "1.5 out of range");
    assert(!valid(-2), "-2 out of range");
});

// Round-trip an edge options delta through JSON (mirrors the base64 codec's JSON layer).
test("curve and skew round-trip losslessly through JSON", () => {
    const options = { curve: 0.75, skew: -0.5 };
    const back = JSON.parse(JSON.stringify(options));
    assertClose(back.curve, 0.75, 1e-12);
    assertClose(back.skew, -0.5, 1e-12);
});

await run();
