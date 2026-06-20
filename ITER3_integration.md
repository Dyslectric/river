# iter3 — modified quiver source (drop-in)

This package contains a **modified copy of quiver's `src/`** with the theme engine,
top-right theme selector, and skewable curvature integrated directly into the real files.
Drop `quiver-src/src/` over your bind-mounted `./src` and refresh — no build step.

## What's in the zip

```
quiver-src/
  src/        <- the modified quiver source. THIS is what you serve.
  tests/      <- the test suite (proof; not served)
  README.md, package.json, ITER3_integration.md
```

## How to use with your setup

Your `serve` binds `./src` -> `/app/site`. So:

```
unzip quiver-src_iter3_*.zip
cp -r quiver-src/src/. /path/to/your/quiver/src/     # overwrite in place
# refresh the browser (hard refresh to dodge cache)
```

The new top-right button appears immediately; switching themes reskins the UI and
re-renders the diagram.

> Note: this `src/` still needs quiver's runtime assets that aren't code — KaTeX under
> `src/KaTeX/` and the Workbox files — exactly as stock quiver does. Those are unchanged
> and not included here (they're large and not modified); your existing served tree
> already has them. Copying only the changed code over your working tree preserves them.

## iter3.4 — Catppuccin flavours + two fixes

- **All four Catppuccin flavours** (Latte, Frappé, Macchiato, Mocha) plus Light and Dark.
  Palette values are the official hexes from catppuccin.com/palette, role-mapped per the
  Catppuccin style guide (base→paper, mantle→panel, surface0→panel_2/chip, text→ink,
  subtext0→faded, blue→accent, peach→highlight, red→error, yellow→warning). Latte is the
  light flavour. The selector surfaces all six automatically. Every flavour is covered by
  the existing token-completeness and contrast regression tests.
- **Grid recolour on theme switch.** The grid is a manual `<canvas>`; the theme-change
  hook now calls `ui.update_grid()` so lines recolour immediately instead of waiting for
  the next pan/zoom.
- **Toolbar contrast fixed.** `--ui-black`/`--ui-white` were mapped to ink/panel, which
  inverted per theme and collapsed the toolbar text against its background on dark themes.
  They now bind to dedicated fixed-role chip tokens (dark surface, light text across all
  themes), and the hardcoded toolbar label greys became `--ui-chip-text` /
  `--ui-chip-text-faded`. Contrast is enforced by tests that fail the build if chip text
  and surface ever get within 40 (normal) / 30 (faded) lightness.

## iter3.1 fixes (browser-reported)

- **Canvas/page background now themed.** The page fill was `body { background: white }`
  in main.css (a hardcoded literal) — that's the "canvas fill" behind everything. Now
  `var(--paper, white)`, so dark/mocha actually darken the canvas. The grid line colour
  (JS constant `"lightgrey"`) now reads the `--grid-line` token so lines stay visible on
  dark.
- **Selector clicks no longer leak to the canvas.** The dropdown stopped `click`, but
  quiver listens on pointer/mouse *down* + touch at the document level, so a press on the
  menu still started a canvas drag/deselect. The selector now swallows pointerdown,
  mousedown, touchstart, pointerup, mouseup, touchend, dblclick, contextmenu, and wheel
  at its root. Outside-click close still works; selection click still works. Covered by
  `selector_propagation.test.mjs`.
- **Test runner hardened.** Suites now run in isolated processes
  (`run_all.mjs`), so global stubs (`window`/`document`) and the shared harness queue
  cannot leak between files. This caught a latent ordering bug.

## What was changed (5 files)

1. **`curve.mjs`** — `Bezier` gains an optional 5th arg `skew` (default 0). skew = 0 is
   byte-for-byte the original symmetric curve (regression-tested). Non-zero skew slides
   the control point along the chord for asymmetric bends. Added a numeric intersection
   fallback for skewed curves (the analytic path is unchanged for symmetric ones).
   `render()` now uses `this.control` so skewed curves draw correctly.
2. **`arrow.mjs`** — passes `this.style.skew` into the `Bezier`; the arrow's default
   colour now reads the `--ink` theme token (falling back to black headless). The SVG
   *mask* fills (black/white) were intentionally left alone — they are mask channels, not
   visible colours.
3. **`ui.mjs`** — imports `setupTheme`/`installThemeSelector`; applies the theme and
   mounts the selector after `ui.initialise()`; on `quiver-theme-change`, re-inks
   default-coloured arrows and calls `this.quiver.rerender(ui)`.
4. **`index.html`** — adds `<link ... href="theme_selector.css">`.
5. **`theme.mjs`, `theme_selector.mjs`, `theme_selector.css`** — new files (the engine,
   the UI, its styles).

## Not yet done (honest status)

- **The full main.css token swap is NOT applied here.** The ~30 hardcoded greys in
  main.css (see PHASE1_theme_patch.md) still need converting for the *entire* chrome to
  reskin. Right now: the selector, the canvas ink (arrows), and anything already using
  the existing tokens will theme; the hardcoded-grey panels will not fully flip until
  that swap lands. I held off because editing 30 call sites in main.css by hand is
  error-prone without seeing it in the browser — recommend doing it as iter4 with a
  visual check.
- **Skew has no UI control yet.** The data path (options.skew -> Bezier) is wired and
  tested, but nothing sets `style.skew` from the editor. Adding a keyboard bump or a drag
  handle is the next curvature step.
- The theme-change redraw hook uses `ui.quiver.rerender(ui)`, verified to exist in this
  quiver version. If your quiver is a different revision, check that method still exists.

## Tests

39 passing, including `integration_bezier.test.mjs` which runs against the *edited*
curve.mjs and proves symmetric curves are mathematically unchanged.
```
npm test
```
