import { describe, expect, it } from "vitest";

import { initialNotesState, notesReducer } from "./notesReducer";
import type { NotesAction } from "./notesReducer";
import type { Note, NoteRect, NotesState } from "./types";
import { MAX_NOTE_TEXT_LENGTH } from "./types";

function makeNote(
  id: string,
  text = "",
  rect: NoteRect = { x: 0, y: 0, width: 160, height: 120 },
): Note {
  return { id, rect, text };
}

describe("notesReducer", () => {
  it.each<[string, NotesAction]>([
    ["frontmost bring-to-front", { type: "noteBroughtToFront", noteId: "b" }],
    ["missing bring-to-front", { type: "noteBroughtToFront", noteId: "missing" }],
    ["missing removal", { type: "noteRemoved", noteId: "missing" }],
    [
      "missing rect commit",
      {
        type: "noteRectCommitted",
        noteId: "missing",
        rect: { x: 0, y: 0, width: 160, height: 120 },
      },
    ],
    [
      "value-equal rect commit",
      {
        type: "noteRectCommitted",
        noteId: "b",
        rect: { x: 0, y: 0, width: 160, height: 120 },
      },
    ],
    ["missing text change", { type: "noteTextChanged", noteId: "missing", text: "x" }],
    ["unchanged text change", { type: "noteTextChanged", noteId: "b", text: "keep" }],
  ])("preserves the exact state object for a %s no-op", (_label, action) => {
    const state: NotesState = { notes: [makeNote("a"), makeNote("b", "keep")] };
    expect(notesReducer(state, action)).toBe(state);
  });

  it("updates only the target note and preserves unaffected note references", () => {
    const a = makeNote("a", "old");
    const b = makeNote("b", "keep");
    const state: NotesState = { notes: [a, b] };

    const rect: NoteRect = { x: 10, y: 20, width: 200, height: 150 };
    const afterRect = notesReducer(state, {
      type: "noteRectCommitted",
      noteId: "a",
      rect,
    });
    expect(afterRect).not.toBe(state);
    expect(afterRect.notes[0]).not.toBe(a);
    expect(afterRect.notes[0]?.rect).toEqual(rect);
    expect(afterRect.notes[1]).toBe(b);

    const afterText = notesReducer(state, {
      type: "noteTextChanged",
      noteId: "a",
      text: "new",
    });
    expect(afterText.notes[0]?.text).toBe("new");
    expect(afterText.notes[1]).toBe(b);

    const longText = "x".repeat(MAX_NOTE_TEXT_LENGTH + 10);
    const afterLong = notesReducer(state, {
      type: "noteTextChanged",
      noteId: "a",
      text: longText,
    });
    expect(afterLong.notes[0]?.text).toHaveLength(MAX_NOTE_TEXT_LENGTH);
  });

  it("hydrates, adds, reorders, and removes while preserving unaffected references", () => {
    const a = makeNote("a");
    const b = makeNote("b");
    const c = makeNote("c");

    const hydrated = notesReducer(initialNotesState, {
      type: "notesHydrated",
      notes: [a, b],
    });
    expect(hydrated.notes).toEqual([a, b]);

    const added = notesReducer(hydrated, { type: "noteAdded", note: c });
    expect(added.notes.map((note) => note.id)).toEqual(["a", "b", "c"]);
    expect(added.notes[0]).toBe(a);
    expect(added.notes[2]).toBe(c);

    const fronted = notesReducer(added, { type: "noteBroughtToFront", noteId: "a" });
    expect(fronted.notes.map((note) => note.id)).toEqual(["b", "c", "a"]);
    expect(fronted.notes[0]).toBe(b);
    expect(fronted.notes[2]).toBe(a);

    const removed = notesReducer(fronted, { type: "noteRemoved", noteId: "c" });
    expect(removed.notes.map((note) => note.id)).toEqual(["b", "a"]);
    expect(removed.notes[0]).toBe(b);
    expect(removed.notes[1]).toBe(a);
  });
});
