// tests/harness.mjs — a minimal zero-dependency test runner.
// Usage: import { test, run, assert, assertClose, assertThrows } and call run() at end.

const tests = [];
let only = false;

export function test(name, fn) { tests.push({ name, fn, only: false }); }
test.only = (name, fn) => { only = true; tests.push({ name, fn, only: true }); };

export function assert(cond, msg = "assertion failed") {
    if (!cond) throw new Error(msg);
}

export function assertEq(actual, expected, msg) {
    if (actual !== expected) {
        throw new Error(`${msg || "not equal"}: expected ${expected}, got ${actual}`);
    }
}

export function assertClose(actual, expected, eps = 1e-6, msg) {
    if (Math.abs(actual - expected) > eps) {
        throw new Error(
            `${msg || "not close"}: expected ${expected} ± ${eps}, got ${actual}`,
        );
    }
}

export function assertThrows(fn, msg = "expected throw") {
    let threw = false;
    try { fn(); } catch (_) { threw = true; }
    if (!threw) throw new Error(msg);
}

export async function run() {
    const list = only ? tests.filter((t) => t.only) : tests;
    let pass = 0, fail = 0;
    const failures = [];
    for (const t of list) {
        try {
            await t.fn();
            pass++;
            console.log(`  \x1b[32m✓\x1b[0m ${t.name}`);
        } catch (e) {
            fail++;
            failures.push({ name: t.name, error: e });
            console.log(`  \x1b[31m✗\x1b[0m ${t.name}`);
            console.log(`      ${e.message}`);
        }
    }
    console.log(`\n  ${pass} passed, ${fail} failed, ${list.length} total`);
    if (fail > 0) {
        process.exitCode = 1;
    }
    // Reset shared state so the next imported test file starts with an empty queue
    // (run_all imports multiple files that all share this module instance).
    tests.length = 0;
    only = false;
    return { pass, fail, failures };
}
