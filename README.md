# A free-positioning fork of quiver

This is a fork of [quiver](https://github.com/varkor/quiver), a graphical editor for
commutative and pasting diagrams. The original is a grid-based, keyboard-first tool that
exports to LaTeX and Typst. This fork keeps quiver's rendering and diagram model but
rethinks placement and curvature around direct manipulation: objects go anywhere on a blank
canvas, arrows are bent and reshaped by dragging, and the interface can be themed.

It is screen-only. The LaTeX and Typst export paths have been removed (see
[What changed](#what-changed)); labels still render with KaTeX.

## What this fork does

- **Free positioning.** Objects are no longer locked to grid cells. They can sit at any
  point on the canvas, and the flexible grid that used to reflow as labels grew has been
  removed entirely, so nothing shifts underneath you while you work.
- **Drag to curve.** Hold Alt and drag an arrow to bend it. The bend follows the cursor;
  dragging along the arrow's length skews the curve's apex toward one end.
- **Sliding edge-to-edge endpoints.** When an arrow's endpoint is attached to another
  arrow, you can slide where along that arrow it attaches.
- **Themes.** A built-in theme picker (top-right) with light and dark themes plus the four
  Catppuccin flavours (Latte, Frappé, Macchiato, Mocha).
- **A blank canvas.** Grid lines are hidden; placement is free, with no snapping.

## Gestures

Moving and editing is done with the pointer plus a modifier. The originals (plain drag from
an object to draw an arrow; Alt-drag on empty canvas to pan) are unchanged.

| Gesture | Action |
| --- | --- |
| Drag from an object | Draw an arrow (unchanged) |
| Drag from an arrow | Draw a higher arrow between arrows (unchanged) |
| `Ctrl` + drag an object | Move it |
| `Ctrl` + `Alt` + drag an object | Move it (free; identical to the above now that there is no grid) |
| `Ctrl` + `Alt` + `Shift` + drag | Move locked to 8 compass directions, measured from where the object started |
| `Alt` + drag an arrow | Bend it into a curve |
| Drag an arrow's endpoint handle onto another arrow | Reconnect it there (attaches at the midpoint) |
| ... while holding `Shift` | Slide the endpoint along the target arrow; the target stays locked while Shift is held |
| `Alt` (alone) + drag empty canvas | Pan |
| `v` (nothing selected) | Create an object under the cursor |

Selection (Shift / Cmd-click), the history system (undo/redo), colours, arrow styles, and
the keyboard shortcuts inherited from quiver continue to work.

## Saving and sharing

Diagrams are saved into the URL, as in quiver, and free positions, fractional curves, skew,
and endpoint positions all round-trip through that URL. This fork's save format is not
interchangeable with upstream quiver: it stores fractional coordinates that upstream does
not expect, so a diagram saved here will not open correctly in the original, and vice versa.
Export to embeddable HTML is kept.

## What changed

Relative to upstream quiver:

- The renderer selector, LaTeX export, and Typst export were removed. The renderer is fixed
  to KaTeX. Labels still render as LaTeX; what is gone is the ability to export the diagram
  source.
- The flexible grid was removed. Cells are a uniform fixed size, the grid lines are hidden,
  and placement is free with no snapping.
- Object identity was decoupled from position, so an object keeps its identity as it moves
  to any fractional coordinate. Spatial queries replaced the old position-keyed lookups.
- Arrow curvature gained a continuous skew parameter and can be set by dragging.
- Edge-to-edge endpoints gained a continuous attach position along the target.
- A theme engine and picker were added.

## Building

Run `make` from the command line, then open `src/index.html` in a browser served over
`localhost` (for example, `make serve`, then open `localhost:8000`).

KaTeX is not committed to this repository; the build downloads it. If the build cannot fetch
it, download the [latest KaTeX release](https://github.com/KaTeX/KaTeX/releases) and place it
at `src/KaTeX/` (so that `src/KaTeX/katex.mjs` and `src/KaTeX/katex.css` exist). If KaTeX is
missing, diagrams will fail to load. The KaTeX folder is not touched when dropping in updated
source, so it only needs to be set up once.

## Relationship to quiver and licence

This is a derivative of [quiver](https://github.com/varkor/quiver) by varkor, used under the
MIT Licence. The original copyright and licence are retained. Thanks to varkor and all of
quiver's contributors for the editor this is built on; the diagram model, rendering, arrow
styles, and keyboard system are theirs.
