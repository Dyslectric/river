// tests/endpoint_slide_stage_e.test.mjs
// Stage E: sliding an edge-to-edge endpoint along the target edge. Tests the pointer->t
// projection (validated against ground truth) and the endpoint_t codec rules.

import { test, run, assert, assertClose } from "./harness.mjs";
import { Point } from "../vendor/ds.mjs";

// Mirror of Edge.project_t (projection of P onto the chord A->B, clamped to [0,1]).
function projectT(A, B, P) {
    const ABx = B.x - A.x, ABy = B.y - A.y;
    const len2 = ABx * ABx + ABy * ABy;
    if (len2 < 1e-12) return 0;
    const t = ((P.x - A.x) * ABx + (P.y - A.y) * ABy) / len2;
    return Math.max(0, Math.min(1, t));
}

const A = new Point(0, 0), B = new Point(100, 0);

test("projects to 0 at the source end", () => {
    assertClose(projectT(A, B, new Point(0, 0)), 0, 1e-9);
});
test("projects to 1 at the target end", () => {
    assertClose(projectT(A, B, new Point(100, 0)), 1, 1e-9);
});
test("projects to 0.5 at the midpoint", () => {
    assertClose(projectT(A, B, new Point(50, 0)), 0.5, 1e-9);
});
test("projects off-axis points onto the chord", () => {
    assertClose(projectT(A, B, new Point(25, 40)), 0.25, 1e-9);
});
test("clamps before the source to 0 and beyond the target to 1", () => {
    assertClose(projectT(A, B, new Point(-30, 5)), 0, 1e-9);
    assertClose(projectT(A, B, new Point(140, -5)), 1, 1e-9);
});
test("works for a rotated target edge", () => {
    assertClose(projectT(new Point(0, 0), new Point(0, 100), new Point(8, 40)), 0.4, 1e-9);
});
test("works for a diagonal target edge", () => {
    assertClose(projectT(new Point(0, 0), new Point(100, 100), new Point(50, 50)), 0.5, 1e-9);
});
test("degenerate zero-length target yields t=0 (no divide-by-zero)", () => {
    assertClose(projectT(new Point(5, 5), new Point(5, 5), new Point(9, 9)), 0, 1e-9);
});

// --- endpoint_t codec rules (mirror of the decode validation) --------------------
function validEndpointT(v) {
    if (v === null) return true;
    return typeof v === "number" && v >= 0 && v <= 1;
}
test("endpoint_t accepts null (default midpoint) and [0,1]", () => {
    assert(validEndpointT(null), "null ok");
    assert(validEndpointT(0), "0 ok");
    assert(validEndpointT(0.5), "0.5 ok");
    assert(validEndpointT(1), "1 ok");
});
test("endpoint_t rejects out-of-range values", () => {
    assert(!validEndpointT(1.5), "1.5 invalid");
    assert(!validEndpointT(-0.1), "-0.1 invalid");
});
test("endpoint_t round-trips through JSON (per end)", () => {
    const opt = { endpoint_t: { source: null, target: 0.25 } };
    const back = JSON.parse(JSON.stringify(opt));
    assert(back.endpoint_t.source === null, "null preserved");
    assertClose(back.endpoint_t.target, 0.25, 1e-12);
});

await run();
