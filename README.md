# Sticky Notes

A desktop sticky-notes board built with React and TypeScript. Users can create notes by dragging on the board, move and resize them, edit their text, and delete them by releasing the pointer over a trash zone.

The interactions are implemented directly with the Pointer Events API rather than a drag-and-drop library, keeping the gesture lifecycle and geometry logic visible for review.

## Features

- Create a note by dragging its desired position and size on the board.
- Move a note by dragging its header.
- Resize a note using its bottom-right handle.
- Delete a note by releasing the pointer over the trash zone.
- Undo the most recent deletion for approximately five seconds.
- Edit note text using a controlled `<textarea>`.
- Bring a note to the front by interacting with it.
- Save and restore notes using versioned local storage.
- Cancel an active gesture or leave create mode with `Escape`.

## Usage

1. Click **New note**. The button changes to **Drag on the board to create** while create mode is active.
2. Drag on an empty part of the board to create a note. Very short drags are ignored to prevent accidental creation.
3. Drag a note by its header to move it.
4. Drag the bottom-right handle to resize it.
5. To delete a note, move it and release the pointer while the cursor is over the trash zone. Deletion is based on the pointer position rather than note overlap.
6. After deletion, use the temporary **Undo** action to restore the note with its original text, geometry, and stacking position.
7. Click inside a note to edit its text. Interacting with a note also selects it and brings it to the front.
8. Press `Escape` to cancel the active gesture or leave create mode.

Notes are saved automatically after committed changes and restored when the application reloads.

## Requirements

- Node.js `>= 20.19`
- npm

The application was developed with Node.js `20.20.2` and npm `10.8.2`.

## Commands

```bash
npm install
npm run dev
npm run check
npm run build
npm run preview
```

`npm run check` runs the complete quality gate:

- TypeScript type checking
- ESLint
- Unit tests
- Production build

`npm run preview` serves the generated production bundle from `dist/`.

### End-to-end smoke test

A focused Playwright smoke test covers the main workflow without making browser installation part of the standard quality gate.

```bash
npx playwright install chromium
npm run test:e2e
```

The test creates a note, edits it, moves and resizes it, reloads the application to verify persistence, and deletes the note through the trash zone.

## Architecture

The application separates committed note data from temporary interaction state. Notes are stored in an ordered array managed by a small pure reducer in `src/domain/notesReducer.ts`; array order represents stacking order, with the last note rendered at the front. Reducer operations preserve the state object for no-op actions and retain references to unaffected notes, allowing memoized note components to avoid unnecessary rendering. The interactive `boardSurface` is the single coordinate system used for pointer conversion, geometry calculations, preview rendering, trash hit-testing, CSS positioning, and persisted rectangles. Undo state is temporary board UI state, while restoration is performed through a pure reducer action that inserts the deleted note at its previous stacking position.

Pointer interactions are implemented in `src/features/board/useBoardGestures.ts` using the Pointer Events API and pointer capture. Raw pointer positions are stored in a mutable ref, while `requestAnimationFrame` limits rendered previews to at most one update per frame. Only the active note receives changing preview geometry. Final geometry is calculated synchronously from the `pointerup` coordinates rather than from the last rendered preview, avoiding stale-frame commits. Successful completion and cancellation use separate terminal paths: `Escape`, `pointercancel`, and active capture loss discard the gesture without committing changes.

Persistence is handled separately in `src/infrastructure/notesStorage.ts`. The board first measures its usable surface, then reads and validates the versioned local-storage payload, normalizes restored geometry, installs the notes, and transitions to a ready state. Saving is disabled until that process is complete, preventing the initial empty state from replacing valid stored data. Writes are debounced by approximately 300 ms, while React state remains immediately responsive. Stored values are treated as `unknown` and validated before use.

## Design decisions and trade-offs

- **Direct pointer handling:** No drag-and-drop library is used so the interaction lifecycle, pointer capture, cancellation behavior, and geometry calculations remain explicit.
- **Single coordinate surface:** All note geometry is relative to one borderless, padding-free board element, avoiding conversions between competing coordinate systems.
- **Array-based stacking:** Array order provides a simple representation of z-order for the expected number of notes and keeps persistence straightforward.
- **No continuous viewport normalization:** Restored notes are normalized during hydration, and modified notes are clamped when committed. The application does not continuously rewrite and persist all note positions while the window is resized.
- **No unload-time persistence flush:** A normal debounced write path is used instead of adding a separate `pagehide` lifecycle.
- **Focused testing:** Pure geometry, reducer behavior, persistence validation, and important reference-preservation cases are covered by unit tests. One small browser smoke test verifies the primary end-to-end workflow.

## Browser support

The application targets current desktop versions of:

- Google Chrome
- Mozilla Firefox
- Microsoft Edge

### Manually verified

- Chrome on macOS
- Firefox on macOS
- Chrome on Windows 11
- Firefox on Windows 11

Microsoft Edge is a supported target but was not manually verified.

In addition, the complete `npm run check` command passes, and the Playwright smoke test passes in headless Chromium.

## Known limitations

- The application is designed for desktop use; touch and mobile behavior were not specifically tested.
- Notes are not repositioned continuously when the viewport changes after hydration. They are clamped the next time their geometry is committed.
- Undo applies only to the most recent deletion, expires after approximately five seconds, and is not persisted across reloads.
- There is no general undo/redo history.
- Note colors, REST persistence, and keyboard-based movement or resizing are not implemented.
- Microsoft Edge was not manually tested.

## Time spent

Approximately 2 to 2.5 hours.