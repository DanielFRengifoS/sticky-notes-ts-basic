TICKET ID: SN-17
TITLE: Complete the concise README and submission-quality package
PRIORITY: BLOCKING BEFORE SUBMISSION
DEPENDS ON: SN-16
PRIMARY FILE:
- README.md
OTHER OUTPUT:
- One application screenshot
- Final source package as required by the employer
- Package lockfile

GOAL
Produce a concise, truthful submission that explains how to run the app, what was implemented, how the architecture works, and what was actually tested.

README REQUIRED SECTIONS

1. IMPLEMENTED FEATURE CHECKLIST
Include:
- Drag to create.
- Drag header to move.
- Bottom-right resize.
- Release pointer over trash to delete.
- Text editing.
- Bring-to-front.
- Local-storage restore/save.
- Escape cancellation.
Do not list unimplemented colors, REST API, Delete key, pagehide flush, or Playwright.

2. INTERACTION INSTRUCTIONS
Explain briefly:
- Click "New note".
- Drag empty board to create.
- Drag note header to move.
- Drag bottom-right handle to resize.
- Release cursor over trash to delete.
- Click/type in textarea to edit.
- Press Escape to cancel create mode or active gesture.

3. COMMANDS AND RUNTIME
Document exactly:
npm install
npm run dev
npm run check
npm run build
npm run preview

Commands must match package.json.
- Explain that npm run preview serves the already-built production output for evaluator inspection.
- Record the Node.js version actually used.
- Record the npm version actually used.
- Do not state unverified compatibility ranges; report the concrete tool versions used to produce the submission.

4. ARCHITECTURE DESCRIPTION - 2 TO 3 PARAGRAPHS
Use the final implementation as source of truth. The target content is:

Paragraph 1:
- Committed note data is separate from temporary pointer interactions.
- Notes use an ordered array; order is stacking.
- A small pure reducer handles document changes and preserves unaffected references.
- A borderless, padding-free boardSurface is the single coordinate system for CSS, pointer conversion, geometry, trash targeting, and persisted rectangles.

Paragraph 2:
- Pointer Events with pointer capture.
- Raw pointer movement in a mutable gesture ref.
- At most one React preview update per animation frame.
- Only active memoized NoteCard gets changing preview props.
- Final geometry is calculated from pointerup, not the last frame.
- Separate commit/cancel paths prevent stale frames and accidental commits.

Paragraph 3:
- Explicit measuring/hydration phase.
- Stored notes are validated and normalized before installation.
- Saving is disabled until hydration completes.
- Debounced versioned local storage.
- Plain-text editing, bring-to-front, pointer-targeted trash deletion.
- Deliberate avoidance of external drag libraries and generalized infrastructure.

Use only claims true of final code. Reduce to two paragraphs if necessary.

5. IMPORTANT TRADE-OFFS
State concise rationale for:
- No external drag library so core interaction engineering remains visible.
- No continuous board-resize normalization.
- No pagehide flush.
- Focused unit tests rather than exhaustive browser/schema infrastructure.
- Array order as z-order because expected note count is small.

6. BROWSER SUPPORT TARGETS
State the intended requirement separately from testing evidence:

Targeted: current Chrome, Firefox, and Edge, as required by the assessment brief.

This section describes the compatibility target, not a claim that every browser/OS combination was manually available.

7. MANUAL BROWSER VERIFICATION
List only the exact browser version and operating-system combinations actually tested in SN-16, for example:
- Chrome 1xx on Windows 11
- Firefox 1xx on Windows 11

Use real observed versions in the final README, not the example placeholders above.
When a required environment was unavailable, state that plainly and, if true, note that the implementation uses the same standards-based Pointer Events path without claiming manual verification.
Do not fabricate Edge, macOS, or other results.

8. KNOWN LIMITATIONS
Truthfully include any remaining limitations, such as:
- Desktop-only design.
- No continuous repositioning when viewport changes after hydration.
- No colors, REST API, undo/redo, or keyboard drag/resize.
Only mention real limitations.

9. APPROXIMATE TIME SPENT
Provide the actual approximate time, not the target budget.

10. SCREENSHOT
Include one useful screenshot of the finished application showing:
- Multiple notes.
- Overlap/stacking.
- Toolbar.
- Trash zone.
Do not include private browser data.

FINAL QUALITY CHECK
Before submission:
- Run npm run check.
- Run npm run build explicitly if not already included.
- Run npm run preview and inspect the production build.
- Confirm README commands work.
- Include the generated package lockfile (for example package-lock.json) in the submission.
- Confirm the documented Node.js and npm versions match the environment actually used.
- Confirm every README architectural claim matches code.
- Confirm no full internal planning document is submitted unless specifically requested.
- Confirm screenshot path/link resolves.
- Remove generated logs, test artifacts, and irrelevant files.

OUT OF SCOPE
- Marketing-style long documentation.
- Full design document submission.
- Claims about unsupported/untested environments.
- Optional features begun at the last minute.

ACCEPTANCE CRITERIA
- README is concise.
- Architecture description is 2-3 paragraphs in English.
- Feature list and commands are accurate.
- Trade-offs, browser support targets, actual manual verification, known limitations, and time spent are present.
- package-lock.json (or the package manager's equivalent lockfile) is included.
- Node.js and npm versions actually used are documented.
- npm run preview is documented and works after npm run build.
- One screenshot is included.
- npm run check passes immediately before packaging.
- Final source is reviewable and contains no unnecessary artifacts.

DONE WHEN
The assessment can be handed to the reviewer without requiring unstated setup knowledge or contradicting the actual implementation.
