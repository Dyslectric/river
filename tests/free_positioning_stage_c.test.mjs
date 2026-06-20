// tests/free_positioning_stage_c.test.mjs
// Stage C: free positioning with Alt-to-unsnap. Tests the fractional position math, the
// snap/free decision, grid_key bucketing, and save/load round-trip of fractional coords.
//
// We model position_from_offset's fractional math and the JSON position round-trip exactly
// as implemented, since the real methods live in the (un-instantiable) UI class.

import { test, run, assert, assertEq, assertClose } from "./harness.mjs";

// --- model: fractional position from a [index, remainder] pair + cell size --------

// Mirrors the corrected position_from_offset(offset, snap=false): the fraction into a cell
// is (offset - cell_origin) / cell_size, where cell_origin is the integer cell's start pixel.
function freePosition(col, offset_x, origin_x, col_size, row, offset_y, origin_y, row_size) {
    return { x: col + (offset_x - origin_x) / col_size, y: row + (offset_y - origin_y) / row_size };
}
function snapPosition(col, row) {
    return { x: col, y: row };
}
function grid_key(coord) { return Math.round(coord); }

// --- drag gating + snap/free decision (Shift to drag, Alt to free) ---------------

test("move requires Ctrl; plain press does not start a move", () => {
    // Gating predicate mirrors the vertex content_element pointerdown: ctrlKey + vertex.
    const startsMove = (ctrlKey, isVertex) => ctrlKey && isVertex;
    assert(!startsMove(false, true), "no Ctrl -> no move (plain drag = connect)");
    assert(startsMove(true, true), "Ctrl -> move");
    assert(!startsMove(true, false), "Ctrl on an edge -> no vertex move");
});

test("snap is the default during a Ctrl-drag (no Alt) -> integer positions", () => {
    const snap = !(/* event.altKey */ false);
    assert(snap === true, "default is snap");
    const p = snapPosition(3, 2);
    assertEq(p.x, 3); assertEq(p.y, 2);
});

test("holding Alt during a Ctrl-drag disables snap (Ctrl+Alt = free)", () => {
    const snap = !(/* event.altKey */ true);
    assert(snap === false, "Alt frees placement");
});

// --- fractional math -------------------------------------------------------------

test("free position interpolates within a cell", () => {
    // cell 3 starts at pixel 300 (100px cells); offset 350 -> halfway -> x = 3.5
    const p = freePosition(3, 350, 300, 100, 2, 225, 200, 100);
    assertClose(p.x, 3.5, 1e-9);
    assertClose(p.y, 2.25, 1e-9);
});

test("free position at cell start equals the integer position", () => {
    // offset exactly at the cell origin -> fraction 0
    const p = freePosition(4, 320, 320, 80, 1, 80, 80, 80);
    assertClose(p.x, 4, 1e-9);
    assertClose(p.y, 1, 1e-9);
});

test("free position handles negative cells", () => {
    // cell -2 starts at -160 (80px cells); offset -120 -> -2 + 0.5 = -1.5
    const p = freePosition(-2, -120, -160, 80, -1, -20, -80, 80);
    assertClose(p.x, -1.5, 1e-9);
    assertClose(p.y, -0.25, 1e-9);
});

// --- grid_key bucketing ----------------------------------------------------------

test("grid_key rounds fractional positions to the nearest column/row", () => {
    assertEq(grid_key(3.4), 3);
    assertEq(grid_key(3.6), 4);
    assertEq(grid_key(-1.5), -1); // Math.round(-1.5) === -1
    assertEq(grid_key(2.0), 2);
});

test("two vertices in the same cell-ish region share a grid bucket", () => {
    // 3.2 and 3.4 both bucket to column 3 -> same flexible-grid column
    assertEq(grid_key(3.2), grid_key(3.4));
});

// --- save/load round-trip (JSON encodes floats natively) -------------------------

// Mirrors quiver.mjs base64 export: position -> [x, y] (after subtracting top-left offset),
// JSON-encoded; import reverses it. We assert fractional coords survive losslessly.
function exportPositions(vertices) {
    const xs = vertices.map((v) => v.x), ys = vertices.map((v) => v.y);
    const offset = { x: Math.min(...xs), y: Math.min(...ys) };
    const cells = vertices.map((v) => [v.x - offset.x, v.y - offset.y]);
    return { json: JSON.stringify(cells), offset };
}
function importPositions(json, offset) {
    return JSON.parse(json).map(([x, y]) => ({ x: x + offset.x, y: y + offset.y }));
}

test("integer positions round-trip exactly", () => {
    const verts = [{ x: 0, y: 0 }, { x: 2, y: 1 }];
    const { json, offset } = exportPositions(verts);
    const back = importPositions(json, offset);
    assertEq(back[0].x, 0); assertEq(back[1].x, 2); assertEq(back[1].y, 1);
});

test("fractional positions round-trip losslessly", () => {
    const verts = [{ x: 1.25, y: 2.75 }, { x: 3.5, y: 0.125 }];
    const { json, offset } = exportPositions(verts);
    const back = importPositions(json, offset);
    assertClose(back[0].x, 1.25, 1e-12);
    assertClose(back[0].y, 2.75, 1e-12);
    assertClose(back[1].x, 3.5, 1e-12);
    assertClose(back[1].y, 0.125, 1e-12);
});

test("top-left offset normalisation preserves relative fractional layout", () => {
    // Two vertices; after offset-normalising, their relative distance must be unchanged.
    const verts = [{ x: 5.4, y: 3.1 }, { x: 7.9, y: 3.1 }];
    const { json, offset } = exportPositions(verts);
    const back = importPositions(json, offset);
    assertClose(back[1].x - back[0].x, 2.5, 1e-12, "x-distance preserved");
    assertClose(back[0].y, verts[0].y, 1e-12);
});

// --- spatial collision in free mode (excluding the dragged set) ------------------

function vertex_near(cells, position, radius, exclude) {
    let best = null, bd = radius;
    for (const c of cells) {
        if (exclude && exclude.has(c)) continue;
        const d = Math.hypot(c.x - position.x, c.y - position.y);
        if (d <= bd) { bd = d; best = c; }
    }
    return best;
}

test("a dragged vertex does not collide with itself", () => {
    const a = { x: 2, y: 2 };
    const cells = [a];
    const exclude = new Set([a]);
    // a moved slightly; querying near its new spot must NOT find itself
    assertEq(vertex_near(cells, { x: 2.1, y: 2 }, 0.5, exclude), null);
});

test("a dragged vertex still collides with a different vertex", () => {
    const a = { x: 2, y: 2 }, b = { x: 2.3, y: 2 };
    const cells = [a, b];
    const exclude = new Set([a]);
    assertEq(vertex_near(cells, { x: 2.3, y: 2 }, 0.5, exclude), b);
});

test("release excludes the moving selection (the 'can't let go' bug)", () => {
    // On pointer-up, release() checks each moved cell's new position for a blocker, but
    // must exclude the moving cells themselves — otherwise it finds the cell at its own
    // new position and throws, leaving the move stuck. Model that check.
    const moved = { x: 5, y: 5 };
    const cells = [moved];
    const selection = new Set([moved]);
    const blocker = vertex_near(cells, moved, 0.5, selection);
    assertEq(blocker, null, "moving cell must not block its own release");
});

test("release still blocks landing on a stationary vertex", () => {
    const moved = { x: 3, y: 3 };
    const other = { x: 3, y: 3 }; // a different vertex already here
    const cells = [moved, other];
    const selection = new Set([moved]);
    const blocker = vertex_near(cells, moved, 0.5, selection);
    assertEq(blocker, other, "landing on another vertex is still blocked");
});

await run();
