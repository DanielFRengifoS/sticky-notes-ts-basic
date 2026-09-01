# Sticky Notes

A little desktop sticky-notes board built with React and TypeScript. You drag on the board to make a note, then move it, resize it, edit its text, and delete it by dropping it on the trash zone.

I wrote the pointer handling straight against the Pointer Events API instead of reaching for a drag-and-drop library - the gesture handling felt like the actual point of the exercise, so hiding it behind a lib seemed like cheating.

![The board with a few notes and the trash zone](docs/screenshot.png)

## Features

- Drag out a note's position and size on the board.
- Move a note by its header.
- Resize from the bottom-right handle.
- Delete by releasing the pointer over the trash zone.
- Edit text in a controlled `<textarea>`.
- Interacting with a note selects it and brings it to the front.
- Notes are saved to local storage and restored on reload.
- `Escape` cancels the active gesture or leaves create mode.

## Usage

1. Click **New note**. The button flips to **Drag on the board to create** while create mode is on.
2. Drag on an empty part of the board to make a note. Really short drags are ignored so a stray click doesn't leave a note behind.
3. Drag the header to move, drag the bottom-right handle to resize.
4. To delete, move a note and let go while the cursor is over the trash. Deletion follows the pointer, not note overlap.
5. Click into a note to edit. That also selects it and brings it forward.
6. `Escape` to bail out of a gesture or create mode.

Notes save after each committed change and come back on reload.

## Requirements

- Node.js `>= 20.19`
- npm

Built with Node.js `20.20.2` and npm `10.8.2`.

## Commands

```bash
npm install
npm run dev
npm run check
npm run build
npm run preview
```

`npm run check` runs the type checker, ESLint, the unit tests, and a production build. There's also `npm run format` (prettier) but I mostly let the editor do that on save.

## How it's put together

A few notes to future me:

- Committed note data is kept seperate from the temporary gesture state. Notes are an ordered array behind a small pure reducer (`src/domain/notesReducer.ts`); array order _is_ the stacking order, so the last note in the array paints on top. The reducer hands back the same state object for no-op actions, which lets the memoised note components skip re-rendering.
- There's a single coordinate system: the `boardSurface` element. Pointer math, previews, trash hit-testing, CSS positioning and the persisted rectangles are all measured against that one element, so there's nothing to convert between.
- Gesture handling lives in `src/features/board/useBoardGestures.ts` and uses pointer capture. The raw pointer position sits on a ref and `requestAnimationFrame` holds the preview to one update per frame. Final geometry comes from the `pointerup` coords, not the last rendered frame, because occassionally a frame is a beat behind and you don't want to commit that.
- Persistence is in `src/infrastructure/notesStorage.ts`. On mount the board measures it's surface, reads and validates the versioned localStorage payload, clamps the saved rects into the current board, and only then starts saving. Writes are debounced ~250ms. Stored values arrive as `unknown` and get validated before use.

Notes have a minimum size (roughly 150 x 120) and can't be dragged off the board - everything is clamped when it commits.

## Stuff I'd fix with more time

- No tests around the gesture hook itself. The pure stuff (geometry, reducer, storage validation) is covered, but the pointer flow isn't, because jsdom doesn't do pointer capture. I'd move that to Playwright.
- Notes don't reflow when you resize the window. They just get clamped the next time you touch them.
- No undo/redo.
- No colours, no server sync, no keyboard move/resize.
- Touch and pen behaviour is untested - I only really drove it with a mouse in Chrome.
- The blue accent is copy-pasted all through the CSS instead of being a variable.

## Browser support

Developed and used in Chrome on macOS. Other current desktop browsers should be fine but I didn't check them properly.

## Time spent

Somewhere around 4-5 hours, give or take. A good chunk of that went into the resize/clamp maths and into StrictMode double-firing the hydrate effect and stomping the saved notes until I gated the save behind a ready phase.
