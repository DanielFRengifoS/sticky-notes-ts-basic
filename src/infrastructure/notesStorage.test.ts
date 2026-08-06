import { describe, expect, it } from "vitest";

import {
  loadNotes,
  parsePersistedNotes,
  parseStoredJson,
  saveNotes,
} from "./notesStorage";
import type { Note } from "../domain/types";
import { MAX_NOTE_TEXT_LENGTH, STORAGE_KEY } from "../domain/types";

function validRawNote(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: "note-1",
    rect: { x: 10, y: 20, width: 160, height: 120 },
    text: "hello",
    ...overrides,
  };
}

const hydratedNote: Note = {
  id: "note-1",
  rect: { x: 10, y: 20, width: 160, height: 120 },
  text: "hello",
};

function createMemoryStorage(seed: Record<string, string> = {}): Storage {
  const map = new Map<string, string>(Object.entries(seed));
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

const throwingStorage: Storage = {
  get length(): number {
    throw new Error("storage unavailable");
  },
  clear() {
    throw new Error("storage unavailable");
  },
  getItem() {
    throw new Error("storage unavailable");
  },
  key() {
    throw new Error("storage unavailable");
  },
  removeItem() {
    throw new Error("storage unavailable");
  },
  setItem() {
    throw new Error("storage unavailable");
  },
};

describe("parseStoredJson", () => {
  it("returns null for null input", () => {
    expect(parseStoredJson(null)).toBeNull();
  });

  it("returns null for malformed JSON without throwing", () => {
    expect(parseStoredJson("{ not json")).toBeNull();
  });

  it("passes through valid JSON as unknown", () => {
    expect(parseStoredJson('{"version":1,"notes":[]}')).toEqual({
      version: 1,
      notes: [],
    });
  });
});

describe("parsePersistedNotes", () => {
  it.each<[string, unknown]>([
    ["non-object root", null],
    ["primitive root", 42],
    ["missing version", { notes: [] }],
    ["unsupported version", { version: 2, notes: [] }],
    ["non-array notes collection", { version: 1, notes: "nope" }],
  ])("returns [] for %s", (_label, input) => {
    expect(parsePersistedNotes(input)).toEqual([]);
  });

  it.each<[string, unknown]>([
    ["empty id", validRawNote({ id: "" })],
    ["non-string id", validRawNote({ id: 7 })],
    ["missing rect", validRawNote({ rect: undefined })],
    [
      "non-finite dimension",
      validRawNote({ rect: { x: 0, y: 0, width: Infinity, height: 120 } }),
    ],
    ["zero width", validRawNote({ rect: { x: 0, y: 0, width: 0, height: 120 } })],
    [
      "negative height",
      validRawNote({ rect: { x: 0, y: 0, width: 160, height: -5 } }),
    ],
    ["non-string text", validRawNote({ text: 123 })],
    ["null entry", null],
  ])("skips a note with %s", (_label, badNote) => {
    expect(parsePersistedNotes({ version: 1, notes: [badNote] })).toEqual([]);
  });

  it("keeps valid siblings when some notes are malformed", () => {
    const result = parsePersistedNotes({
      version: 1,
      notes: [{ id: "" }, validRawNote(), "garbage", null],
    });
    expect(result).toEqual([hydratedNote]);
  });

  it("keeps only the first note for a duplicate id", () => {
    const first = validRawNote({ id: "dup", text: "first" });
    const second = validRawNote({ id: "dup", text: "second" });
    const result = parsePersistedNotes({ version: 1, notes: [first, second] });
    expect(result).toHaveLength(1);
    expect(result[0]?.text).toBe("first");
  });

  it("truncates text longer than MAX_NOTE_TEXT_LENGTH", () => {
    const text = "x".repeat(MAX_NOTE_TEXT_LENGTH + 100);
    const result = parsePersistedNotes({
      version: 1,
      notes: [validRawNote({ text })],
    });
    expect(result[0]?.text).toHaveLength(MAX_NOTE_TEXT_LENGTH);
  });

  it("hydrates only id, rect, and text", () => {
    const result = parsePersistedNotes({
      version: 1,
      notes: [validRawNote({ malicious: "<script>", extra: 1 })],
    });
    expect(result[0]).toEqual(hydratedNote);
  });
});

describe("loadNotes / saveNotes", () => {
  it("returns [] when the key is absent", () => {
    expect(loadNotes(createMemoryStorage())).toEqual([]);
  });

  it("returns [] for stored invalid JSON", () => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: "{ broken" });
    expect(loadNotes(storage)).toEqual([]);
  });

  it("serializes under the versioned payload and round-trips", () => {
    const storage = createMemoryStorage();
    const notes: Note[] = [
      { id: "a", rect: { x: 1, y: 2, width: 160, height: 120 }, text: "hi" },
    ];
    saveNotes(storage, notes);
    expect(storage.getItem(STORAGE_KEY)).toBe(
      JSON.stringify({ version: 1, notes }),
    );
    expect(loadNotes(storage)).toEqual(notes);
  });

  it("returns [] when getItem throws", () => {
    expect(loadNotes(throwingStorage)).toEqual([]);
  });

  it("does not throw when setItem throws", () => {
    expect(() => saveNotes(throwingStorage, [])).not.toThrow();
  });
});
