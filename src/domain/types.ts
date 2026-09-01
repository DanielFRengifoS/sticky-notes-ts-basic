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
  // color?: string; // maybe let people pick a colour per note one day
}

export interface NotesState {
  notes: Note[];
}

export type BoardPhase = 'measuring' | 'ready';
export type BoardTool = 'select' | 'create';

export const MIN_NOTE_WIDTH = 160;
export const MIN_NOTE_HEIGHT = 120;
export const MAX_NOTE_TEXT_LENGTH = 5000;
export const STORAGE_KEY = 'sticky-notes-ts:document';
