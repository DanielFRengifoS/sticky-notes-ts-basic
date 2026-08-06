import { describe, expect, it } from "vitest";

import { initialNotesState, notesReducer } from "./notesReducer";
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
  describe("noteAdded", () => {
    it("appends the note as frontmost and keeps prior note references", () => {
      const a = makeNote("a");
      const b = makeNote("b");
      const state: NotesState = { notes: [a] };
      const next = notesReducer(state, { type: "noteAdded", note: b });
      expect(next.notes).toHaveLength(2);
      expect(next.notes[0]).toBe(a);
      expect(next.notes[1]).toBe(b);
    });
  });

  describe("noteRemoved", () => {
    it("removes the target and preserves survivor references", () => {
      const a = makeNote("a");
      const b = makeNote("b");
      const state: NotesState = { notes: [a, b] };
      const next = notesReducer(state, { type: "noteRemoved", noteId: "a" });
      expect(next.notes).toEqual([b]);
      expect(next.notes[0]).toBe(b);
    });

    it("returns the same state reference when the id is missing", () => {
      const state: NotesState = { notes: [makeNote("a")] };
      expect(notesReducer(state, { type: "noteRemoved", noteId: "missing" })).toBe(
        state,
      );
    });
  });

  describe("noteRectCommitted", () => {
    it("replaces only the target rect and preserves other note references", () => {
      const a = makeNote("a");
      const b = makeNote("b");
      const state: NotesState = { notes: [a, b] };
      const rect: NoteRect = { x: 10, y: 20, width: 200, height: 150 };
      const next = notesReducer(state, {
        type: "noteRectCommitted",
        noteId: "a",
        rect,
      });
      expect(next.notes[0]?.rect).toEqual(rect);
      expect(next.notes[0]).not.toBe(a);
      expect(next.notes[1]).toBe(b);
    });

    it("returns the same state when the rect is value-equal", () => {
      const a = makeNote("a", "", { x: 5, y: 5, width: 160, height: 120 });
      const state: NotesState = { notes: [a] };
      const next = notesReducer(state, {
        type: "noteRectCommitted",
        noteId: "a",
        rect: { x: 5, y: 5, width: 160, height: 120 },
      });
      expect(next).toBe(state);
    });

    it("returns the same state when the id is missing", () => {
      const state: NotesState = { notes: [makeNote("a")] };
      expect(
        notesReducer(state, {
          type: "noteRectCommitted",
          noteId: "missing",
          rect: { x: 0, y: 0, width: 160, height: 120 },
        }),
      ).toBe(state);
    });
  });

  describe("noteTextChanged", () => {
    it("updates only the target text", () => {
      const a = makeNote("a", "old");
      const b = makeNote("b", "keep");
      const state: NotesState = { notes: [a, b] };
      const next = notesReducer(state, {
        type: "noteTextChanged",
        noteId: "a",
        text: "new",
      });
      expect(next.notes[0]?.text).toBe("new");
      expect(next.notes[1]).toBe(b);
    });

    it("returns the same state when the text is unchanged", () => {
      const state: NotesState = { notes: [makeNote("a", "same")] };
      expect(
        notesReducer(state, { type: "noteTextChanged", noteId: "a", text: "same" }),
      ).toBe(state);
    });

    it("truncates text longer than MAX_NOTE_TEXT_LENGTH", () => {
      const state: NotesState = { notes: [makeNote("a")] };
      const longText = "x".repeat(MAX_NOTE_TEXT_LENGTH + 50);
      const next = notesReducer(state, {
        type: "noteTextChanged",
        noteId: "a",
        text: longText,
      });
      expect(next.notes[0]?.text).toHaveLength(MAX_NOTE_TEXT_LENGTH);
    });

    it("returns the same state when the id is missing", () => {
      const state: NotesState = { notes: [makeNote("a")] };
      expect(
        notesReducer(state, { type: "noteTextChanged", noteId: "missing", text: "x" }),
      ).toBe(state);
    });
  });

  describe("noteBroughtToFront", () => {
    it("moves the target to the end while preserving every reference", () => {
      const a = makeNote("a");
      const b = makeNote("b");
      const c = makeNote("c");
      const state: NotesState = { notes: [a, b, c] };
      const next = notesReducer(state, {
        type: "noteBroughtToFront",
        noteId: "a",
      });
      expect(next.notes).toEqual([b, c, a]);
      expect(next.notes[0]).toBe(b);
      expect(next.notes[1]).toBe(c);
      expect(next.notes[2]).toBe(a);
    });

    it("returns the same state when the note is already frontmost", () => {
      const state: NotesState = { notes: [makeNote("a"), makeNote("b")] };
      expect(
        notesReducer(state, { type: "noteBroughtToFront", noteId: "b" }),
      ).toBe(state);
    });

    it("returns the same state when the id is missing", () => {
      const state: NotesState = { notes: [makeNote("a")] };
      expect(
        notesReducer(state, { type: "noteBroughtToFront", noteId: "missing" }),
      ).toBe(state);
    });
  });

  describe("notesHydrated", () => {
    it("replaces the notes array", () => {
      const restored = [makeNote("a"), makeNote("b")];
      const next = notesReducer(initialNotesState, {
        type: "notesHydrated",
        notes: restored,
      });
      expect(next.notes).toEqual(restored);
    });
  });
});
