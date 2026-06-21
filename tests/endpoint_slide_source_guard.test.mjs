// tests/endpoint_slide_source_guard.test.mjs
import { test, run, assert } from "./harness.mjs";
import { readFileSync } from "node:fs";

const UI = process.env.UI_MJS || "/tmp/iter3/src/ui.mjs";
const QUIVER = process.env.QUIVER_MJS || "/tmp/iter3/src/quiver.mjs";
let ui = "", q = "";
try { ui = readFileSync(UI, "utf8"); } catch (_) {}
try { q = readFileSync(QUIVER, "utf8"); } catch (_) {}

test("sources readable", () => {
    assert(ui.length > 10000 && q.length > 5000);
});
test("endpoint_t is a default edge option (per end, null default)", () => {
    assert(/endpoint_t:\s*\{\s*source:\s*null,\s*target:\s*null\s*\}/.test(ui),
        "endpoint_t default present");
});
test("attach_shape_at(t) and project_t(P) helpers exist", () => {
    assert(/attach_shape_at\(t\)\s*\{/.test(ui), "attach_shape_at defined");
    assert(/project_t\(P\)\s*\{/.test(ui), "project_t defined");
    assert(/curve\.point\(Math\.max\(0,\s*Math\.min\(1,\s*t\)\)\)/.test(ui),
        "attach_shape_at samples curve.point(t)");
});
test("reconnect computes slide_t under Shift over an edge target", () => {
    assert(/this\.mode\.reconnect\.slide_t\s*=\s*locked\.project_t\(offset\)/.test(ui),
        "slide_t computed from projection onto the (latched) edge");
    assert(/event\.shiftKey/.test(ui), "gated on Shift");
});
test("render honours endpoint_t and live slide_t", () => {
    assert(/this\[end\]\.attach_shape_at\(t\)/.test(ui), "static render uses endpoint_t");
    assert(/ui\.mode\.target\.attach_shape_at\(ui\.mode\.reconnect\.slide_t\)/.test(ui),
        "live reconnect uses slide_t");
});
test("connect() persists endpoint_t on the reconnected end", () => {
    assert(/edge\.options\.endpoint_t\[end\]\s*=\s*sliding/.test(ui),
        "slide persisted on commit");
});

test("reconnect render keeps the non-dragged end at its own endpoint_t", () => {
    // The bug: while sliding one end, the other end reverted to the target's midpoint.
    // The render's reconnect branch must explicitly re-attach the other end honouring its
    // endpoint_t.
    assert(/const other_end = end === "source" \? "target" : "source"/.test(ui),
        "other end identified");
    assert(/this\.arrow\[other_end\]\s*=\s*this\[other_end\]\.attach_shape_at\(t\)/.test(ui),
        "other end re-attached at its endpoint_t during the slide");
});

test("Shift latches the slide onto the target edge (locks even off-line)", () => {
    assert(/this\.mode\.reconnect\.slide_lock == null\s*\n\s*&& this\.mode\.target !== null/.test(ui),
        "lock acquired ONCE (only when not already locked)");
    assert(/const locked = this\.mode\.reconnect\.slide_lock/.test(ui),
        "locked edge reused while Shift held");
    assert(/this\.mode\.reconnect\.slide_t\s*=\s*locked\.project_t\(offset\)/.test(ui),
        "projects onto the locked edge even off-line");
    assert(/this\.mode\.reconnect\.slide_lock\s*=\s*null/.test(ui),
        "lock cleared when Shift released");
});
test("codec validates endpoint_t (float in [0,1] or null)", () => {
    assert(/assert_kind\(options\.endpoint_t\[end\],\s*"float"\)/.test(q),
        "endpoint_t decoded as float");
    assert(/options\.endpoint_t\[end\] >= 0[\s\S]{0,80}<= 1/.test(q), "range checked");
});

await run();
