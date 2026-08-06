import { useCallback, useReducer, useState } from 'react';
import { notesReducer } from '../../domain/notesReducer';
import type { ActiveNotePreview, NoteId, NotesState } from '../../domain/types';
import { NoteCard } from './NoteCard';
import './Board.css';

const DEV_INITIAL_STATE: NotesState = {
  notes: [
    { id: 'dev-note-1', rect: { x: 80, y: 80, width: 220, height: 160 }, text: 'First note' },
    {
      id: 'dev-note-2',
      rect: { x: 360, y: 200, width: 220, height: 160 },
      text: 'Second note (frontmost)',
    },
  ],
};

export function Board() {
  const [state, dispatch] = useReducer(notesReducer, DEV_INITIAL_STATE);
  const [selectedId, setSelectedId] = useState<NoteId | null>(null);
  const [pendingFocusId, setPendingFocusId] = useState<NoteId | null>(null);
  const [preview] = useState<ActiveNotePreview | null>(null);

  const handleTextChange = useCallback((noteId: NoteId, text: string) => {
    dispatch({ type: 'noteTextChanged', noteId, text });
  }, []);

  const handleHeaderPointerDown = useCallback((noteId: NoteId) => {
    setSelectedId(noteId);
    dispatch({ type: 'noteBroughtToFront', noteId });
  }, []);

  const handleResizePointerDown = useCallback((noteId: NoteId) => {
    setSelectedId(noteId);
    dispatch({ type: 'noteBroughtToFront', noteId });
  }, []);

  const handleFocusRequestConsumed = useCallback((noteId: NoteId) => {
    setPendingFocusId((prev) => (prev === noteId ? null : prev));
  }, []);

  return (
    <div className="board">
      <div className="toolbar">
        <button type="button" className="toolbar__button" aria-pressed={false}>
          New note
        </button>
      </div>

      <div className="boardFrame">
        <div className="boardSurface">
          {state.notes.length === 0 ? (
            <p className="emptyState">
              Select &ldquo;New note&rdquo;, then drag on the board to create a note.
            </p>
          ) : null}

          {state.notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              previewRect={preview?.noteId === note.id ? preview.rect : undefined}
              selected={selectedId === note.id}
              pendingFocus={pendingFocusId === note.id}
              onTextChange={handleTextChange}
              onHeaderPointerDown={handleHeaderPointerDown}
              onResizePointerDown={handleResizePointerDown}
              onFocusRequestConsumed={handleFocusRequestConsumed}
            />
          ))}

          <div className="trashZone" aria-hidden="true">
            <span className="trashZone__icon" aria-hidden="true">
              🗑
            </span>
            <span className="trashZone__label">Trash</span>
          </div>
        </div>
      </div>
    </div>
  );
}
