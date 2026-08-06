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
  isPointerOverTrash,
  moveRect,
  resizeRect,
} from '../../domain/geometry';
import type {
  ActiveNotePreview,
  BoardBounds,
  BoardTool,
  ClientPoint,
  Gesture,
  NoteId,
  NoteRect,
  Size,
} from '../../domain/types';

export type GestureCancelReason =
  | 'pointer-cancelled'
  | 'capture-lost'
  | 'escape'
  | 'unmount';

export interface BoardGesturesParams {
  boardSurfaceRef: RefObject<HTMLDivElement | null>;
  trashRef: RefObject<HTMLDivElement | null>;
  tool: BoardTool;
  getNoteRect: (noteId: NoteId) => NoteRect | undefined;
  onInteractionStart: (noteId: NoteId) => void;
  onCommitRect: (noteId: NoteId, rect: NoteRect) => void;
  onCreateNote: (rect: NoteRect) => void;
  onRemoveNote: (noteId: NoteId) => void;
}

export interface BoardGesturesResult {
  onBoardPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onHeaderPointerDown: (
    noteId: NoteId,
    event: PointerEvent<HTMLDivElement>,
  ) => void;
  onResizePointerDown: (
    noteId: NoteId,
    event: PointerEvent<HTMLDivElement>,
  ) => void;
  onBoardPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onBoardPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  onBoardPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
  onBoardLostPointerCapture: (event: PointerEvent<HTMLDivElement>) => void;
  activeNotePreview: ActiveNotePreview | null;
  creationPreview: NoteRect | null;
  trashActive: boolean;
  gestureActive: boolean;
  cancelActiveGesture: (reason: GestureCancelReason) => void;
}

const IDLE_GESTURE: Gesture = { type: 'idle' };

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

function boundsToSize(bounds: BoardBounds): Size {
  return { width: bounds.width, height: bounds.height };
}

export function useBoardGestures(
  params: BoardGesturesParams,
): BoardGesturesResult {
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const gestureRef = useRef<Gesture>(IDLE_GESTURE);
  const captureTargetRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const [activeNotePreview, setActiveNotePreview] =
    useState<ActiveNotePreview | null>(null);
  const [creationPreview, setCreationPreview] = useState<NoteRect | null>(null);
  const [trashActive, setTrashActive] = useState(false);
  const [gestureActive, setGestureActive] = useState(false);

  const cancelPendingFrame = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const clearPreviewState = useCallback(() => {
    setActiveNotePreview(null);
    setCreationPreview(null);
    setTrashActive(false);
    setGestureActive(false);
  }, []);

  const releaseCaptureIfHeld = useCallback((pointerId: number) => {
    const target = captureTargetRef.current;
    if (target !== null && target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId);
    }
    captureTargetRef.current = null;
  }, []);

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
          setCreationPreview(null);
          return;
        }
        setCreationPreview(
          createRectFromDrag(
            gesture.pointerOrigin,
            gesture.latestPointer,
            boundsToSize(gesture.boardBounds),
          ),
        );
        return;
      }
      case 'moving': {
        const rect = moveRect(
          gesture.initialRect,
          gesture.pointerOrigin,
          gesture.latestPointer,
          boundsToSize(gesture.boardBounds),
        );
        setActiveNotePreview({ noteId: gesture.noteId, rect });
        setTrashActive(
          isPointerOverTrash(gesture.latestPointer, gesture.trashRect),
        );
        return;
      }
      case 'resizing': {
        const rect = resizeRect(
          gesture.initialRect,
          gesture.pointerOrigin,
          gesture.latestPointer,
          boundsToSize(gesture.boardBounds),
        );
        setActiveNotePreview({ noteId: gesture.noteId, rect });
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

      const releaseBoardPoint = clientPointToBoardPoint(
        releasePoint,
        gesture.boardBounds,
      );
      const active = gesture;
      gestureRef.current = IDLE_GESTURE;
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
                boundsToSize(active.boardBounds),
              ),
            );
          }
          break;
        }
        case 'moving': {
          if (isPointerOverTrash(releaseBoardPoint, active.trashRect)) break;
          const rect = moveRect(
            active.initialRect,
            active.pointerOrigin,
            releaseBoardPoint,
            boundsToSize(active.boardBounds),
          );
          paramsRef.current.onCommitRect(active.noteId, rect);
          break;
        }
        case 'resizing': {
          const rect = resizeRect(
            active.initialRect,
            active.pointerOrigin,
            releaseBoardPoint,
            boundsToSize(active.boardBounds),
          );
          paramsRef.current.onCommitRect(active.noteId, rect);
          break;
        }
      }

      clearPreviewState();
      releaseCaptureIfHeld(pointerId);
    },
    [cancelPendingFrame, clearPreviewState, releaseCaptureIfHeld],
  );

  const cancelActiveGesture = useCallback(
    (reason: GestureCancelReason) => {
      const gesture = gestureRef.current;
      const capturedPointerId =
        gesture.type === 'idle' ? null : gesture.pointerId;
      gestureRef.current = IDLE_GESTURE;
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
    [cancelPendingFrame, clearPreviewState, releaseCaptureIfHeld],
  );

  const onHeaderPointerDown = useCallback(
    (noteId: NoteId, event: PointerEvent<HTMLDivElement>) => {
      if (!isPrimaryLeftButton(event)) return;
      if (gestureRef.current.type !== 'idle') return;
      const boardSurface = paramsRef.current.boardSurfaceRef.current;
      if (boardSurface === null) return;
      const initialRect = paramsRef.current.getNoteRect(noteId);
      if (initialRect === undefined) return;

      event.stopPropagation();
      paramsRef.current.onInteractionStart(noteId);

      const boardBounds = readBoardBounds(boardSurface);
      const pointerOrigin = clientPointToBoardPoint(
        { clientX: event.clientX, clientY: event.clientY },
        boardBounds,
      );
      gestureRef.current = {
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
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      captureTargetRef.current = event.currentTarget;
      setGestureActive(true);
    },
    [],
  );

  const onResizePointerDown = useCallback(
    (noteId: NoteId, event: PointerEvent<HTMLDivElement>) => {
      if (!isPrimaryLeftButton(event)) return;
      if (gestureRef.current.type !== 'idle') return;
      const boardSurface = paramsRef.current.boardSurfaceRef.current;
      if (boardSurface === null) return;
      const initialRect = paramsRef.current.getNoteRect(noteId);
      if (initialRect === undefined) return;

      event.stopPropagation();
      paramsRef.current.onInteractionStart(noteId);

      const boardBounds = readBoardBounds(boardSurface);
      const pointerOrigin = clientPointToBoardPoint(
        { clientX: event.clientX, clientY: event.clientY },
        boardBounds,
      );
      gestureRef.current = {
        type: 'resizing',
        pointerId: event.pointerId,
        noteId,
        pointerOrigin,
        latestPointer: pointerOrigin,
        initialRect,
        boardBounds,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      captureTargetRef.current = event.currentTarget;
      setGestureActive(true);
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
      cancelActiveGesture('pointer-cancelled');
    },
    [cancelActiveGesture],
  );

  const onBoardLostPointerCapture = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const gesture = gestureRef.current;
      if (gesture.type === 'idle' || gesture.pointerId !== event.pointerId) {
        return;
      }
      cancelActiveGesture('capture-lost');
    },
    [cancelActiveGesture],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (gestureRef.current.type === 'idle') return;
      cancelActiveGesture('escape');
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
    activeNotePreview,
    creationPreview,
    trashActive,
    gestureActive,
    cancelActiveGesture,
  };
}
