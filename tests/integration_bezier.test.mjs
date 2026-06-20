// tests/integration_bezier.test.mjs
// Validates the EDITED real quiver Bezier class (vendored from iter3/src/curve.mjs):
//  1. skew = 0 reproduces the original symmetric curve EXACTLY (regression guard).
//  2. skew != 0 produces asymmetric bends with pinned endpoints.
//  3. The analytic intersection path (symmetric) still returns sensible results.
//  4. The numeric fallback (skewed) returns sensible results.

import { test, run, assert, assertClose } from "./harness.mjs";
import { Point } from "../vendor/ds.mjs";
import { Bezier, RoundedRectangle } from "../vendor/curve.mjs";

const O = new Point(0, 0);
const W = 120, H = 50;

// --- 1. Regression: skew = 0 (and omitted) is the original curve ----------------

test("omitted skew defaults to symmetric (control at midpoint)", () => {
    const b = new Bezier(O, W, H, 0);
    assertClose(b.control.x, W / 2, 1e-9);
    assertClose(b.control.y, H, 1e-9);
    assert(b.is_symmetric, "must be symmetric by default");
});

test("explicit skew = 0 identical to omitted", () => {
    const a = new Bezier(O, W, H, 0);
    const b = new Bezier(O, W, H, 0, 0);
    assertClose(a.control.x, b.control.x, 1e-12);
    assertClose(a.control.y, b.control.y, 1e-12);
});

test("symmetric point() matches the canonical quadratic at sample t", () => {
    const b = new Bezier(O, W, H, 0);
    // Canonical symmetric quadratic with control (W/2, H):
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        const mt = 1 - t;
        const x = mt * mt * 0 + 2 * mt * t * (W / 2) + t * t * W;
        const y = mt * mt * 0 + 2 * mt * t * H + t * t * 0;
        const p = b.point(t);
        assertClose(p.x, x, 1e-9, `x at t=${t}`);
        assertClose(p.y, y, 1e-9, `y at t=${t}`);
    }
});

// --- 2. skew produces asymmetric bends ------------------------------------------

test("skew shifts control x, endpoints stay pinned", () => {
    for (const skew of [-1, -0.4, 0.4, 1]) {
        const b = new Bezier(O, W, H, 0, skew);
        assertClose(b.point(0).x, 0, 1e-9);
        assertClose(b.point(0).y, 0, 1e-9);
        assertClose(b.point(1).x, W, 1e-9);
        assertClose(b.point(1).y, 0, 1e-9);
        assert(!b.is_symmetric, `skew=${skew} should be asymmetric`);
    }
    const lo = new Bezier(O, W, H, 0, -1);
    const hi = new Bezier(O, W, H, 0, 1);
    assert(lo.control.x < W / 2, "negative skew pulls control left");
    assert(hi.control.x > W / 2, "positive skew pulls control right");
});

test("skew is clamped to [-1, 1]", () => {
    assertClose(new Bezier(O, W, H, 0, 9).skew, 1, 1e-9);
    assertClose(new Bezier(O, W, H, 0, -9).skew, -1, 1e-9);
});

// --- 3. Symmetric intersection (analytic path) still works ----------------------

test("symmetric curve intersects a straddling rectangle (analytic path)", () => {
    const b = new Bezier(O, W, H, 0);
    // A box sitting on the arch near the apex.
    const rect = new RoundedRectangle(new Point(W / 2, H / 2), new Point(30, 60), 4);
    const hits = b.intersections_with_rounded_rectangle(rect, true);
    assert(Array.isArray(hits) || hits instanceof Array, "returns array-like");
    assert(hits.length >= 1, `expected >=1 hit, got ${hits.length}`);
});

test("symmetric curve: far rectangle yields no intersection", () => {
    const b = new Bezier(O, W, H, 0);
    const rect = new RoundedRectangle(new Point(1000, 1000), new Point(10, 10), 2);
    const hits = b.intersections_with_rounded_rectangle(rect, true);
    assert(hits.length === 0, `expected 0, got ${hits.length}`);
});

// --- 4. Skewed intersection (numeric fallback) ----------------------------------

test("skewed curve intersects a straddling rectangle (numeric path)", () => {
    const b = new Bezier(O, W, H, 0, 0.7);
    // Place the box near where the skewed apex actually is (x > W/2).
    const apexX = b.control.x; // approx region of the bend
    const rect = new RoundedRectangle(new Point(apexX, H / 2), new Point(30, 60), 4);
    const hits = b.intersections_with_rounded_rectangle(rect, true);
    assert(hits.length >= 1, `expected >=1 hit, got ${hits.length}`);
    for (const h of hits) {
        assert(h.t >= -1e-6 && h.t <= 1 + 1e-6, `t in [0,1]: ${h.t}`);
    }
});

test("skewed curve: far rectangle yields no intersection", () => {
    const b = new Bezier(O, W, H, 0, 0.7);
    const rect = new RoundedRectangle(new Point(1000, 1000), new Point(10, 10), 2);
    const hits = b.intersections_with_rounded_rectangle(rect, true);
    assert(hits.length === 0, `expected 0, got ${hits.length}`);
});

// --- 5. render() uses the control point -----------------------------------------

test("render emits a curve_by through the (skewed) control offset", () => {
    // Fake Path capturing curve_by args.
    const calls = [];
    const fakePath = { curve_by: (c, e) => { calls.push({ c, e }); return "PATH"; } };
    const b = new Bezier(O, W, H, 0, 1); // max positive skew
    const out = b.render(fakePath);
    assert(out === "PATH", "returns path result");
    assertClose(calls[0].c.x, b.control.x - O.x, 1e-9, "control x offset");
    assertClose(calls[0].c.y, H, 1e-9, "control y = h");
    assertClose(calls[0].e.x, W, 1e-9, "end x = w");
});

await run();
