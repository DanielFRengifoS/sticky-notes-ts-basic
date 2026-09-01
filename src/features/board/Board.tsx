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
import { clampRect } from '../../domain/geometry';
import { loadNotes, saveNotes } from '../../infrastructure/notesStorage';
import type {
  BoardPhase,
  BoardTool,
  NoteId,
  NoteRect,
  Size,
} from '../../domain/types';
import { NoteCard } from './NoteCard';
import { useBoardGestures } from './useBoardGestures';
import './Board.css';

export function Board() {
  const [state, dispatch] = useReducer(notesReducer, initialNotesState);
  const [phase, setPhase] = useState<BoardPhase>('measuring');
  const [selectedId, setSelectedId] = useState<NoteId | null>(null);
  const [focusNoteId, setFocusNoteId] = useState<NoteId | null>(null);
  const [tool, setTool] = useState<BoardTool>('select');

  const boardSurfaceRef = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);

  const hydratedRef = useRef(false);

  useLayoutEffect(() => {
    if (hydratedRef.current) return;
    const surface = boardSurfaceRef.current;
    if (surface === null) return;
    const rect = surface.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    hydratedRef.current = true;

    const boardSize: Size = { width: rect.width, height: rect.height };
    const stored = loadNotes(window.localStorage);
    console.log('[board] hydrating', stored.length, 'notes');
    // re-normalise the saved rects against the current board size
    const normalized = stored.map((note) => ({
      ...note,
      rect: clampRect(note.rect, boardSize),
    }));
    dispatch({ type: 'notesHydrated', notes: normalized });
    setPhase('ready');
  }, []);

  useEffect(() => {
    // don't save until we've hydrated. under StrictMode this effect runs twice
    // and the first (empty) pass would otherwise stomp the saved notes.
    if (phase !== 'ready') return;
    // stash on window so i can poke at notes from devtools. remove before ship.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__notes = state.notes;
    // debounce writes by ~250ms so a drag doesn't hammer localStorage
    const timer = window.setTimeout(() => {
      saveNotes(window.localStorage, state.notes);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [phase, state.notes]);

  const handleTextChange = useCallback((noteId: NoteId, text: string) => {
    dispatch({ type: 'noteTextChanged', noteId, text });
  }, []);

  const handleNoteInteraction = useCallback((noteId: NoteId) => {
    setSelectedId(noteId);
    dispatch({ type: 'noteBroughtToFront', noteId });
  }, []);

  function handleCommitRect(noteId: NoteId, rect: NoteRect) {
    dispatch({ type: 'noteRectCommitted', noteId, rect });
  }

  // not memoised - only the gesture hook uses this and it reads params off a ref
  function handleCreateNote(rect: NoteRect) {
    const id = crypto.randomUUID();
    dispatch({ type: 'noteAdded', note: { id, rect, text: '' } });
    setSelectedId(id);
    setFocusNoteId(id);
    setTool('select');
  }

  function handleToggleCreate() {
    setTool((current) => (current === 'create' ? 'select' : 'create'));
  }

  function handleDisarmCreateTool() {
    setTool('select');
  }

  const handleRemoveNote = useCallback((noteId: NoteId) => {
    dispatch({ type: 'noteRemoved', noteId });
    setSelectedId((current) => (current === noteId ? null : current));
    setFocusNoteId((current) => (current === noteId ? null : current));
  }, []);

  const handleNoteFocused = useCallback((noteId: NoteId) => {
    setFocusNoteId((prev) => (prev === noteId ? null : prev));
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
    getNoteRect: (id: NoteId) => state.notes.find((n) => n.id === id)?.rect,
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
          className="toolbarButton"
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
          {phase === 'ready' ? (
            <>
              {state.notes.length === 0 ? (
                <p className="emptyState">
                  Click "New note", then drag on the board to add one.
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
                  shouldFocus={focusNoteId === note.id}
                  onTextChange={handleTextChange}
                  onNoteInteraction={handleNoteInteraction}
                  onHeaderPointerDown={onHeaderPointerDown}
                  onResizePointerDown={onResizePointerDown}
                  onFocused={handleNoteFocused}
                />
              ))}
            </>
          ) : null}

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
            <span className="trashIcon" aria-hidden="true">
              🗑
            </span>
            <span className="trashLabel">
              {trashActive ? 'Release to delete' : 'Trash'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
