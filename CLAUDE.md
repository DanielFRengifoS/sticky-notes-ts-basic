# CLAUDE.md

## Mission

This repository is a **3–4 hour senior React + TypeScript hiring exercise**.

The hiring signal must come from a small, polished implementation with reliable pointer interactions, clear state ownership, precise TypeScript, focused tests, and disciplined scope—not from production-scale infrastructure or the largest possible feature set.

The repository currently contains **only a scaffold**. Implement behavior only when the assigned ticket requires it.

---

## Product requirements

Build a desktop single-page sticky-notes application for current Chrome, Firefox, and Edge at a minimum resolution of 1024×768.

Implement all four core features:

1. Create a note at a user-selected position and size.
2. Resize a note by dragging.
3. Move a note by dragging.
4. Delete a note by dragging it to a predefined trash zone.

High-value bonuses in scope:

- plain-text editing;
- bring-to-front behavior;
- versioned local-storage persistence.

Use React and TypeScript without a component library or ready-made drag-and-drop solution.

---

## Instruction priority

When instructions conflict, use this order:

1. Employer task requirements.
2. Current ticket and its acceptance criteria.
3. This file.
4. Existing repository conventions.
5. Personal preference.

Implement **only the current ticket**. Do not pre-implement future tickets because their design is already known.

---

## Frozen delivery boundary

### Must ship

- Create, move, resize, and drag-to-trash deletion.
- Pointer capture and correct cancellation.
- Final geometry calculated from the release event.
- Text editing and bring-to-front.
- Versioned local-storage hydration with a write gate.
- Strict TypeScript.
- Pure geometry functions.
- A focused reducer.
- Focused geometry, reducer, and persistence tests.
- Successful production build.
- Concise README with the requested 2–3 architecture paragraphs.

### First things to cut

- `pagehide` flushing.
- Playwright infrastructure.
- Delete-key behavior.
- Note colors.
- Continuous resize normalization.
- Decorative animations.
- Exhaustive validator permutations.
- Any abstraction that is not already reducing complexity.

### Never add unless explicitly ticketed

- Redux, Zustand, MobX, or another global state library.
- Context providers for board state.
- Generic drag-and-drop frameworks.
- Repository/service layers for local storage.
- REST mocks or API abstractions.
- Component libraries or CSS-in-JS.
- `contentEditable`, HTML, or Markdown rendering.
- Canvas, virtualization, undo/redo, or multiple resize handles.
- Mobile-specific behavior.

At approximately hour **2:30**, all four core interactions must work. Optional work must never delay pointer stability.

---

## Architecture and ownership

```text
src/
├── domain/
│   ├── geometry.ts
│   ├── notesReducer.ts
│   └── types.ts
├── infrastructure/
│   └── notesStorage.ts
├── features/
│   └── board/
│       ├── Board.tsx
│       ├── Board.css
│       ├── NoteCard.tsx
│       └── useBoardGestures.ts
├── App.tsx
├── App.css
├── index.css
└── main.tsx
```

### `domain/types.ts`

Semantic domain types and shared constants. No React or browser APIs.

### `domain/geometry.ts`

Pure creation, movement, resizing, normalization, clamping, coordinate-conversion, and hit-test functions. No DOM, React, storage, or time access.

### `domain/notesReducer.ts`

Committed note-state transitions only. No gestures, focus, DOM, timers, or persistence.

### `infrastructure/notesStorage.ts`

Versioned serialization, parsing, validation, safe reads, and safe writes. No React code.

### `features/board/useBoardGestures.ts`

Owns:

- active gesture ref;
- pointer capture lifecycle;
- raw pointer updates;
- requestAnimationFrame scheduling;
- preview state;
- commit and cancellation;
- trash activation.

It is board-specific. Do not turn it into a general drag library.

### `features/board/Board.tsx`

Coordinates:

- reducer state;
- hydration phase;
- tool and selection state;
- focus requests;
- persistence effect;
- rendering and stable callbacks.

### `features/board/NoteCard.tsx`

Renders one note and defines event boundaries for the header, textarea, and resize handle.

Extract another module only when it creates one obvious responsibility and improves reviewability.

---

## Core design principles

1. **Separate committed and ephemeral state.** Notes belong in the reducer. Gestures, previews, selection, tools, and focus requests do not.
2. **Use explicit state machines.** Model gestures as a discriminated union, not unrelated booleans.
3. **Keep browser mechanics at the boundary.** DOM measurement and pointer events stay in the board feature layer; geometry receives plain values.
4. **Prefer visible contracts over generic abstractions.** Reviewers should easily find gesture start, preview, commit, and cancellation behavior.
5. **Optimize the real risk.** Pointer lifecycle correctness matters more than hypothetical scale or infrastructure.
6. **Preserve cohesion.** Avoid unrelated refactors, formatting churn, and abstractions used once.

---

## TypeScript standards

Preserve strict settings:

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "useUnknownInCatchVariables": true
}
```

Required:

- Never use `any`.
- Accept external/persisted data as `unknown` and narrow it.
- Use semantic names such as `ClientPoint`, `BoardPoint`, `Size`, `NoteRect`, and `BoardBounds`.
- Keep client-space and board-space types visibly distinct.
- Prefer discriminated unions and exhaustive switches.
- Give exported functions meaningful return types.
- Use `crypto.randomUUID()` for new IDs.
- Handle missing indexed values instead of asserting them away.

Avoid:

- advanced branded types unless ordinary names fail;
- deep-readonly utilities;
- clever conditional/mapped types for simple data;
- enums where string unions are clearer;
- DOM event types leaking into domain functions;
- non-null assertions used as error suppression.

Good TypeScript here is **accurate and modest**.

---

## React standards

- Use function components and hooks.
- Keep rendering pure.
- Use functional state updates when based on previous state.
- Keep reducer actions semantic and narrow.
- Preserve unchanged state and note references.
- Return the existing state object for real no-ops.
- Use stable callbacks where they enable memoized child rendering.
- Use `React.memo(NoteCard)` with naturally stable props.
- Do not add custom memo comparators without measured need.
- Avoid per-note inline closures during drag frames; pass stable handlers and the note ID.
- Clean up timers, animation frames, and listeners.
- Do not duplicate derived state except for frame-specific preview state or explicit lifecycle phases.

### Expected render contract

During movement or resizing:

1. raw events update a ref;
2. preview state updates at most once per animation frame;
3. only the active note receives changing preview geometry;
4. inactive notes retain stable object references and props;
5. committed state changes only at gesture completion.

Do not optimize beyond this without evidence.

---

## Coordinate-system contract

Use a decorated outer frame and a borderless, padding-free inner coordinate surface:

```text
boardFrame
└── boardSurface
```

```css
.boardSurface {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  overflow: hidden;
}
```

The inner surface is the only coordinate system for:

- persisted rectangles;
- pointer conversion;
- creation previews;
- movement and resizing;
- trash bounds;
- clamping;
- CSS positioning.

Measure `boardSurface.getBoundingClientRect()`, never the decorated wrapper.

Measure bounds at gesture start, not on every pointer movement. Round committed geometry to integer pixels.

---

## Pointer and gesture contract

Use Pointer Events, not separate mouse implementations.

A gesture may begin only when:

```ts
event.isPrimary && event.button === 0
```

### Start boundaries

- Creation: empty board surface while create mode is armed.
- Movement: draggable note-header background only.
- Resize: bottom-right resize handle only.
- Textarea/header controls: may select/front the note, but must not start movement.
- Gesture origin element calls `setPointerCapture(pointerId)`.

Use `pointerdown`, `pointermove`, `pointerup`, `pointercancel`, and `lostpointercapture`. Do not install document-level mouse listeners.

### Frame-limited preview

On `pointermove`:

1. ignore stale pointer IDs;
2. update the latest raw board point in the gesture ref;
3. schedule one frame if none is pending;
4. calculate preview from the latest ref in that frame;
5. update React preview state once.

Never set React state for every raw pointer event.

### Commit

`pointerup` commits exactly once:

1. ignore a stale pointer ID;
2. convert the release event to a board point;
3. copy the active gesture locally;
4. set the gesture ref to idle;
5. cancel the pending frame;
6. calculate the final result from the release point;
7. dispatch the committed change;
8. clear preview state;
9. release pointer capture if still held.

Never commit from rendered preview state; it may be one frame behind.

### Cancellation

- `pointercancel`: cancel, never commit.
- `Escape`: cancel, never commit; disarm create mode.
- `lostpointercapture`: cancel only if the matching gesture remains active.
- stale pointer IDs: ignore.
- unmount: cancel frames/resources without setting state.

Clear the gesture before releasing capture so the resulting capture-loss event becomes a no-op.

---

## Creation behavior

Use named constants:

```ts
const MIN_NOTE_WIDTH = 160;
const MIN_NOTE_HEIGHT = 120;
const MIN_CREATE_DRAG_DISTANCE = 6;
```

Rules:

- Below-threshold drags create nothing.
- Keep create mode armed after a rejected drag.
- Do not show a preview before the threshold.
- Preview and commit use the same threshold and geometry function.
- Support normal and reverse drag directions.
- Apply minimum size, then normalize the complete rectangle to the board.
- Do not independently clamp origin and dimensions through unrelated logic.
- When the board is smaller than a configured minimum, use the available size on that axis.
- Successful creation appends, selects, requests textarea focus, and returns to select mode.

---

## Move, resize, and trash behavior

### Move

- Start only from the header.
- Bring the note to the front at interaction start.
- Keep it inside the board.
- Preview during movement; commit once on release.

### Resize

- Start only from the bottom-right handle.
- Enforce effective minimum dimensions.
- Keep the note inside the board.
- Use a generous hit target.
- Disable native textarea resizing.

### Trash

Deletion is pointer-targeted so every note remains deletable while clamped.

Use one pure predicate for both preview and commit:

```ts
isPointStrictlyInsideRectangle(currentPointer, trashRect)
```

- Strictly inside activates; edge contact does not.
- Never duplicate the predicate in separate preview/commit logic.
- UI copy should say: “Release while the cursor is over the trash.”
- Trash renders above notes with `pointer-events: none`.
- Active feedback must use text/icon/shape as well as color.

---

## Reducer and UI invariants

Reducer rules:

- no DOM, storage, focus, timers, or gesture state;
- immutable updates;
- preserve unaffected note references;
- missing-note actions return the existing state;
- bringing an already-frontmost note forward returns the existing state.

UI rules:

- creating selects the new note;
- interacting selects and fronts the note;
- clicking empty board space in select mode clears selection;
- removing the selected note clears selection;
- removing a pending-focus note clears that request;
- hydration begins with no selection;
- normalization does not alter selection.

Use one board-level removal helper so every deletion path shares the same cleanup behavior.

---

## Persistence and hydration

Use a namespaced key and versioned payload:

```ts
const STORAGE_KEY = "sticky-notes-ts:document";
type BoardPhase = "measuring" | "ready";
```

Persist only committed notes. Never persist selection, tool, gesture, preview, or focus state.

### Hydration order

1. Render the empty board surface.
2. Obtain a nonzero board measurement.
3. Read storage.
4. Parse the versioned payload.
5. Validate entries.
6. Normalize valid geometry to the measured board.
7. Install notes.
8. Transition to `ready`.

Do not render persisted geometry before normalization.

### Write gate

Never write before hydration reaches `ready`. This prevents the initial empty state—especially under React Strict Mode—from replacing valid saved notes.

Use one simple debounced save of approximately 300 ms for committed document changes. The textarea remains immediately controlled; only the storage write is delayed.

Do not implement `pagehide` flushing unless explicitly required.

### Validation policy

Treat storage as untrusted:

- missing storage → empty notes;
- invalid JSON/version/notes collection → empty notes;
- invalid individual entry → skip it;
- duplicate ID → retain the first valid note;
- invalid geometry or text type → skip the note;
- overlong text → truncate to the named maximum;
- storage read/write exception → keep the app operational.

Keep validation direct; do not add a schema library.

---

## Security and defensive coding

Required:

- Native `<textarea>` and plain-text content.
- Never use `dangerouslySetInnerHTML`.
- Never render stored HTML, Markdown, URLs, or CSS.
- Validate persisted `unknown` data.
- Catch storage failures.
- Use fixed internal style choices, not arbitrary stored CSS.
- Never include credentials or secrets.
- Keep runtime dependencies minimal.

Do not add authentication, CSP tooling, or server infrastructure to this client-only exercise.

---

## Accessibility and usability

- Native buttons and textarea.
- `aria-pressed` for armed create mode.
- Labels for icon-only controls.
- Visible focus indicators and selected-note outline.
- Sufficient contrast.
- Empty-state instructions.
- `grab`, `grabbing`, `nwse-resize`, and crosshair cursors.
- Trash feedback beyond color.
- `Escape` cancels gestures/create mode.

```css
.creationPreview,
.emptyState,
.trashZone {
  pointer-events: none;
}

.noteEditor {
  resize: none;
}

.noteHeader,
.resizeHandle {
  touch-action: none;
}
```

Apply `user-select: none` only during a gesture. Textarea selection must remain enabled.

Full keyboard movement/resizing is outside must-ship scope.

---

## CSS guidance

- Keep board styling near the board feature.
- Prefer classes/data attributes for UI state.
- Use CSS variables or a small style object only for dynamic geometry.
- Do not permanently apply `will-change` to every note.
- Disable decorative transitions during active gestures.
- Avoid `contain: paint` if it clips shadows.
- Ensure no page-level horizontal scrolling at 1024×768.
- Keep the toolbar compact enough to preserve board usability.

Visual polish must support clarity and never outrank interaction correctness.

---

## Testing priorities

Target approximately **8–12 focused unit tests**, using parameterization where appropriate.

### Geometry

- normal and reverse creation;
- short-drag rejection and minimum-edge behavior;
- movement clamping;
- resize clamping;
- pointer-based trash detection and strict edge behavior.

### Reducer

- targeted update preserves unaffected note references;
- frontmost bring-to-front is an identity no-op;
- missing-note actions are identity no-ops;
- removal behavior.

### Persistence

- invalid JSON;
- malformed notes;
- storage failure;
- no write before hydration reaches `ready`.

Avoid snapshot tests for core behavior.

A single Chromium Playwright smoke test is optional only after must-ship work is stable. Do not build page objects or a testing framework for one scenario.

### Manual checks

Before submission verify:

- create, edit, move, resize, reload, and delete;
- short-drag rejection;
- `Escape` cancellation;
- pointer leaving the note during a gesture;
- fast release before the scheduled frame;
- textarea/header/handle event boundaries;
- identical trash predicate for preview and commit;
- no pre-hydration save;
- exact 1024×768 layout;
- browsers/OS combinations actually available.

Claim only environments actually tested.

---

## Commands and quality gate

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
npm run preview
npm run check
```

`npm run check` must ultimately pass and includes type checking, linting, tests, and production build.

The initial scaffold intentionally has no fake test. The test/check command may fail with “no tests found” until the first real geometry or reducer test is added. Do not permanently enable pass-with-no-tests.

Run narrow checks while developing, then `npm run check` before completing the submission. Never weaken compiler, lint, or test rules to hide defects.

---

## Ticket workflow

For every ticket:

1. Read the full ticket and dependencies.
2. Identify the smallest file set that should change.
3. Preserve existing public contracts unless the ticket changes them.
4. Implement only the ticket behavior.
5. Add/update focused tests for real risk.
6. Run relevant checks.
7. Review the diff for duplicated logic, scope creep, and unrelated churn.
8. Verify acceptance criteria directly.

Implement gesture tickets sequentially in one working context because movement, resizing, creation, and trash share the interaction engine.

Geometry, reducer, and storage may be parallelized only after interfaces are agreed and changes will not collide.

Do not rewrite working code solely to match personal style.

---

## Code and comment quality

- Use domain-intent names.
- Keep functions to one obvious responsibility.
- Prefer early returns for invalid event paths.
- Avoid boolean parameters that obscure meaning.
- Never duplicate a critical predicate between preview and commit.
- Avoid catch-all utility files.
- Keep comments in English.
- Comment only non-obvious decisions.

Useful comments may explain:

- why raw pointer state lives in a ref;
- why final geometry uses the release event;
- why gesture state is cleared before releasing capture;
- why persistence is gated until hydration completes.

Remove unused helpers, speculative union members, dead code, and meaningless TODOs. Be prepared to explain every synchronization and ownership decision in an interview.

---

## README and submission

The final README must match the final code and include:

- implemented features;
- interaction instructions;
- Node/npm versions actually used;
- install/dev/test/build/preview/check commands;
- requested 2–3 architecture paragraphs;
- a few explicit trade-offs;
- browsers/OS combinations actually tested;
- known limitations;
- approximate time spent;
- one screenshot.

Do not submit internal tickets or the long planning document unless requested. Do not describe features or mechanisms that were not implemented. Include `package-lock.json` in the final submission.

---

## Definition of done

A ticket is done when:

- acceptance criteria are met;
- relevant tests and checks pass;
- no unrelated scope was added;
- established invariants remain intact;
- the code is easy to explain.

The submission is done when:

- all four core interactions are reliable;
- editing, fronting, and local-storage restoration work;
- hydration cannot overwrite valid data with initial empty state;
- cancellation and fast-release behavior are correct;
- the production build succeeds;
- focused tests pass;
- the app is usable at 1024×768;
- README claims exactly match the code;
- optional work has not compromised core quality.

---

## Final decision rule

When choosing between approaches, prefer the one that:

1. is correct under fast and cancelled pointer interactions;
2. makes lifecycle and ownership clearer;
3. uses fewer concepts;
4. is easier to test;
5. can be explained confidently in a senior interview;
6. fits the 3–4-hour time box.

More code is not a stronger hiring signal. A restrained, precise, working solution is.
