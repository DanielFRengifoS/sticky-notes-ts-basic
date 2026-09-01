# Sticky Notes

A desktop sticky-notes board built with React and TypeScript. You create notes by dragging on the board, move and resize them, edit their text, and delete them by releasing the pointer over a trash zone.

Pointer interactions are written directly against the Pointer Events API instead of a drag-and-drop library.

![The board with several notes and the trash zone](docs/screenshot.png)

## Features

- Create a note by dragging out its position and size on the board.
- Move a note by dragging its header.
- Resize a note from its bottom-right handle.
- Delete a note by releasing the pointer over the trash zone.
- Edit note text in a controlled `<textarea>`.
- Bring a note to the front by interacting with it.
- Save and restore notes through versioned local storage.
- Cancel an active gesture or leave create mode with `Escape`.

## Usage

1. Click **New note**. The button changes to **Drag on the board to create** while create mode is active.
2. Drag on an empty part of the board to create a note. Very short drags are ignored so a stray click does not leave a note behind.
3. Drag a note by its header to move it.
4. Drag the bottom-right handle to resize it.
5. To delete a note, move it and release the pointer while the cursor is over the trash zone. Deletion follows the pointer, not note overlap.
6. Click inside a note to edit its text. Interacting with a note also selects it and brings it to the front.
7. Press `Escape` to cancel the active gesture or leave create mode.

Notes are saved after each committed change and restored when the page reloads.

## Requirements

- Node.js `>= 20.19`
- npm

Developed with Node.js `20.20.2` and npm `10.8.2`.

## Commands

```bash
npm install
npm run dev
npm run check
npm run build
npm run preview
```

`npm run check` runs the type checker, ESLint, the unit tests, and a production build.

`npm run preview` serves the built bundle from `dist/`.

## Architecture

Committed note data is kept apart from temporary interaction state. Notes live in an ordered array behind a small pure reducer in `src/domain/notesReducer.ts`; array order is stacking order, so the last note renders in front. The reducer returns the same state object for no-op actions and keeps the references of untouched notes, which lets memoized note components skip re-rendering. A single element, `boardSurface`, is the only coordinate system in play: pointer conversion, geometry, previews, trash hit-testing, CSS positioning, and persisted rectangles all measure against it.

Pointer handling lives in `src/features/board/useBoardGestures.ts` and uses pointer capture. The raw pointer position is kept in a ref, and `requestAnimationFrame` holds rendered previews to one update per frame; only the active note gets a changing preview. Final geometry is computed from the `pointerup` coordinates rather than the last rendered preview, so a stale frame cannot be committed. Completion and cancellation are separate paths: `Escape`, `pointercancel`, and lost pointer capture drop the gesture without committing anything.

Persistence sits in `src/infrastructure/notesStorage.ts`. The board measures its surface, reads and validates the versioned local-storage payload, clamps the restored geometry into that surface, and only then becomes ready. Saving stays off until it is, so the initial empty state cannot overwrite stored notes. Writes are debounced by 300 ms while React state stays immediate. Stored values arrive as `unknown` and are validated before use.

## Trade-offs

- **No drag-and-drop library:** the gesture lifecycle, pointer capture, cancellation, and geometry all stay in plain sight.
- **One coordinate surface:** every rectangle is relative to a single borderless, padding-free element, so there is nothing to convert between.
- **Array-based stacking:** array order is enough z-order for this number of notes and keeps persistence simple.
- **Clamping on commit:** restored notes are clamped during hydration and edited notes when their geometry is committed, instead of rewriting and saving every note while the window resizes.
- **No unload flush:** the debounced write is the only save path; there is no separate `pagehide` handler.
- **Unit tests only:** geometry, reducer behavior, persistence validation, and the reference-preservation cases are covered; the rendered UI is not.

## Browser support

Developed and used in Chrome on macOS. Other current desktop browsers are expected to work but were not specifically verified.

## Known limitations

- Desktop only; touch and mobile behavior were not tested.
- Notes are not repositioned while the window is resized. They are clamped the next time their geometry is committed.
- There is no undo or redo.
- Note colors, server persistence, and keyboard-based movement or resizing are not implemented.

## Time spent

Around 2 to 2.5 hours.
