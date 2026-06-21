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
    const curve = d / CURVE_HEIGHT; // apex follows pointer 1:1
    const skew = Math.max(-1, Math.min(1, 2 * s / chord_len));
    return { curve, skew };
}

const A = new Point(0, 0), B = new Point(100, 0); // horizontal edge, len 100, M=(50,0)

test("perpendicular drag's apex follows the pointer 1:1 (48px -> curve 2)", () => {
    // curve = d / CURVE_HEIGHT(24); 48/24 = 2. style.curve = 2*48 = 96; apex = 96/2 = 48 = d.
    const r = curveAndSkew(A, B, new Point(50, 48));
    assertClose(r.curve, 2, 1e-9);
    assertClose(r.skew, 0, 1e-9);
});

test("24px drag gives curve 1, apex at 24px = pointer (fractional / 'harder curves')", () => {
    const r = curveAndSkew(A, B, new Point(50, 24));
    assertClose(r.curve, 1, 1e-9);
});

test("dragging onto the chord gives a straight edge (curve 0)", () => {
    const r = curveAndSkew(A, B, new Point(50, 0));
    assertClose(r.curve, 0, 1e-9);
    assertClose(r.skew, 0, 1e-9);
});

test("dragging the other way gives negative curve", () => {
    const r = curveAndSkew(A, B, new Point(50, -48));
    assertClose(r.curve, -2, 1e-9);
});

test("along-chord offset sets skew (toward B = positive)", () => {
    const r = curveAndSkew(A, B, new Point(75, 48));
    assertClose(r.curve, 2, 1e-9);
    assertClose(r.skew, 0.5, 1e-9); // 2 * 25 / 100
});

test("skew clamps to [-1, 1]", () => {
    const r = curveAndSkew(A, B, new Point(130, 48));
    assertClose(r.skew, 1, 1e-9);
    const r2 = curveAndSkew(A, B, new Point(-30, 48));
    assertClose(r2.skew, -1, 1e-9);
});

test("works for a rotated (vertical) edge", () => {
    // A=(0,0) B=(0,100); dir=(0,1); normal=(-1,0). P 48px right -> d=-48 -> curve -2.
    const r = curveAndSkew(new Point(0, 0), new Point(0, 100), new Point(48, 50));
    assertClose(r.curve, -2, 1e-9);
    assertClose(r.skew, 0, 1e-9);
});

test("degenerate zero-length edge yields no curve (no divide-by-zero)", () => {
    const r = curveAndSkew(new Point(5, 5), new Point(5, 5), new Point(10, 10));
    assertClose(r.curve, 0, 1e-9);
    assertClose(r.skew, 0, 1e-9);
});

test("inverts the forward conversion (curve -> pixels -> curve)", () => {
    // The apex follows the pointer: dragging to d px gives apex d, i.e. curve d/CURVE_HEIGHT.
    // For d = 36px: curve = 36/24 = 1.5, and style.curve = 1.5*48 = 72, apex = 36 = d. ✓
    const d = 36;
    const r = curveAndSkew(A, B, new Point(50, d));
    assertClose(r.curve, d / CURVE_HEIGHT, 1e-9);
});

// --- relative grab: grabbing an already-curved edge must not snap it ---------------
// The live drag applies (original + (implied_now - implied_at_press)). Grabbing without
// moving (now == press) must leave the curve unchanged.
function relativeCurve(original, press_curve, now_curve) {
    return original + (now_curve - press_curve);
}
test("grabbing a curved edge without moving leaves the curve unchanged (no snap-back)", () => {
    // Edge has curve 2 (already curved). Press implies some value; if pointer hasn't moved,
    // now == press, so the result must still be 2 — not the absolute implied value.
    const original = 2;
    const press = curveAndSkew(A, B, new Point(50, 30)).curve; // arbitrary press point
    const now = press; // not moved yet
    assertClose(relativeCurve(original, press, now), 2, 1e-9, "stays at original on grab");
});
test("dragging applies the delta from the press point onto the original curve", () => {
    const original = 2;
    const press = 0.5;  // implied at press
    const now = 1.25;   // implied after moving
    // original + (1.25 - 0.5) = 2.75
    assertClose(relativeCurve(original, press, now), 2.75, 1e-9);
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
