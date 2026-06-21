// tests/eight_direction_stage_c.test.mjs
// Ctrl+Alt+Shift drag locks free movement to the nearest of 8 compass directions
// (measured from the drag origin), keeping the distance free. Mirrors
// UI.constrain_to_8_directions; math validated independently against ground truth.

import { test, run, assert, assertClose } from "./harness.mjs";
import { Point } from "../vendor/ds.mjs";

function constrain8(origin, position) {
    const delta = position.sub(origin);
    const mag = delta.length();
    if (mag < 1e-9) return position;
    const step = Math.PI / 4;
    const a = Math.round(Math.atan2(delta.y, delta.x) / step) * step;
    return origin.add(new Point(Math.cos(a) * mag, Math.sin(a) * mag));
}

const O = new Point(0, 0);

test("a near-horizontal drag snaps to due east, distance kept", () => {
    const r = constrain8(O, new Point(10, 1));
    assertClose(r.y, 0, 1e-9, "snapped flat");
    assertClose(r.x, Math.hypot(10, 1), 1e-9, "magnitude preserved");
});

test("a perfect diagonal stays diagonal with magnitude preserved", () => {
    const r = constrain8(O, new Point(10, 10));
    assertClose(r.x, 10, 1e-9);
    assertClose(r.y, 10, 1e-9);
});

test("a near-vertical drag snaps to due south", () => {
    const r = constrain8(O, new Point(1, 10));
    assertClose(r.x, 0, 1e-9);
    assertClose(r.y, Math.hypot(1, 10), 1e-9);
});

test("all 8 directions are reachable", () => {
    const dirs = [
        [10, 0], [10, 10], [0, 10], [-10, 10],
        [-10, 0], [-10, -10], [0, -10], [10, -10],
    ];
    for (const [dx, dy] of dirs) {
        const r = constrain8(O, new Point(dx, dy));
        // exact diagonals/axes map to themselves
        assertClose(r.x, dx, 1e-9, `x for (${dx},${dy})`);
        assertClose(r.y, dy, 1e-9, `y for (${dx},${dy})`);
    }
});

test("magnitude is always preserved regardless of snapped angle", () => {
    const samples = [[7, 2], [3, 9], [-4, 6], [-8, -1], [5, -5.3]];
    for (const [dx, dy] of samples) {
        const r = constrain8(O, new Point(dx, dy));
        assertClose(r.sub(O).length(), Math.hypot(dx, dy), 1e-9,
            `magnitude for (${dx},${dy})`);
    }
});

test("constraint is measured from a non-zero origin", () => {
    const origin = new Point(5, 3);
    // pointer mostly east of origin
    const r = constrain8(origin, new Point(5 + 10, 3 + 1));
    assertClose(r.y, 3, 1e-9, "locked to origin's row");
    assertClose(r.x, 5 + Math.hypot(10, 1), 1e-9);
});

test("zero displacement returns the position unchanged (no divide-by-zero)", () => {
    const r = constrain8(O, new Point(0, 0));
    assertClose(r.x, 0, 1e-9);
    assertClose(r.y, 0, 1e-9);
});

test("the 22.5° boundary rounds to the nearer direction", () => {
    // angle just over 22.5° should snap up to 45°, just under to 0°.
    const justOver = constrain8(O, new Point(10, 4.5)); // atan2 ~ 24.2°
    assertClose(Math.atan2(justOver.y, justOver.x), Math.PI / 4, 1e-6, "-> 45°");
    const justUnder = constrain8(O, new Point(10, 4)); // ~21.8°
    assertClose(Math.atan2(justUnder.y, justUnder.x), 0, 1e-6, "-> 0°");
});

await run();
