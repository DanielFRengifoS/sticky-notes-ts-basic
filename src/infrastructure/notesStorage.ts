import type { BoardPhase, Note, NoteId, NoteRect } from "../domain/types";
import { MAX_NOTE_TEXT_LENGTH, STORAGE_KEY } from "../domain/types";

interface PersistedNotesV1 {
  version: 1;
  notes: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidRect(value: unknown): value is NoteRect {
  return (
    isRecord(value) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isFiniteNumber(value.width) &&
    isFiniteNumber(value.height) &&
    value.width > 0 &&
    value.height > 0
  );
}

function parseNote(value: unknown): Note | null {
  if (!isRecord(value)) return null;

  const { id, rect, text } = value;
  if (typeof id !== "string" || id.length === 0) return null;
  if (!isValidRect(rect)) return null;
  if (typeof text !== "string") return null;

  const boundedText =
    text.length > MAX_NOTE_TEXT_LENGTH
      ? text.slice(0, MAX_NOTE_TEXT_LENGTH)
      : text;

  return {
    id,
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    text: boundedText,
  };
}

export function parseStoredJson(raw: string | null): unknown {
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function parsePersistedNotes(value: unknown): Note[] {
  if (!isRecord(value)) return [];
  if (value.version !== 1) return [];
  if (!Array.isArray(value.notes)) return [];

  const notes: Note[] = [];
  const seenIds = new Set<NoteId>();
  for (const entry of value.notes) {
    const note = parseNote(entry);
    if (note === null) continue;
    if (seenIds.has(note.id)) continue;
    seenIds.add(note.id);
    notes.push(note);
  }
  return notes;
}

export function loadNotes(storage: Storage): Note[] {
  try {
    return parsePersistedNotes(parseStoredJson(storage.getItem(STORAGE_KEY)));
  } catch {
    return [];
  }
}

export function saveNotes(storage: Storage, notes: Note[]): void {
  try {
    const payload: PersistedNotesV1 = { version: 1, notes };
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore write failures to keep the app operational.
  }
}

export function shouldPersist(phase: BoardPhase): boolean {
  return phase === "ready";
}
