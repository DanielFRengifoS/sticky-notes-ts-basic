import { describe, expect, it } from "vitest";

import { loadNotes, parsePersistedNotes, saveNotes } from "./notesStorage";
import type { Note } from "../domain/types";
import { MAX_NOTE_TEXT_LENGTH, STORAGE_KEY } from "../domain/types";

function fakeStorage(seed: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(seed));
  return {
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  } as unknown as Storage;
}

const throwingStorage = {
  getItem() {
    throw new Error("storage unavailable");
  },
  setItem() {
    throw new Error("storage unavailable");
  },
} as unknown as Storage;

function rawNote(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "note-1",
    rect: { x: 10, y: 20, width: 160, height: 120 },
    text: "hello",
    ...overrides,
  };
}

describe("notesStorage", () => {
  it("returns no notes for a payload root it does not recognise", () => {
    expect(parsePersistedNotes(null)).toEqual([]);
    expect(parsePersistedNotes(42)).toEqual([]);
    expect(parsePersistedNotes({ notes: [] })).toEqual([]);
    expect(parsePersistedNotes({ version: 2, notes: [] })).toEqual([]);
    expect(parsePersistedNotes({ version: 1, notes: "nope" })).toEqual([]);
  });

  it("skips malformed entries and keeps their valid siblings", () => {
    const notes = parsePersistedNotes({
      version: 1,
      notes: [
        rawNote({ id: "" }),
        rawNote({ id: 7 }),
        rawNote({ rect: undefined }),
        rawNote({ rect: { x: 0, y: 0, width: 0, height: 120 } }),
        rawNote({ text: 123 }),
        "garbage",
        null,
        rawNote(),
      ],
    });

    expect(notes).toEqual([
      { id: "note-1", rect: { x: 10, y: 20, width: 160, height: 120 }, text: "hello" },
    ]);
  });

  it("keeps the first of two notes sharing an id", () => {
    const notes = parsePersistedNotes({
      version: 1,
      notes: [
        rawNote({ id: "dup", text: "first" }),
        rawNote({ id: "dup", text: "second" }),
      ],
    });

    expect(notes).toHaveLength(1);
    expect(notes[0]?.text).toBe("first");
  });

  it("truncates overlong text and drops unknown fields", () => {
    const notes = parsePersistedNotes({
      version: 1,
      notes: [rawNote({ text: "x".repeat(MAX_NOTE_TEXT_LENGTH + 100), color: "red" })],
    });

    expect(notes[0]).toEqual({
      id: "note-1",
      rect: { x: 10, y: 20, width: 160, height: 120 },
      text: "x".repeat(MAX_NOTE_TEXT_LENGTH),
    });
  });

  it("round-trips notes through save and load", () => {
    const storage = fakeStorage();
    const notes: Note[] = [
      { id: "a", rect: { x: 1, y: 2, width: 160, height: 120 }, text: "hi" },
    ];

    saveNotes(storage, notes);

    expect(storage.getItem(STORAGE_KEY)).toBe(JSON.stringify({ version: 1, notes }));
    expect(loadNotes(storage)).toEqual(notes);
  });

  it("loads no notes from empty or broken storage", () => {
    expect(loadNotes(fakeStorage())).toEqual([]);
    expect(loadNotes(fakeStorage({ [STORAGE_KEY]: "{ broken" }))).toEqual([]);
  });

  it("tolerates storage read and write failures", () => {
    expect(loadNotes(throwingStorage)).toEqual([]);
    expect(() => saveNotes(throwingStorage, [])).not.toThrow();
  });
});
