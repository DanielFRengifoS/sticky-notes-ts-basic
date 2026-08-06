import { describe, expect, it } from "vitest";

import {
  loadNotes,
  parsePersistedNotes,
  parseStoredJson,
  saveNotes,
  shouldPersist,
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

describe("notesStorage", () => {
  it.each<[string, unknown]>([
    ["non-object root", null],
    ["primitive root", 42],
    ["missing version", { notes: [] }],
    ["unsupported version", { version: 2, notes: [] }],
    ["non-array notes collection", { version: 1, notes: "nope" }],
  ])("parsePersistedNotes returns [] for a %s", (_label, input) => {
    expect(parsePersistedNotes(input)).toEqual([]);
  });

  it("skips malformed entries while keeping valid siblings, dedupes ids, and truncates text", () => {
    const mixed = parsePersistedNotes({
      version: 1,
      notes: [
        validRawNote({ id: "" }),
        validRawNote({ id: 7 }),
        validRawNote({ rect: undefined }),
        validRawNote({ rect: { x: 0, y: 0, width: 0, height: 120 } }),
        validRawNote({ text: 123 }),
        "garbage",
        null,
        validRawNote(),
      ],
    });
    expect(mixed).toEqual([hydratedNote]);

    const deduped = parsePersistedNotes({
      version: 1,
      notes: [
        validRawNote({ id: "dup", text: "first" }),
        validRawNote({ id: "dup", text: "second" }),
      ],
    });
    expect(deduped).toHaveLength(1);
    expect(deduped[0]?.text).toBe("first");

    const bounded = parsePersistedNotes({
      version: 1,
      notes: [
        validRawNote({
          text: "x".repeat(MAX_NOTE_TEXT_LENGTH + 100),
          malicious: "<script>",
        }),
      ],
    });
    expect(bounded[0]?.text).toHaveLength(MAX_NOTE_TEXT_LENGTH);
    expect(bounded[0]).not.toHaveProperty("malicious");
  });

  it("tolerates invalid JSON and storage failures and round-trips valid notes", () => {
    expect(parseStoredJson(null)).toBeNull();
    expect(parseStoredJson("{ not json")).toBeNull();

    expect(loadNotes(createMemoryStorage())).toEqual([]);
    expect(loadNotes(createMemoryStorage({ [STORAGE_KEY]: "{ broken" }))).toEqual([]);
    expect(loadNotes(throwingStorage)).toEqual([]);
    expect(() => saveNotes(throwingStorage, [])).not.toThrow();

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

  it("does not write before hydration reaches ready", () => {
    expect(shouldPersist("measuring")).toBe(false);
    expect(shouldPersist("ready")).toBe(true);
  });
});
