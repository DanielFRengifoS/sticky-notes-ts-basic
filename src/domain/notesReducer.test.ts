import { describe, expect, it } from 'vitest';

import { initialNotesState, notesReducer } from './notesReducer';
import type { Note, NoteRect, NotesState } from './types';
import { MAX_NOTE_TEXT_LENGTH } from './types';

function makeNote(
  id: string,
  text = '',
  rect: NoteRect = { x: 0, y: 0, width: 160, height: 120 },
): Note {
  return { id, rect, text };
}

function twoNotes(): NotesState {
  return { notes: [makeNote('a'), makeNote('b', 'keep')] };
}

describe('notesReducer', () => {
  it('ignores a rect commit for a note that is gone', () => {
    const state = twoNotes();
    expect(
      notesReducer(state, {
        type: 'noteRectCommitted',
        noteId: 'missing',
        rect: { x: 10, y: 20, width: 200, height: 150 },
      }),
    ).toBe(state);
  });

  it('ignores bringing the frontmost note to the front', () => {
    const state = twoNotes();
    expect(
      notesReducer(state, { type: 'noteBroughtToFront', noteId: 'b' }),
    ).toBe(state);
  });

  it('ignores a text change for a note that is gone', () => {
    const state = twoNotes();
    expect(
      notesReducer(state, {
        type: 'noteTextChanged',
        noteId: 'missing',
        text: 'x',
      }),
    ).toBe(state);
  });

  it('ignores a text change that matches the current text', () => {
    const state = twoNotes();
    expect(
      notesReducer(state, {
        type: 'noteTextChanged',
        noteId: 'b',
        text: 'keep',
      }),
    ).toBe(state);
  });

  it('replaces only the committed note and keeps the other reference', () => {
    const a = makeNote('a', 'old');
    const b = makeNote('b', 'keep');
    const state: NotesState = { notes: [a, b] };

    const next = notesReducer(state, {
      type: 'noteRectCommitted',
      noteId: 'a',
      rect: { x: 10, y: 20, width: 200, height: 150 },
    });

    expect(next).not.toBe(state);
    expect(next.notes[0]).not.toBe(a);
    expect(next.notes[0]?.rect).toEqual({
      x: 10,
      y: 20,
      width: 200,
      height: 150,
    });
    expect(next.notes[1]).toBe(b);
  });

  it('truncates text at the maximum length', () => {
    const state: NotesState = { notes: [makeNote('a')] };

    const next = notesReducer(state, {
      type: 'noteTextChanged',
      noteId: 'a',
      text: 'x'.repeat(MAX_NOTE_TEXT_LENGTH + 10),
    });

    expect(next.notes[0]?.text).toHaveLength(MAX_NOTE_TEXT_LENGTH);
  });

  // pretty much the same as the test above, wrote it while poking at the cap
  it('caps note text length', () => {
    const state: NotesState = { notes: [makeNote('a')] };
    const next = notesReducer(state, {
      type: 'noteTextChanged',
      noteId: 'a',
      text: 'y'.repeat(MAX_NOTE_TEXT_LENGTH + 1),
    });
    expect(next.notes[0]?.text.length).toBe(MAX_NOTE_TEXT_LENGTH);
  });

  it('hydrates, adds, reorders, and removes while preserving unaffected references', () => {
    const a = makeNote('a');
    const b = makeNote('b');
    const c = makeNote('c');

    const hydrated = notesReducer(initialNotesState, {
      type: 'notesHydrated',
      notes: [a, b],
    });
    expect(hydrated.notes).toEqual([a, b]);

    const added = notesReducer(hydrated, { type: 'noteAdded', note: c });
    expect(added.notes.map((note) => note.id)).toEqual(['a', 'b', 'c']);

    const fronted = notesReducer(added, {
      type: 'noteBroughtToFront',
      noteId: 'a',
    });
    expect(fronted.notes.map((note) => note.id)).toEqual(['b', 'c', 'a']);
    expect(fronted.notes[0]).toBe(b);

    const removed = notesReducer(fronted, { type: 'noteRemoved', noteId: 'c' });
    expect(removed.notes.map((note) => note.id)).toEqual(['b', 'a']);
  });
});
