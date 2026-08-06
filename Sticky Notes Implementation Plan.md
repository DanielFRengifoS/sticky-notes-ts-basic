# **Sticky Notes — Final Frozen Implementation** 

# **Plan** 

## **1. Objective** 

Build a polished React and TypeScript sticky-notes application that demonstrates senior-level judgment through: 

- Reliable pointer interactions. 

- Clear state ownership. 

- Strong but understandable TypeScript. 

- Safe local-storage hydration. 

- Consistent coordinate handling. 

- Focused testing. 

- Sensible scope control. 

The objective is not to build a production platform. The objective is to ship a cohesive implementation that is easy to review, works reliably, and can be explained confidently in an interview. 

## **2. Hard delivery boundary** 

### **Must ship** 

Implement: 

1. Create a note by dragging on the board. 

2. Move a note by dragging its header. 

3. Resize a note using a bottom-right handle. 

4. Delete a note by releasing while the cursor is over the trash zone. 

5. Edit note text. 

6. Bring an interacted note to the front. 

7. Restore and save notes using versioned local storage. 

8. Cancel creation mode or an active gesture with <mark>`Escape` .</mark> 

Also include: 

- Pointer capture. 

- Correct gesture cancellation. 

- Final geometry calculated from the release event. 

- Strict TypeScript. 

- Pure geometry functions. 

- A focused reducer. 

- Memoized note rendering. 

- Focused unit tests. 

- 

- A successful production build. 

- 

- A concise README with the requested architecture description. 

1 

### **First things to cut when behind schedule** 

Do not implement these unless the complete must-ship scope is already stable: 

- `pagehide` persistence flushing. 

- Playwright infrastructure. 

- Delete-key support. 

- Different note colors. 

- Continuous resize normalization. 

- Extensive persistence-validator edge cases. 

- Animations unrelated to interaction feedback. 

- Any abstraction that is not already making the code simpler. 

Do not implement the mocked REST API. 

### **Time checkpoint** 

At approximately **2 hours and 30 minutes** , all four core interactions must already work: 

• Create. • Move. • Resize. • Delete. 

Persistence, tests, and polish must not consume time needed to stabilize these interactions. 

## **3. Source-code architecture** 

```
src/
├── domain/
│   ├── geometry.ts
│   ├── geometry.test.ts
│   ├── notesReducer.ts
│   ├── notesReducer.test.ts
│   └── types.ts
├── infrastructure/
│   ├── notesStorage.ts
│   └── notesStorage.test.ts
├── features/
│   └── board/
│       ├── Board.tsx
│       ├── Board.css
│       ├── NoteCard.tsx
│       └── useBoardGestures.ts
├── App.tsx
└── main.tsx
```

2 

### **Responsibilities** 

#### **<mark>`domain/types.ts`</mark>** 

Contains: 

- Note types. • Geometry types. • Gesture types. • Constants shared by the domain. 

#### **<mark>`domain/geometry.ts`</mark>** 

Contains pure functions for: 

- Pointer conversion. 

- Creation geometry. • Movement. • Resizing. • Board clamping. 

- Trash detection. 

- Hydration normalization. 

#### **<mark>`domain/notesReducer.ts`</mark>** 

Contains committed note-state transitions only. 

It does not: 

- Measure the DOM. 

- Read or write storage. • Track pointer gestures. • Manage focus. • Schedule animation frames. 

#### **<mark>`infrastructure/notesStorage.ts`</mark>** 

Contains: 

- Storage parsing. • Validation. • Version handling. • Safe reads. • Safe writes. 

It does not contain React code. 

3 

#### **<mark>`features/board/useBoardGestures.ts`</mark>** 

Owns the technically dense interaction lifecycle: 

- Mutable gesture ref. 

- Pointer capture. 

- Pointer movement. 

- Animation-frame scheduling. 

- Preview state. 

- Commit behavior. 

- Cancellation behavior. • Trash activation. 

This hook is specific to the sticky-note board. It should not become a generic drag-and-drop framework. 

#### **<mark>`features/board/Board.tsx`</mark>** 

Owns: 

- Notes reducer. 

- Hydration phase. • Selected note. 

- Active creation tool. 

- Focus coordination. • Persistence effect. 

- Board rendering. 

#### **<mark>`features/board/NoteCard.tsx`</mark>** 

Owns the presentation and local event boundaries of one note: 

- Header. • Textarea. 

- Resize handle. 

- Selected styling. • Active preview rectangle. 

Do not add context providers, repositories, service layers, or additional hooks unless implementation complexity genuinely requires them. 

## **4. Coordinate system** 

Use two separate board elements: 

```
boardFrame
└── boardSurface
    ├── notes
    ├── creation preview
```

4 

```
    ├── empty-state text
    └── trash zone
```

<mark>`boardFrame`</mark> owns decoration: 

- Border. • Shadow. • Background framing. • Outer spacing. 

<mark>`boardSurface`</mark> is the only coordinate system used by the application: 

```
.boardSurface{
position:relative;
width:100%;
height:100%;
padding:0;
border:0;
overflow:hidden;
}
```

Every board-space value is relative to <mark>`.boardSurface` :</mark> 

- Persisted note rectangles. 

- Pointer coordinates. • Creation previews. 

- Movement geometry. 

- Resize geometry. 

- Trash bounds. 

- CSS positioning. • Board clamping. 

Measure: 

```
boardSurface.getBoundingClientRect();
```

Do not use the decorated outer wrapper for geometry calculations. 

## **5. Domain model** 

```
typeNoteId=string;
```

```
interfaceClientPoint{
clientX:number;
clientY:number;
}
```

5 

```
interfaceBoardPoint{
x:number;
y:number;
}
interfaceSize{
width:number;
height:number;
}
interfaceNoteRectextendsBoardPoint,Size{}
interfaceBoardBounds{
left:number;
top:number;
width:number;
height:number;
}
interfaceNote{
id:NoteId;
rect:NoteRect;
text:string;
}
interfaceNotesState{
notes:Note[];
}
```

The order of <mark>`notes`</mark> is the stacking order. The final note is frontmost. 

An array is appropriate because: 

• The expected note count is small. • Stacking maps directly to array order. • Persistence is simple. • The reducer remains easy to understand. 

## **6. Constants** 

```
constMIN_NOTE_WIDTH=160;
constMIN_NOTE_HEIGHT=120;
constMIN_CREATE_DRAG_DISTANCE=6;
constMAX_NOTE_TEXT_LENGTH=5000;
constSTORAGE_KEY="sticky-notes-ts:document";
constSTORAGE_DEBOUNCE_MS=300;
```

6 

### **Short creation gestures** 

A creation gesture must move at least six pixels from its origin. 

If the drag remains below that threshold: 

- Do not show a creation preview. 

- Do not create a note on release. 

- Return to the idle gesture state. 

- Keep the create tool armed so the user may try again. 

This matches the instruction that the user should drag to create a note and avoids accidental note creation from ordinary clicks. 

Preview and commit must use the same threshold and the same geometry function. 

## **7. Application phase** 

```
typeBoardPhase="measuring"|"ready";
typeBoardTool="select"|"create";
interfaceBoardUiState{
phase:BoardPhase;
tool:BoardTool;
selectedId:NoteId|null;
pendingFocusId:NoteId|null;
}
```

The board begins in <mark>`"measuring"` .</mark> 

### **Hydration sequence** 

1. Render the empty board surface. 

2. Obtain a valid nonzero board measurement. 

3. Read local storage. 

4. Parse the stored payload. 

5. Validate stored notes. 

6. Normalize valid geometry against the measured board. 

7. Install the hydrated notes. 

8. Transition the board to <mark>`"ready"` .</mark> 

Persisted notes are not rendered before they have been normalized. 

### **Write gate** 

The persistence contract is: 

The application must never write to storage before hydration has completed. 

7 

The save effect must immediately return unless: 

```
phase==="ready"
```

This prevents React Strict Mode or initial effects from replacing valid saved notes with the initial empty state. 

## **8. Gesture model** 

```
typeGesture=
|{
type:"idle";
}
|{
type:"creating";
pointerId:number;
pointerOrigin:BoardPoint;
latestPointer:BoardPoint;
boardBounds:BoardBounds;
}
|{
type:"moving";
pointerId:number;
noteId:NoteId;
pointerOrigin:BoardPoint;
latestPointer:BoardPoint;
initialRect:NoteRect;
boardBounds:BoardBounds;
trashRect:NoteRect;
}
|{
type:"resizing";
pointerId:number;
noteId:NoteId;
pointerOrigin:BoardPoint;
latestPointer:BoardPoint;
initialRect:NoteRect;
boardBounds:BoardBounds;
};
```

The active tool and active gesture are separate concepts. 

The raw gesture is stored in a mutable ref. React state contains only the current rendered preview. 

8 

## **9. Pointer-start rules** 

A gesture starts only when: 

```
event.isPrimary===true&&event.button===0
```

### **Creation** 

Creation begins only when: 

- The board tool is <mark>`"create"` .</mark> 

- The user presses the empty board surface. • The pointer is not currently over the trash zone. 

### **Movement** 

Movement begins only from the draggable background of the note header. 

Buttons or controls inside the header must not initiate movement. 

### **Resizing** 

Resizing begins only from the bottom-right resize handle. 

### **Editing and selection** 

The textarea and note controls may: 

- Select the note. 

- Bring it to the front. 

They must not initiate movement. 

### **Pointer capture** 

The element that begins the gesture captures the pointer: 

```
event.currentTarget.setPointerCapture(event.pointerId);
```

Use Pointer Events: 

- <mark>`pointerdown`</mark> 

- 

- 

- 

- <mark>`pointermove`</mark> 

- <mark>`pointerup`</mark> 

- <mark>`pointercancel`</mark> 

- <mark>`lostpointercapture`</mark> 

Do not install document-level mouse listeners. 

9 

## **10. Frame-limited preview behavior** 

Pointer movement uses three layers: 

1. Raw pointer coordinates update <mark>`gestureRef.current` .</mark> 

2. At most one animation-frame callback is scheduled. 

3. The callback calculates and installs the latest visual preview. 

Do not call React state setters for every raw <mark>`pointermove` .</mark> 

### **Fast-release safety** 

On <mark>`pointerup` ,</mark> calculate the final geometry directly from the release event. 

Do not use the last rendered preview as the committed result because it may be one animation frame behind. 

## **11. Gesture termination** 

Use two explicit terminal operations: 

```
functioncommitActiveGesture(
pointerId:number,
releasePoint:ClientPoint
):void;
functioncancelActiveGesture(
reason:
|"pointer-cancelled"
|"capture-lost"
|"escape"
|"unmount"
):void;
```

### **Successful commit** 

<mark>`pointerup`</mark> must: 

1. Ignore the event if its pointer ID is not active. 

2. Convert the release point into board coordinates. 

3. Copy the active gesture into a local variable. 

4. Set the gesture ref to idle. 

5. Cancel any pending animation frame. 

- Calculate the final geometry from the release point. 

6. 

7. Dispatch the relevant reducer action. 

8. Clear preview state. 

9. Release pointer capture if it is still held. 

10 

Clearing the gesture before releasing pointer capture ensures that a following <mark>`lostpointercapture`</mark> event does nothing. 

### **Cancellation** 

<mark>`pointercancel` ,</mark> <mark>`Escape` ,</mark> and an active <mark>`lostpointercapture`</mark> must: 

1. Set the gesture ref to idle. 

2. Cancel the pending animation frame. 

3. Clear preview state. 

4. Never commit geometry. 

Unmount performs ref and animation-frame cleanup without trying to update React state. 

## **12. Geometry behavior** 

Pure functions should include: 

```
functionclientPointToBoardPoint(
point:ClientPoint,
bounds:BoardBounds
):BoardPoint;
functionhasReachedCreateThreshold(
origin:BoardPoint,
current:BoardPoint
):boolean;
functioncreateRectFromDrag(
origin:BoardPoint,
current:BoardPoint,
boardSize:Size
):NoteRect;
functionmoveRect(
initialRect:NoteRect,
pointerOrigin:BoardPoint,
currentPointer:BoardPoint,
boardSize:Size
):NoteRect;
functionresizeRect(
initialRect:NoteRect,
pointerOrigin:BoardPoint,
currentPointer:BoardPoint,
boardSize:Size
):NoteRect;
```

```
functionnormalizeRectToBoard(
```

11 

```
rect:NoteRect,
boardSize:Size
):NoteRect;
```

```
functionisPointStrictlyInsideRectangle(
point:BoardPoint,
rect:NoteRect
):boolean;
```

### **Creation near board edges** 

Creation should follow this order: 

1. Calculate the rectangle implied by the drag direction. 

2. Apply the minimum dimensions. 

3. Normalize the complete rectangle against the board. 

Do not independently clamp the origin, width, and height through unrelated operations. 

If the board is smaller than the configured minimum note dimensions, use the available board dimensions as the effective maximum and minimum for that axis. 

Committed values should be rounded to integer pixels. 

## **13. Trash behavior** 

Deletion is based on pointer position: 

```
functionisPointerOverTrash(
pointer:BoardPoint,
trashRect:NoteRect
):boolean{
returnisPointStrictlyInsideRectangle(pointer,trashRect);
}
```

The exact same function controls: 

- Trash active styling. 

- Final deletion on release. 

Do not independently reproduce the condition in the preview and commit paths. 

The note remains clamped inside the board while moving. 

Visible guidance should make the interaction explicit: 

Release while the cursor is over the trash. 

12 

The trash zone: 

- Renders visually above notes. 

- Uses <mark>`pointer-events: none` .</mark> 

- Changes icon, text, or shape when active. 

- Does not communicate activation through color alone. 

## **14. Reducer** 

```
typeNotesAction=
|{type:"notesHydrated";notes:Note[]}
|{type:"noteAdded";note:Note}
|{type:"noteRectCommitted";noteId:NoteId;rect:NoteRect}
|{type:"noteTextChanged";noteId:NoteId;text:string}
|{type:"noteBroughtToFront";noteId:NoteId}
|{type:"noteRemoved";noteId:NoteId};
```

Reducer requirements: 

- Pure and deterministic. 

- No DOM access. 

- No persistence access. 

- No gesture state. 

- Preserve unaffected note object references. 

- 

- Return the existing state object for missing IDs. 

- Return the existing state when the note is already frontmost. 

- Change only the targeted note for text or geometry updates. 

<mark>`notesHydrated`</mark> runs once before the board transitions to <mark>`"ready"` .</mark> 

## **15. Memoized note rendering** 

```
exportconstNoteCard=memo(NoteCardComponent);
```

A note should receive: 

```
<NoteCard
key={note.id}
note={note}
previewRect={
preview?.noteId===note.id?preview.rect:undefined
}
selected={selectedId===note.id}
pendingFocus={pendingFocusId===note.id}
onTextChange={handleTextChange}
```

13 

```
onHeaderPointerDown={handleHeaderPointerDown}
onResizePointerDown={handleResizePointerDown}
```

```
onFocusRequestConsumed={handleFocusRequestConsumed}
```

```
/>
```

Requirements: 

- Board handlers remain stable. 

- 

- <mark>`NoteCard`</mark> passes its <mark>`note.id`</mark> into those handlers. 

- The notes render loop does not create new callback closures for every note. 

- 

- Only the active note receives changing preview geometry. 

- Unaffected note objects retain their identity. 

- • Unaffected note props remain stable. 

Do not use custom <mark>`React.memo`</mark> comparison functions unless a demonstrated issue requires them. 

## **16. Selection and focus** 

Creating a note: 

1. Adds it. 

2. Selects it. 

3. Places it at the front by appending it. 

4. Sets <mark>`pendingFocusId` .</mark> 

5. Returns the board tool to <mark>`"select"` .</mark> 

Interacting with a note: 

- Selects it. • Brings it to the front. 

Clicking the empty board in select mode clears selection. 

Removing the selected note clears selection. 

Hydration begins with no selected note. 

For focus after creation: 

- <mark>`NoteCard`</mark> receives whether it owns pending focus. 

- Its textarea callback ref or layout effect focuses the element. 

- 

- It reports that the focus request has been consumed. 

- Restored notes never autofocus. 

## **17. Persistence** 

Stored format: 

14 

```
interfacePersistedNotesV1{
version:1;
notes:unknown;
}
```

Functions: 

```
functionparseStoredJson(raw:string|null):unknown;
```

```
functionparsePersistedNotes(value:unknown):Note[];
functionloadNotes(storage:Storage):Note[];
functionsaveNotes(storage:Storage,notes:Note[]):void;
```

### **Validation policy** 

- Missing storage: empty notes. 

- Invalid JSON: empty notes. 

- Unsupported version: empty notes. 

- Invalid notes collection: empty notes. 

- Invalid individual note: skip it. 

- Duplicate ID: keep the first valid note. 

- 

- Invalid geometry: skip the note. 

- 

- Text longer than the maximum: truncate it. 

- Storage read or write failure: catch the error and keep the application usable. 

- Board-dependent geometry clamping: after the initial board measurement. 

### **Saving** 

Use one ordinary debounced save for all committed document changes: 

```
constSTORAGE_DEBOUNCE_MS=300;
```

The textarea remains fully controlled and updates React immediately. Only the storage write is delayed. 

Do not implement <mark>`pagehide`</mark> flushing. 

Clear the pending timer during effect cleanup. 

The write effect runs only when: 

```
phase==="ready"
```

15 

## **18. Board resizing** 

Continuous board-resize normalization is outside the must-ship scope. 

The critical implementation should: 

- Measure the board before hydration. 

- Measure current bounds when a gesture begins. 

- Normalize restored notes once. • Clamp every new or modified note when committed. 

Do not continuously rewrite and persist note positions while the browser window is resized. 

Verify that: 

- The page does not create horizontal scrolling at <mark>`1024 × 768` .</mark> 

- The toolbar leaves adequate room for the board. 

- The board remains usable at the minimum supported resolution. 

## **19. Styling and event details** 

```
.creationPreview,
.emptyState,
.trashZone{
pointer-events:none;
}
.noteEditor{
resize:none;
}
.noteHeader,
.resizeHandle{
touch-action:none;
}
.boardSurface[data-gesture-active="true"]{
user-select:none;
}
```

Also include: 

- <mark>`grab`</mark> and <mark>`grabbing`</mark> cursors. 

- <mark>`nwse-resize`</mark> cursor. 

- Crosshair cursor in create mode. 

- A generous resize-handle hit area. 

- 

- Clear selected-note styling. 

- 

- No decorative transitions during a gesture. 

16 

• <mark>`aria-pressed`</mark> on the create button. • Default button text: <mark>`New note` .</mark> • Armed text: <mark>`Drag on the board to create` .</mark> 

Textarea selection must remain enabled. 

## **20. TypeScript configuration** 

Enable: 

```
{
"strict":true,
"noUncheckedIndexedAccess":true,
"exactOptionalPropertyTypes":true,
```

```
"useUnknownInCatchVariables":true
}
```

Avoid: 

- <mark>`any` .</mark> 

- Unvalidated assertions. 

- Generic abstractions used once. 

- Complex branded coordinate types. 

- Deep-readonly utility types. 

- Long comments that repeat the implementation. 

Comments should explain only non-obvious behavior, particularly: 

- Why raw gestures live in a ref. 

- Why final geometry comes from <mark>`pointerup` .</mark> • Why the gesture is cleared before releasing pointer capture. • Why saving is disabled before hydration completes. 

## **21. Focused tests** 

Target approximately 8–12 meaningful unit tests. 

### **Geometry** 

- Creation in more than one drag direction. 

- Drag below the six-pixel creation threshold. 

- Minimum note size near board edges. 

- Movement clamping. 

- Resize clamping. 

- Pointer-based trash detection. 

- 

- Strict trash-edge behavior. 

17 

### **Reducer** 

- Add and remove a note. 

- Commit note geometry. 

- Bring a note to front. 

- Frontmost no-op preserves the state reference. 

- Missing-note no-op preserves the state reference. • Unaffected note references are preserved. 

### **Persistence** 

Prioritize: 

- Invalid JSON returns empty notes. 

- Malformed individual notes are skipped. 

- Storage failures do not crash. 

- Saving is disabled before the board reaches <mark>`"ready"` .</mark> 

Do not build an exhaustive schema-validation suite. 

### **Manual verification** 

Manually verify: 

- Create. • Edit. • Move. • Resize. 

- Reload and restore. 

- Delete through trash. 

- <mark>`Escape`</mark> cancellation. 

- Pointer leaving the note during movement. 

- Fast release before the scheduled animation-frame callback. 

- Correct event behavior for textarea, header, and resize handle. 

- No storage write before hydration. 

- Layout at exactly <mark>`1024 × 768` .</mark> 

- Chrome, Firefox, and Edge where available. 

### **Optional browser test** 

Only after the complete must-ship implementation is stable, add one Chromium Playwright smoke test: 

1. Enter create mode. 

2. Create a note. 

3. Type text. 

4. Move it. 

5. Resize it. 6. Reload and confirm persistence. 

7. Drag it to trash. 8. Confirm deletion. 

Do not introduce page objects or additional testing infrastructure. 

18 

## **22. Time budget** 

### **0:00–0:25 — Setup** 

- Vite React TypeScript. • Strict compiler configuration. 

- ESLint and test setup. 

- README command skeleton. • Board frame and coordinate surface. 

### **0:25–0:50 — Domain foundation** 

- Types. • Constants. 

- Reducer. • Geometry functions. • Static notes. • Memoized <mark>`NoteCard` .</mark> 

### **0:50–2:20 — Core interactions** 

- Movement. 

- Resizing. • Creation. 

- Short-drag threshold. 

- Pointer capture. • Frame-limited preview. 

- Commit and cancellation. • Trash deletion. 

### **2:20–2:30 — Core checkpoint** 

All four interactions must work reliably. 

If they do not, stop adding scope and stabilize them. 

### **2:30–2:50 — Editing and UI state** 

- Controlled textarea. • Selection. 

- Bring-to-front. 

- Focus after creation. • Empty-state guidance. 

- <mark>`Escape` .</mark> 

### **2:50–3:15 — Persistence** 

- Initial measurement. 

- Explicit hydration phase. 

- Basic validation. 

- One-time normalization. 

19 

- Debounced write gate. • Reload verification. 

### **3:15–3:35 — Focused tests** 

- High-risk geometry tests. • Reducer reference tests. • Persistence hydration test. 

### **3:35–4:00 — Submission quality** 

- Run the complete quality command. 

- Run the production build. 

- Manual browser testing. 

- Check <mark>`1024 × 768` .</mark> 

- Complete the concise README. 

- Capture one screenshot. • Remove unused abstractions and speculative comments. 

Do not start colors or Playwright unless the required application is already complete and polished. 

## **23. Verification command** 

```
{
"scripts":{
"check":"npm run typecheck && npm run lint && npm run test -- --run &&
npm run build"
}
}
```

The final command should catch: 

- Type errors. • Lint failures. • Unit-test failures. • Production bundling problems. 

## **24. Submitted README** 

Keep the README concise. 

It should contain: 

- Implemented feature checklist. 

- 

- Interaction instructions. 

- 

- <mark>`npm install` .</mark> 

- <mark>`npm run dev` .</mark> 

20 

- <mark>`npm run check` .</mark> 

- <mark>`npm run build` .</mark> 

- Two-to-three architecture paragraphs. 

- Important trade-offs. 

- Browsers and operating systems actually tested. 

- Known limitations. 

- Approximate time spent. • One screenshot. 

Do not submit the full internal planning document unless specifically requested. 

Every architectural claim in the README must match the final code. 

## **25. Submission architecture description** 

The application separates committed note data from temporary pointer interactions. Notes are stored in an ordered array whose order represents stacking, and document changes are handled by a small pure reducer that preserves references for unaffected notes. A borderless, padding-free board surface defines the single coordinate system used by CSS positioning, pointer conversion, geometry calculations, trash targeting, and persisted note rectangles. 

Pointer interactions use the Pointer Events API with pointer capture. Raw pointer movement is stored in a mutable gesture ref, while React receives at most one preview update per animation frame. Only the active memoized note receives changing preview props, and final geometry is calculated synchronously from the release event rather than the last rendered frame. Successful commits and cancellations use separate terminal paths to prevent stale frames, duplicate cleanup, and accidental commits. 

Persistence uses an explicit measuring and hydration phase. Stored notes are read, validated, normalized against the measured board, and installed before saving is enabled, preventing the initial empty state from replacing valid data. Notes support plain-text editing, bring-to-front behavior, and pointer-targeted drag-to-trash deletion. The implementation intentionally avoids external drag libraries and generalized infrastructure so that the core interaction engineering remains visible and easy to review. 

21 

