import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type PointerEvent,
} from 'react';
import { initialNotesState, notesReducer } from '../../domain/notesReducer';
import { normalizeRectToBoard } from '../../domain/geometry';
import { loadNotes, saveNotes, shouldPersist } from '../../infrastructure/notesStorage';
import type { BoardPhase, BoardTool, NoteId, NoteRect, Size } from '../../domain/types';
import { STORAGE_DEBOUNCE_MS } from '../../domain/types';
import { NoteCard } from './NoteCard';
import { useBoardGestures } from './useBoardGestures';
import './Board.css';

export function Board() {
  const [state, dispatch] = useReducer(notesReducer, initialNotesState);
  const [phase, setPhase] = useState<BoardPhase>('measuring');
  const [selectedId, setSelectedId] = useState<NoteId | null>(null);
  const [pendingFocusId, setPendingFocusId] = useState<NoteId | null>(null);
  const [tool, setTool] = useState<BoardTool>('select');

  const boardSurfaceRef = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);

  const hydratedRef = useRef(false);

  const notesRef = useRef(state.notes);
  notesRef.current = state.notes;

  useLayoutEffect(() => {
    if (hydratedRef.current) return;
    const surface = boardSurfaceRef.current;
    if (surface === null) return;
    const rect = surface.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    hydratedRef.current = true;

    const boardSize: Size = { width: rect.width, height: rect.height };
    const stored = loadNotes(window.localStorage);
    const normalized = stored.map((note) => ({
      ...note,
      rect: normalizeRectToBoard(note.rect, boardSize),
    }));
    dispatch({ type: 'notesHydrated', notes: normalized });
    setPhase('ready');
  }, []);

  useEffect(() => {
    if (!shouldPersist(phase)) return;
    const timer = window.setTimeout(() => {
      saveNotes(window.localStorage, state.notes);
    }, STORAGE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [phase, state.notes]);

  const getNoteRect = useCallback(
    (noteId: NoteId): NoteRect | undefined =>
      notesRef.current.find((note) => note.id === noteId)?.rect,
    [],
  );

  const handleTextChange = useCallback((noteId: NoteId, text: string) => {
    dispatch({ type: 'noteTextChanged', noteId, text });
  }, []);

  const handleNoteInteraction = useCallback((noteId: NoteId) => {
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
    setTool('select');
  }, []);

  const handleToggleCreate = useCallback(() => {
    setTool((current) => (current === 'create' ? 'select' : 'create'));
  }, []);

  const handleDisarmCreateTool = useCallback(() => {
    setTool('select');
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
    creationPreview,
    trashActive,
    gestureActive,
  } = useBoardGestures({
    boardSurfaceRef,
    trashRef,
    tool,
    getNoteRect,
    onInteractionStart: handleNoteInteraction,
    onCommitRect: handleCommitRect,
    onCreateNote: handleCreateNote,
    onRemoveNote: handleRemoveNote,
    onDisarmCreateTool: handleDisarmCreateTool,
  });

  const handleSurfacePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (phase !== 'ready') return;
      onBoardPointerDown(event);
      if (
        tool === 'select' &&
        event.target === event.currentTarget &&
        event.isPrimary &&
        event.button === 0
      ) {
        setSelectedId(null);
      }
    },
    [onBoardPointerDown, phase, tool],
  );

  return (
    <div className="board">
      <div className="toolbar">
        <button
          type="button"
          className="toolbar__button"
          aria-pressed={tool === 'create'}
          onClick={handleToggleCreate}
        >
          {tool === 'create' ? 'Drag on the board to create' : 'New note'}
        </button>
      </div>

      <div className="boardFrame">
        <div
          ref={boardSurfaceRef}
          className="boardSurface"
          data-gesture-active={gestureActive}
          data-tool={tool}
          onPointerDown={handleSurfacePointerDown}
          onPointerMove={onBoardPointerMove}
          onPointerUp={onBoardPointerUp}
          onPointerCancel={onBoardPointerCancel}
          onLostPointerCapture={onBoardLostPointerCapture}
        >
          {phase === 'ready' && state.notes.length === 0 ? (
            <p className="emptyState">
              Select &ldquo;New note&rdquo;, then drag on the board to create a note.
            </p>
          ) : null}

          {phase === 'ready'
            ? state.notes.map((note) => (
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
                  onNoteInteraction={handleNoteInteraction}
                  onHeaderPointerDown={onHeaderPointerDown}
                  onResizePointerDown={onResizePointerDown}
                  onFocusRequestConsumed={handleFocusRequestConsumed}
                />
              ))
            : null}

          {creationPreview ? (
            <div
              className="creationPreview"
              aria-hidden="true"
              style={{
                left: creationPreview.x,
                top: creationPreview.y,
                width: creationPreview.width,
                height: creationPreview.height,
              }}
            />
          ) : null}

          <div className="trashZone" ref={trashRef} data-active={trashActive}>
            <span className="trashZone__icon" aria-hidden="true">
              🗑
            </span>
            <span className="trashZone__label">
              {trashActive ? 'Release to delete' : 'Trash'}
            </span>
            <span className="trashZone__hint">
              Release while the cursor is over the trash.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
