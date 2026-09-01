import type {
  BoardBounds,
  BoardPoint,
  ClientPoint,
  NoteRect,
  Size,
} from './types';
import { MIN_NOTE_HEIGHT, MIN_NOTE_WIDTH } from './types';

// smallest drag, in px, that we treat as "make a note" instead of a stray click
const MIN_CREATE_DRAG_DISTANCE = 6;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// floor the board so we never hand back a rect that pokes a fraction of a
// pixel past the edge.
function availableSize(boardSize: Size): Size {
  return {
    width: Math.max(0, Math.floor(boardSize.width)),
    height: Math.max(0, Math.floor(boardSize.height)),
  };
}

export function toBoardPoint(
  point: ClientPoint,
  bounds: BoardBounds,
): BoardPoint {
  return {
    x: point.clientX - bounds.left,
    y: point.clientY - bounds.top,
  };
}

export function hasReachedCreateThreshold(
  origin: BoardPoint,
  current: BoardPoint,
): boolean {
  const dx = current.x - origin.x;
  const dy = current.y - origin.y;
  return Math.hypot(dx, dy) >= MIN_CREATE_DRAG_DISTANCE;
}

// keep a rect inside the board and no smaller than the min size, rounded to
// whole pixels. everything that commits geometry goes through here.
export function clampRect(rect: NoteRect, boardSize: Size): NoteRect {
  const { width: availableWidth, height: availableHeight } =
    availableSize(boardSize);
  const minWidth = Math.min(MIN_NOTE_WIDTH, availableWidth);
  const minHeight = Math.min(MIN_NOTE_HEIGHT, availableHeight);
  const width = clamp(Math.round(rect.width), minWidth, availableWidth);
  const height = clamp(Math.round(rect.height), minHeight, availableHeight);
  const x = clamp(Math.round(rect.x), 0, availableWidth - width);
  const y = clamp(Math.round(rect.y), 0, availableHeight - height);
  return { x, y, width, height };
}

export function createRectFromDrag(
  origin: BoardPoint,
  current: BoardPoint,
  boardSize: Size,
): NoteRect {
  const minWidth = Math.min(MIN_NOTE_WIDTH, boardSize.width);
  const minHeight = Math.min(MIN_NOTE_HEIGHT, boardSize.height);
  const width = Math.max(Math.abs(current.x - origin.x), minWidth);
  const height = Math.max(Math.abs(current.y - origin.y), minHeight);
  // anchor at the origin, but flip the corner when the drag goes up or left
  const x = current.x >= origin.x ? origin.x : origin.x - width;
  const y = current.y >= origin.y ? origin.y : origin.y - height;
  return clampRect({ x, y, width, height }, boardSize);
}

export function moveRect(
  initialRect: NoteRect,
  pointerOrigin: BoardPoint,
  currentPointer: BoardPoint,
  boardSize: Size,
): NoteRect {
  const dx = currentPointer.x - pointerOrigin.x;
  const dy = currentPointer.y - pointerOrigin.y;
  return clampRect(
    {
      x: initialRect.x + dx,
      y: initialRect.y + dy,
      width: initialRect.width,
      height: initialRect.height,
    },
    boardSize,
  );
}

export function resizeRect(
  initialRect: NoteRect,
  pointerOrigin: BoardPoint,
  currentPointer: BoardPoint,
  boardSize: Size,
): NoteRect {
  const { width: availableWidth, height: availableHeight } =
    availableSize(boardSize);
  // the top-left corner stays put while resizing, so only w/h actually change
  const x = clamp(Math.round(initialRect.x), 0, availableWidth);
  const y = clamp(Math.round(initialRect.y), 0, availableHeight);
  const maxWidth = availableWidth - x;
  const maxHeight = availableHeight - y;
  const minWidth = Math.min(MIN_NOTE_WIDTH, maxWidth);
  const minHeight = Math.min(MIN_NOTE_HEIGHT, maxHeight);
  const dx = currentPointer.x - pointerOrigin.x;
  const dy = currentPointer.y - pointerOrigin.y;
  const width = clamp(Math.round(initialRect.width + dx), minWidth, maxWidth);
  const height = clamp(
    Math.round(initialRect.height + dy),
    minHeight,
    maxHeight,
  );
  return { x, y, width, height };
}

// strict on purpose: a point sitting exactly on an edge counts as outside.
// that keeps the very edge pixels of the trash zone from deleting a note.
export function pointInside(p: BoardPoint, r: NoteRect): boolean {
  return p.x > r.x && p.x < r.x + r.width && p.y > r.y && p.y < r.y + r.height;
}

// Left over from the first cut where a drop deleted a note when the note
// overlapped the trash, before I switched deletion to follow the pointer.
// Not wired up anymore but keeping it around in case overlap drops come back.
export function rectsOverlap(a: NoteRect, b: NoteRect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
