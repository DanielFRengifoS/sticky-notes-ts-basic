import { useCallback, useReducer, useRef, useState } from 'react';
import { notesReducer } from '../../domain/notesReducer';
import type { NoteId, NoteRect, NotesState } from '../../domain/types';
import { NoteCard } from './NoteCard';
import { useBoardGestures } from './useBoardGestures';
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

  const boardSurfaceRef = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);

  const notesRef = useRef(state.notes);
  notesRef.current = state.notes;

  const getNoteRect = useCallback(
    (noteId: NoteId): NoteRect | undefined =>
      notesRef.current.find((note) => note.id === noteId)?.rect,
    [],
  );

  const handleTextChange = useCallback((noteId: NoteId, text: string) => {
    dispatch({ type: 'noteTextChanged', noteId, text });
  }, []);

  const handleInteractionStart = useCallback((noteId: NoteId) => {
    setSelectedId(noteId);
    dispatch({ type: 'noteBroughtToFront', noteId });
  }, []);

  const handleCommitRect = useCallback((noteId: NoteId, rect: NoteRect) => {
    dispatch({ type: 'noteRectCommitted', noteId, rect });
  }, []);

  const handleCreateNote = useCallback((rect: NoteRect) => {
    const id = crypto.randomUUID();
    dispatch({ type: 'noteAdded', note: { id, rect, text: '' } });
    setSelectedId(id);
    setPendingFocusId(id);
  }, []);

  const handleRemoveNote = useCallback((noteId: NoteId) => {
    dispatch({ type: 'noteRemoved', noteId });
    setSelectedId((current) => (current === noteId ? null : current));
    setPendingFocusId((current) => (current === noteId ? null : current));
  }, []);

  const handleFocusRequestConsumed = useCallback((noteId: NoteId) => {
    setPendingFocusId((prev) => (prev === noteId ? null : prev));
  }, []);

  const {
    onBoardPointerDown,
    onHeaderPointerDown,
    onResizePointerDown,
    onBoardPointerMove,
    onBoardPointerUp,
    onBoardPointerCancel,
    onBoardLostPointerCapture,
    activeNotePreview,
    gestureActive,
  } = useBoardGestures({
    boardSurfaceRef,
    trashRef,
    tool: 'select',
    getNoteRect,
    onInteractionStart: handleInteractionStart,
    onCommitRect: handleCommitRect,
    onCreateNote: handleCreateNote,
    onRemoveNote: handleRemoveNote,
  });

  return (
    <div className="board">
      <div className="toolbar">
        <button type="button" className="toolbar__button" aria-pressed={false}>
          New note
        </button>
      </div>

      <div className="boardFrame">
        <div
          ref={boardSurfaceRef}
          className="boardSurface"
          data-gesture-active={gestureActive}
          onPointerDown={onBoardPointerDown}
          onPointerMove={onBoardPointerMove}
          onPointerUp={onBoardPointerUp}
          onPointerCancel={onBoardPointerCancel}
          onLostPointerCapture={onBoardLostPointerCapture}
        >
          {state.notes.length === 0 ? (
            <p className="emptyState">
              Select &ldquo;New note&rdquo;, then drag on the board to create a note.
            </p>
          ) : null}

          {state.notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              previewRect={
                activeNotePreview?.noteId === note.id
                  ? activeNotePreview.rect
                  : undefined
              }
              selected={selectedId === note.id}
              pendingFocus={pendingFocusId === note.id}
              onTextChange={handleTextChange}
              onHeaderPointerDown={onHeaderPointerDown}
              onResizePointerDown={onResizePointerDown}
              onFocusRequestConsumed={handleFocusRequestConsumed}
            />
          ))}

          <div className="trashZone" ref={trashRef} aria-hidden="true">
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
