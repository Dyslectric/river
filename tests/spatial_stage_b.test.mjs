// tests/spatial_stage_b.test.mjs
// Stage B: position-identity queries are routed through spatial helpers (vertex_at,
// has_vertex_at, vertex_near) instead of direct position-map lookups. While snapping is
// on, vertex_at/has_vertex_at must behave identically to the old exact-cell lookup.
// vertex_near is new logic for the free-positioning future and is tested directly.
//
// We model the helpers exactly as implemented in ui.mjs (backed by the maps), so these
// tests encode the contract the call sites now depend on.

import { test, run, assert, assertEq } from "./harness.mjs";

// --- model mirroring the ui.mjs Stage B helpers ---------------------------------

class UIModel {
    constructor() {
        this.positions = new Map();   // `${x},${y}` -> vertex
        this.cells_by_id = new Map(); // id -> cell
        this._uid = 0;
    }
    key(p) { return `${p.x},${p.y}`; }

    addVertex(x, y) {
        const v = { id: this._uid++, kind: "vertex", position: { x, y }, is_vertex: () => true };
        this.cells_by_id.set(v.id, v);
        this.positions.set(this.key(v.position), v);
        return v;
    }
    addEdge() {
        const e = { id: this._uid++, kind: "edge", position: null, is_vertex: () => false };
        this.cells_by_id.set(e.id, e);
        return e;
    }

    // --- helpers exactly as in ui.mjs ---
    vertex_at(position) {
        return this.positions.get(this.key(position)) || null;
    }
    has_vertex_at(position) {
        return this.positions.has(this.key(position));
    }
    vertex_near(position, radius = 0.5) {
        let best = null, best_dist = radius;
        for (const cell of this.cells_by_id.values()) {
            if (!cell.is_vertex()) continue;
            const dx = cell.position.x - position.x;
            const dy = cell.position.y - position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= best_dist) { best_dist = dist; best = cell; }
        }
        return best;
    }
}

// --- vertex_at / has_vertex_at: snap-on equivalence ------------------------------

test("vertex_at returns the vertex at an occupied cell", () => {
    const ui = new UIModel();
    const v = ui.addVertex(2, 3);
    assertEq(ui.vertex_at({ x: 2, y: 3 }), v);
});

test("vertex_at returns null at an empty cell", () => {
    const ui = new UIModel();
    ui.addVertex(2, 3);
    assertEq(ui.vertex_at({ x: 0, y: 0 }), null);
});

test("has_vertex_at matches occupancy", () => {
    const ui = new UIModel();
    ui.addVertex(1, 1);
    assert(ui.has_vertex_at({ x: 1, y: 1 }), "occupied");
    assert(!ui.has_vertex_at({ x: 1, y: 2 }), "empty");
});

test("edges are never returned by vertex_at", () => {
    const ui = new UIModel();
    ui.addEdge();
    assertEq(ui.vertex_at({ x: 0, y: 0 }), null, "edge has no position, not found");
});

// --- vertex_near: new free-positioning query ------------------------------------

test("vertex_near finds an exact-position vertex", () => {
    const ui = new UIModel();
    const v = ui.addVertex(5, 5);
    assertEq(ui.vertex_near({ x: 5, y: 5 }), v);
});

test("vertex_near finds a vertex within radius", () => {
    const ui = new UIModel();
    const v = ui.addVertex(5, 5);
    // 0.3 away in x — within default radius 0.5
    assertEq(ui.vertex_near({ x: 5.3, y: 5 }), v);
});

test("vertex_near returns null when nothing is within radius", () => {
    const ui = new UIModel();
    ui.addVertex(0, 0);
    assertEq(ui.vertex_near({ x: 5, y: 5 }), null);
});

test("vertex_near returns the closest of several candidates", () => {
    const ui = new UIModel();
    const near = ui.addVertex(2, 2);
    ui.addVertex(2, 3); // 1.0 away from the probe below
    // probe at (2, 2.2): near is 0.2 away, other is 0.8 away
    assertEq(ui.vertex_near({ x: 2, y: 2.2 }, 1.5), near);
});

test("vertex_near ignores edges", () => {
    const ui = new UIModel();
    ui.addEdge();
    const v = ui.addVertex(1, 1);
    assertEq(ui.vertex_near({ x: 1, y: 1 }), v, "edge skipped, vertex found");
});

test("vertex_near respects a custom radius", () => {
    const ui = new UIModel();
    const v = ui.addVertex(0, 0);
    assertEq(ui.vertex_near({ x: 0, y: 0.9 }, 0.5), null, "outside tight radius");
    assertEq(ui.vertex_near({ x: 0, y: 0.9 }, 1.0), v, "inside wider radius");
});

// --- fractional readiness: vertex_near works where vertex_at can't ---------------

test("vertex_near locates a fractionally-placed vertex (vertex_at would miss)", () => {
    const ui = new UIModel();
    // simulate a free-positioned vertex at a fractional cell
    const v = { id: 99, kind: "vertex", position: { x: 3.4, y: 2.7 }, is_vertex: () => true };
    ui.cells_by_id.set(v.id, v);
    // exact-cell lookup can't find it (no integer key)
    assertEq(ui.vertex_at({ x: 3, y: 3 }), null, "snap lookup misses fractional vertex");
    // spatial query finds it near its true position
    assertEq(ui.vertex_near({ x: 3.4, y: 2.7 }), v, "spatial query finds it");
});

await run();
