import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from 'react';
import {
  clientPointToBoardPoint,
  createRectFromDrag,
  hasReachedCreateThreshold,
  isPointStrictlyInsideRectangle,
  moveRect,
  resizeRect,
} from '../../domain/geometry';
import type {
  ActiveNotePreview,
  BoardBounds,
  BoardPoint,
  BoardTool,
  ClientPoint,
  Gesture,
  NoteId,
  NoteRect,
} from '../../domain/types';

type CancelReason = 'cancel' | 'unmount';

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
  boardBounds: BoardBounds,
): NoteRect {
  if (trashElement === null) return { x: 0, y: 0, width: 0, height: 0 };
  const rect = trashElement.getBoundingClientRect();
  const topLeft = clientPointToBoardPoint(
    { clientX: rect.left, clientY: rect.top },
    boardBounds,
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
        setPreview({
          activeNote: { noteId: gesture.noteId, rect },
          creation: null,
          trashActive: isPointStrictlyInsideRectangle(
            gesture.latestPointer,
            gesture.trashRect,
          ),
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

      // Final geometry comes from the release event, not the preview, which can be a frame behind.
      const releaseBoardPoint = clientPointToBoardPoint(
        releasePoint,
        gesture.boardBounds,
      );
      const active = gesture;
      // Going idle before releasing capture makes the resulting lostpointercapture a no-op.
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
          if (isPointStrictlyInsideRectangle(releaseBoardPoint, active.trashRect)) {
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

  const cancelActiveGesture = useCallback(
    (reason: CancelReason) => {
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
    },
    [],
  );

  function beginNoteGesture(
    noteId: NoteId,
    event: PointerEvent<HTMLDivElement>,
    buildGesture: (start: {
      pointerOrigin: BoardPoint;
      initialRect: NoteRect;
      boardBounds: BoardBounds;
    }) => Gesture,
  ) {
    if (!isPrimaryLeftButton(event)) return;
    if (gestureRef.current.type !== 'idle') return;
    const boardSurface = paramsRef.current.boardSurfaceRef.current;
    if (boardSurface === null) return;
    const initialRect = paramsRef.current.getNoteRect(noteId);
    if (initialRect === undefined) return;

    event.stopPropagation();
    paramsRef.current.onInteractionStart(noteId);

    // Measured once here: the board cannot move mid-gesture, and layout reads per move would thrash.
    const boardBounds = readBoardBounds(boardSurface);
    const pointerOrigin = clientPointToBoardPoint(
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
      const pointerOrigin = clientPointToBoardPoint(
        { clientX: event.clientX, clientY: event.clientY },
        boardBounds,
      );
      const trashRect = readTrashRect(
        paramsRef.current.trashRef.current,
        boardBounds,
      );
      if (isPointStrictlyInsideRectangle(pointerOrigin, trashRect)) return;
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
      // Raw positions live in the ref so a fast pointer stream costs one React update per frame.
      gesture.latestPointer = clientPointToBoardPoint(
        { clientX: event.clientX, clientY: event.clientY },
        gesture.boardBounds,
      );
      scheduleFrame();
    },
    [scheduleFrame],
  );

  const onBoardPointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      commitActiveGesture(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY,
      });
    },
    [commitActiveGesture],
  );

  const onBoardPointerCancel = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const gesture = gestureRef.current;
      if (gesture.type === 'idle' || gesture.pointerId !== event.pointerId) {
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
