// tests/run_all.mjs — runs every *.test.mjs in its OWN node process, so global state
// (globalThis.window/document stubs) and the shared harness queue can never leak between
// files. Aggregates exit codes.
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(here).filter((f) => f.endsWith(".test.mjs")).sort();

console.log(`\nRunning ${files.length} test file(s) (isolated processes):\n`);
let failed = false;
for (const f of files) {
    console.log(`\x1b[1m${f}\x1b[0m`);
    const res = spawnSync(process.execPath, [join(here, f)], {
        stdio: "inherit",
        cwd: dirname(here),
    });
    if (res.status !== 0) failed = true;
    console.log("");
}
process.exitCode = failed ? 1 : 0;
console.log(failed ? "\x1b[31mSUITE FAILED\x1b[0m" : "\x1b[32mALL SUITES PASSED\x1b[0m");
