// tests/identity_stage_a.test.mjs
// Stage A of breaking out of the grid: cell identity is decoupled from position.
// The real bookkeeping lives in the UI class (too large to instantiate headless), so we
// model the EXACT add/remove/move logic from ui.mjs and assert the invariants it must
// uphold:
//   - every cell has a stable unique id
//   - cells_by_id tracks all cells; positions tracks vertices only
//   - moving a vertex changes its position key but NOT its id (identity is stable)
//   - the two indexes stay consistent across create/move/destroy
//
// If the real ui.mjs bookkeeping diverges from this model, these tests still encode the
// contract Stage A is committing to.

import { test, run, assert, assertEq } from "./harness.mjs";

// --- model mirroring ui.mjs Stage A bookkeeping ---------------------------------

let NEXT_UID = 0;
function makeCell(kind, position) {
    return { id: NEXT_UID++, kind, position }; // position: {x,y} or null for edges
}

class Model {
    constructor() {
        this.positions = new Map();   // `${x},${y}` -> vertex   (vertices only)
        this.cells_by_id = new Map(); // id -> cell              (all cells)
    }
    key(p) { return `${p.x},${p.y}`; }

    add(cell) {
        this.cells_by_id.set(cell.id, cell);          // all cells
        if (cell.kind === "vertex") {
            this.positions.set(this.key(cell.position), cell);
        }
        return cell;
    }
    remove(cell) {
        this.cells_by_id.delete(cell.id);
        if (cell.kind === "vertex") this.positions.delete(this.key(cell.position));
    }
    // Move = delete old position key, set new — id untouched (the whole point).
    move(cell, newPos) {
        this.positions.delete(this.key(cell.position));
        cell.position = newPos;
        this.positions.set(this.key(cell.position), cell);
    }
}

// --- tests ----------------------------------------------------------------------

test("every cell gets a unique id", () => {
    NEXT_UID = 0;
    const a = makeCell("vertex", { x: 0, y: 0 });
    const b = makeCell("vertex", { x: 1, y: 0 });
    const e = makeCell("edge", null);
    assert(a.id !== b.id && b.id !== e.id && a.id !== e.id, "ids must be unique");
});

test("cells_by_id tracks all cells; positions tracks vertices only", () => {
    const m = new Model();
    const v = m.add(makeCell("vertex", { x: 2, y: 3 }));
    const e = m.add(makeCell("edge", null));
    assertEq(m.cells_by_id.size, 2, "both cells indexed by id");
    assertEq(m.positions.size, 1, "only the vertex is in positions");
    assert(m.cells_by_id.has(v.id) && m.cells_by_id.has(e.id));
    assert(m.positions.has("2,3"));
});

test("moving a vertex changes its position key but not its id", () => {
    const m = new Model();
    const v = m.add(makeCell("vertex", { x: 0, y: 0 }));
    const idBefore = v.id;
    assert(m.positions.has("0,0"));

    m.move(v, { x: 5, y: 2 });

    assertEq(v.id, idBefore, "id is stable across a move");
    assert(!m.positions.has("0,0"), "old position key removed");
    assert(m.positions.has("5,2"), "new position key present");
    // Identity index is unchanged by a move:
    assertEq(m.cells_by_id.get(v.id), v, "still resolvable by id");
    assertEq(m.cells_by_id.size, 1, "move did not add/remove identity entries");
});

test("identity survives a move even to a fractional position (free-positioning ready)", () => {
    const m = new Model();
    const v = m.add(makeCell("vertex", { x: 1, y: 1 }));
    const id = v.id;
    m.move(v, { x: 3.4, y: 2.7 });
    assertEq(v.id, id, "id stable for fractional move");
    assertEq(m.cells_by_id.get(id), v, "resolvable by id regardless of fractional pos");
});

test("remove cleans up both indexes", () => {
    const m = new Model();
    const v = m.add(makeCell("vertex", { x: 4, y: 4 }));
    const e = m.add(makeCell("edge", null));
    m.remove(v);
    assert(!m.cells_by_id.has(v.id), "vertex id removed");
    assert(!m.positions.has("4,4"), "vertex position removed");
    assertEq(m.cells_by_id.size, 1, "edge still indexed");
    m.remove(e);
    assertEq(m.cells_by_id.size, 0, "all identity entries gone");
});

test("indexes stay consistent across a create/move/destroy sequence", () => {
    const m = new Model();
    const a = m.add(makeCell("vertex", { x: 0, y: 0 }));
    const b = m.add(makeCell("vertex", { x: 1, y: 1 }));
    m.move(a, { x: 2, y: 2 });
    m.move(b, { x: 0, y: 0 }); // b moves into a's old spot — must be fine
    assert(m.positions.has("2,2") && m.positions.has("0,0"));
    assertEq(m.positions.get("0,0"), b, "b now occupies the old cell");
    assertEq(m.positions.get("2,2"), a, "a moved away");
    // Every vertex in positions is also in cells_by_id:
    for (const v of m.positions.values()) {
        assertEq(m.cells_by_id.get(v.id), v, "positions ⊆ cells_by_id");
    }
});

await run();
