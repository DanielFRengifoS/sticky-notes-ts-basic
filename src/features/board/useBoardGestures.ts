import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from 'react';
import {
  createRectFromDrag,
  hasReachedCreateThreshold,
  moveRect,
  pointInside,
  resizeRect,
  toBoardPoint,
} from '../../domain/geometry';
import type {
  BoardBounds,
  BoardPoint,
  BoardTool,
  ClientPoint,
  NoteId,
  NoteRect,
} from '../../domain/types';

type CancelReason = 'cancel' | 'unmount';

// The whole gesture lives in a ref rather than react state, so a fast pointer
// stream doesn't trigger a render on every move. One active at a time, and the
// pointerId is how we ignore events from a second finger/pointer.
type Gesture =
  | { type: 'idle' }
  | {
      type: 'creating';
      pointerId: number;
      pointerOrigin: BoardPoint;
      latestPointer: BoardPoint;
      boardBounds: BoardBounds;
    }
  | {
      type: 'moving';
      pointerId: number;
      noteId: NoteId;
      pointerOrigin: BoardPoint;
      latestPointer: BoardPoint;
      initialRect: NoteRect;
      boardBounds: BoardBounds;
      trashRect: NoteRect;
    }
  | {
      type: 'resizing';
      pointerId: number;
      noteId: NoteId;
      pointerOrigin: BoardPoint;
      latestPointer: BoardPoint;
      initialRect: NoteRect;
      boardBounds: BoardBounds;
    };

interface ActiveNotePreview {
  noteId: NoteId;
  rect: NoteRect;
}

interface PreviewFrame {
  activeNote: ActiveNotePreview | null;
  creation: NoteRect | null;
  trashActive: boolean;
}

const idlePreview: PreviewFrame = {
  activeNote: null,
  creation: null,
  trashActive: false,
};

export interface BoardGesturesParams {
  boardSurfaceRef: RefObject<HTMLDivElement | null>;
  trashRef: RefObject<HTMLDivElement | null>;
  tool: BoardTool;
  getNoteRect: (noteId: NoteId) => NoteRect | undefined;
  onInteractionStart: (noteId: NoteId) => void;
  onCommitRect: (noteId: NoteId, rect: NoteRect) => void;
  onCreateNote: (rect: NoteRect) => void;
  onRemoveNote: (noteId: NoteId) => void;
  onDisarmCreateTool: () => void;
}

function isPrimaryLeftButton(event: PointerEvent<HTMLDivElement>): boolean {
  return event.isPrimary && event.button === 0;
}

function readBoardBounds(element: HTMLElement): BoardBounds {
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

function readTrashRect(
  trashElement: HTMLElement | null,
  boundries: BoardBounds,
): NoteRect {
  // HACK: if the trash ref isn't mounted yet, hand back an empty rect. a
  // zero-size rect can't contain any point (pointInside is strict), so the hit
  // test just reads as "not over the trash". bit gross but it works.
  if (trashElement === null) return { x: 0, y: 0, width: 0, height: 0 };
  const rect = trashElement.getBoundingClientRect();
  const topLeft = toBoardPoint(
    { clientX: rect.left, clientY: rect.top },
    boundries,
  );
  return { x: topLeft.x, y: topLeft.y, width: rect.width, height: rect.height };
}

export function useBoardGestures(params: BoardGesturesParams) {
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const gestureRef = useRef<Gesture>({ type: 'idle' });
  const captureTargetRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const [preview, setPreview] = useState<PreviewFrame>(idlePreview);
  const [gestureActive, setGestureActive] = useState(false);

  function cancelPendingFrame() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function clearPreviewState() {
    setPreview(idlePreview);
    setGestureActive(false);
  }

  function releaseCaptureIfHeld(pointerId: number) {
    const target = captureTargetRef.current;
    if (target !== null && target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId);
    }
    captureTargetRef.current = null;
  }

  const runFrame = useCallback(() => {
    rafRef.current = null;
    const gesture = gestureRef.current;
    switch (gesture.type) {
      case 'idle':
        return;
      case 'creating': {
        if (
          !hasReachedCreateThreshold(
            gesture.pointerOrigin,
            gesture.latestPointer,
          )
        ) {
          setPreview(idlePreview);
          return;
        }
        setPreview({
          activeNote: null,
          creation: createRectFromDrag(
            gesture.pointerOrigin,
            gesture.latestPointer,
            gesture.boardBounds,
          ),
          trashActive: false,
        });
        return;
      }
      case 'moving': {
        const rect = moveRect(
          gesture.initialRect,
          gesture.pointerOrigin,
          gesture.latestPointer,
          gesture.boardBounds,
        );
        // console.log('move preview', rect, gesture.latestPointer);
        setPreview({
          activeNote: { noteId: gesture.noteId, rect },
          creation: null,
          trashActive: pointInside(gesture.latestPointer, gesture.trashRect),
        });
        return;
      }
      case 'resizing': {
        const rect = resizeRect(
          gesture.initialRect,
          gesture.pointerOrigin,
          gesture.latestPointer,
          gesture.boardBounds,
        );
        setPreview({
          activeNote: { noteId: gesture.noteId, rect },
          creation: null,
          trashActive: false,
        });
        return;
      }
    }
  }, []);

  const scheduleFrame = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(runFrame);
  }, [runFrame]);

  const commitActiveGesture = useCallback(
    (pointerId: number, releasePoint: ClientPoint) => {
      const gesture = gestureRef.current;
      if (gesture.type === 'idle') return;
      if (gesture.pointerId !== pointerId) return;

      // use the release coords here, not the last preview frame - rAF means the
      // preview can be a frame behind and we don't want to commit a stale rect.
      const releaseBoardPoint = toBoardPoint(releasePoint, gesture.boardBounds);
      const active = gesture;
      // go idle *before* we release capture, so the lostpointercapture that
      // fires next is a no-op. otherwise it would try to cancel the the gesture
      // we just committed.
      gestureRef.current = { type: 'idle' };
      cancelPendingFrame();

      switch (active.type) {
        case 'creating': {
          if (
            hasReachedCreateThreshold(active.pointerOrigin, releaseBoardPoint)
          ) {
            paramsRef.current.onCreateNote(
              createRectFromDrag(
                active.pointerOrigin,
                releaseBoardPoint,
                active.boardBounds,
              ),
            );
          }
          break;
        }
        case 'moving': {
          if (pointInside(releaseBoardPoint, active.trashRect)) {
            paramsRef.current.onRemoveNote(active.noteId);
            break;
          }
          const rect = moveRect(
            active.initialRect,
            active.pointerOrigin,
            releaseBoardPoint,
            active.boardBounds,
          );
          paramsRef.current.onCommitRect(active.noteId, rect);
          break;
        }
        case 'resizing': {
          const rect = resizeRect(
            active.initialRect,
            active.pointerOrigin,
            releaseBoardPoint,
            active.boardBounds,
          );
          paramsRef.current.onCommitRect(active.noteId, rect);
          break;
        }
      }

      clearPreviewState();
      releaseCaptureIfHeld(pointerId);
    },
    [],
  );

  const cancelActiveGesture = useCallback((reason: CancelReason) => {
    const gesture = gestureRef.current;
    const capturedPointerId =
      gesture.type === 'idle' ? null : gesture.pointerId;
    gestureRef.current = { type: 'idle' };
    cancelPendingFrame();

    if (reason === 'unmount') {
      captureTargetRef.current = null;
      return;
    }

    clearPreviewState();
    if (capturedPointerId !== null) {
      releaseCaptureIfHeld(capturedPointerId);
    } else {
      captureTargetRef.current = null;
    }
  }, []);

  function beginNoteGesture(
    noteId: NoteId,
    event: PointerEvent<HTMLDivElement>,
    buildGesture: (start: {
      pointerOrigin: BoardPoint;
      initialRect: NoteRect;
      boardBounds: BoardBounds;
    }) => Gesture,
  ) {
    // TODO: only handling mouse / primary pointer right now. haven't tested pen
    // or touch yet, and i think pointer capture behaves a little differently
    // there. revisit if we ever care about tablets.
    if (!isPrimaryLeftButton(event)) return;
    if (gestureRef.current.type !== 'idle') return;
    const boardSurface = paramsRef.current.boardSurfaceRef.current;
    if (boardSurface === null) return;
    const initialRect = paramsRef.current.getNoteRect(noteId);
    if (initialRect === undefined) return;

    event.stopPropagation();
    paramsRef.current.onInteractionStart(noteId);

    // grab the board rect once, up front. it can't move mid-gesture, and
    // reading layout on every pointermove would thrash.
    const boardBounds = readBoardBounds(boardSurface);
    const pointerOrigin = toBoardPoint(
      { clientX: event.clientX, clientY: event.clientY },
      boardBounds,
    );
    gestureRef.current = buildGesture({
      pointerOrigin,
      initialRect,
      boardBounds,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
    captureTargetRef.current = event.currentTarget;
    setGestureActive(true);
  }

  const onHeaderPointerDown = useCallback(
    (noteId: NoteId, event: PointerEvent<HTMLDivElement>) => {
      beginNoteGesture(
        noteId,
        event,
        ({ pointerOrigin, initialRect, boardBounds }) => ({
          type: 'moving',
          pointerId: event.pointerId,
          noteId,
          pointerOrigin,
          latestPointer: pointerOrigin,
          initialRect,
          boardBounds,
          trashRect: readTrashRect(
            paramsRef.current.trashRef.current,
            boardBounds,
          ),
        }),
      );
    },
    [],
  );

  const onResizePointerDown = useCallback(
    (noteId: NoteId, event: PointerEvent<HTMLDivElement>) => {
      beginNoteGesture(
        noteId,
        event,
        ({ pointerOrigin, initialRect, boardBounds }) => ({
          type: 'resizing',
          pointerId: event.pointerId,
          noteId,
          pointerOrigin,
          latestPointer: pointerOrigin,
          initialRect,
          boardBounds,
        }),
      );
    },
    [],
  );

  const onBoardPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (paramsRef.current.tool !== 'create') return;
      if (!isPrimaryLeftButton(event)) return;
      if (gestureRef.current.type !== 'idle') return;
      if (event.target !== event.currentTarget) return;
      const boardSurface = paramsRef.current.boardSurfaceRef.current;
      if (boardSurface === null) return;

      const boardBounds = readBoardBounds(boardSurface);
      const pointerOrigin = toBoardPoint(
        { clientX: event.clientX, clientY: event.clientY },
        boardBounds,
      );
      const trashRect = readTrashRect(
        paramsRef.current.trashRef.current,
        boardBounds,
      );
      if (pointInside(pointerOrigin, trashRect)) return;
      gestureRef.current = {
        type: 'creating',
        pointerId: event.pointerId,
        pointerOrigin,
        latestPointer: pointerOrigin,
        boardBounds,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      captureTargetRef.current = event.currentTarget;
      setGestureActive(true);
    },
    [],
  );

  const onBoardPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const gesture = gestureRef.current;
      if (gesture.type === 'idle') return;
      if (event.pointerId !== gesture.pointerId) return;
      // stash the raw point on the ref and let rAF actually render it. keeps a
      // fast pointer stream to ~one react update per frame instead of per event.
      gesture.latestPointer = toBoardPoint(
        { clientX: event.clientX, clientY: event.clientY },
        gesture.boardBounds,
      );
      scheduleFrame();
    },
    [scheduleFrame],
  );

  const onBoardPointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      commitActiveGesture(e.pointerId, {
        clientX: e.clientX,
        clientY: e.clientY,
      });
    },
    [commitActiveGesture],
  );

  const onBoardPointerCancel = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const gesture = gestureRef.current;
      if (gesture.type === 'idle' || gesture.pointerId !== e.pointerId) {
        return;
      }
      cancelActiveGesture('cancel');
    },
    [cancelActiveGesture],
  );

  const onBoardLostPointerCapture = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const gesture = gestureRef.current;
      if (gesture.type === 'idle' || gesture.pointerId !== event.pointerId) {
        return;
      }
      cancelActiveGesture('cancel');
    },
    [cancelActiveGesture],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (gestureRef.current.type !== 'idle') {
        cancelActiveGesture('cancel');
      }
      if (paramsRef.current.tool === 'create') {
        paramsRef.current.onDisarmCreateTool();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelActiveGesture]);

  useEffect(() => {
    return () => {
      cancelActiveGesture('unmount');
    };
  }, [cancelActiveGesture]);

  return {
    onBoardPointerDown,
    onHeaderPointerDown,
    onResizePointerDown,
    onBoardPointerMove,
    onBoardPointerUp,
    onBoardPointerCancel,
    onBoardLostPointerCapture,
    activeNotePreview: preview.activeNote,
    creationPreview: preview.creation,
    trashActive: preview.trashActive,
    gestureActive,
  };
}
