export type NoteId = string;

export interface ClientPoint {
  clientX: number;
  clientY: number;
}

export interface BoardPoint {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface NoteRect extends BoardPoint, Size {}

export interface BoardBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Note {
  id: NoteId;
  rect: NoteRect;
  text: string;
}

export interface NotesState {
  notes: Note[];
}

export type BoardPhase = "measuring" | "ready";
export type BoardTool = "select" | "create";

export interface BoardUiState {
  phase: BoardPhase;
  tool: BoardTool;
  selectedId: NoteId | null;
  pendingFocusId: NoteId | null;
}

export type Gesture =
  | { type: "idle" }
  | {
      type: "creating";
      pointerId: number;
      pointerOrigin: BoardPoint;
      latestPointer: BoardPoint;
      boardBounds: BoardBounds;
    }
  | {
      type: "moving";
      pointerId: number;
      noteId: NoteId;
      pointerOrigin: BoardPoint;
      latestPointer: BoardPoint;
      initialRect: NoteRect;
      boardBounds: BoardBounds;
      trashRect: NoteRect;
    }
  | {
      type: "resizing";
      pointerId: number;
      noteId: NoteId;
      pointerOrigin: BoardPoint;
      latestPointer: BoardPoint;
      initialRect: NoteRect;
      boardBounds: BoardBounds;
    };

export interface ActiveNotePreview {
  noteId: NoteId;
  rect: NoteRect;
}

export const MIN_NOTE_WIDTH = 160;
export const MIN_NOTE_HEIGHT = 120;
export const MIN_CREATE_DRAG_DISTANCE = 6;
export const MAX_NOTE_TEXT_LENGTH = 5000;
export const STORAGE_KEY = "sticky-notes-ts:document";
export const STORAGE_DEBOUNCE_MS = 300;
