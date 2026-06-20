# quiver-mods

Experimental modifications to [quiver](https://github.com/varkor/quiver) toward a fork
with a different workflow. Screen-only (no tikz-cd export constraint).

## Layout

```
src/
  theme.mjs            Phase 1 — Dedekind-style theme token engine (light/dark/mocha)
  skew_bezier.mjs      Phase 2 — quadratic Bézier with a skewable apex (asymmetric bends)
tests/
  harness.mjs          zero-dependency test runner
  theme.test.mjs       theme engine tests (DOM stubbed)
  skew_bezier.test.mjs curvature tests against REAL quiver curve/ds modules
  run_all.mjs          aggregate runner
vendor/
  ds.mjs, curve.mjs    unmodified copies from quiver, so tests run standalone
build/
  package.sh           test-gated, versioned zip
PHASE1_theme_patch.md  line-by-line integration guide for theming
PHASE2_curvature_notes.md  integration guide for curvature
```

## Workflow

```
npm test                 # run everything
npm run test:bezier      # curvature only
npm run test:theme       # theme only
npm run package iter1    # gate on tests, then zip build/dist/quiver-mods_iter1_<ts>.zip
```

Packaging refuses to build if any test fails.

## Status

- Phase 1 (theme): engine + tests done; integration into quiver per PHASE1_theme_patch.md.
- Phase 2 (curvature): SkewBezier + tests done; integration per PHASE2_curvature_notes.md.
- Phase 3 (break out of the grid): not started — the invasive one.

## Provenance

`vendor/` contains unmodified files from quiver (MIT). New code under `src/` and `tests/`
is MIT. Catppuccin palette *values* in theme.mjs are data; no GPL code from Dedekind is
included.
