import type { Note, NoteId, NoteRect, NotesState } from "./types";
import { MAX_NOTE_TEXT_LENGTH } from "./types";

export type NotesAction =
  | { type: "notesHydrated"; notes: Note[] }
  | { type: "noteAdded"; note: Note }
  | { type: "noteRectCommitted"; noteId: NoteId; rect: NoteRect }
  | { type: "noteTextChanged"; noteId: NoteId; text: string }
  | { type: "noteBroughtToFront"; noteId: NoteId }
  | { type: "noteRemoved"; noteId: NoteId }
  | { type: "noteRestored"; note: Note; index: number };

export const initialNotesState: NotesState = { notes: [] };

function rectsEqual(a: NoteRect, b: NoteRect): boolean {
  return (
    a === b ||
    (a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height)
  );
}

export function notesReducer(
  state: NotesState,
  action: NotesAction,
): NotesState {
  switch (action.type) {
    case "notesHydrated":
      return { notes: action.notes };

    case "noteAdded":
      return { notes: [...state.notes, action.note] };

    case "noteRectCommitted": {
      const target = state.notes.find((note) => note.id === action.noteId);
      if (target === undefined) return state;
      if (rectsEqual(target.rect, action.rect)) return state;
      return {
        notes: state.notes.map((note) =>
          note.id === action.noteId ? { ...note, rect: action.rect } : note,
        ),
      };
    }

    case "noteTextChanged": {
      const target = state.notes.find((note) => note.id === action.noteId);
      if (target === undefined) return state;
      const nextText =
        action.text.length > MAX_NOTE_TEXT_LENGTH
          ? action.text.slice(0, MAX_NOTE_TEXT_LENGTH)
          : action.text;
      if (target.text === nextText) return state;
      return {
        notes: state.notes.map((note) =>
          note.id === action.noteId ? { ...note, text: nextText } : note,
        ),
      };
    }

    case "noteBroughtToFront": {
      const index = state.notes.findIndex((note) => note.id === action.noteId);
      if (index === -1 || index === state.notes.length - 1) return state;
      const target = state.notes[index];
      if (target === undefined) return state;
      return {
        notes: [
          ...state.notes.slice(0, index),
          ...state.notes.slice(index + 1),
          target,
        ],
      };
    }

    case "noteRemoved": {
      if (!state.notes.some((note) => note.id === action.noteId)) return state;
      return { notes: state.notes.filter((note) => note.id !== action.noteId) };
    }

    case "noteRestored": {
      if (state.notes.some((note) => note.id === action.note.id)) return state;
      const index = Math.max(0, Math.min(action.index, state.notes.length));
      const notes = state.notes.slice();
      notes.splice(index, 0, action.note);
      return { notes };
    }

    default:
      return action satisfies never;
  }
}
