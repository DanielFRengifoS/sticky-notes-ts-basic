import type {
  BoardBounds,
  BoardPoint,
  ClientPoint,
  NoteRect,
  Size,
} from './types';
import { MIN_CREATE_DRAG_DISTANCE, MIN_NOTE_HEIGHT, MIN_NOTE_WIDTH } from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function availableSize(boardSize: Size): Size {
  return {
    width: Math.max(0, Math.floor(boardSize.width)),
    height: Math.max(0, Math.floor(boardSize.height)),
  };
}

export function clientPointToBoardPoint(
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

export function normalizeRectToBoard(rect: NoteRect, boardSize: Size): NoteRect {
  const { width: availableWidth, height: availableHeight } = availableSize(boardSize);
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
  const x = current.x >= origin.x ? origin.x : origin.x - width;
  const y = current.y >= origin.y ? origin.y : origin.y - height;
  return normalizeRectToBoard({ x, y, width, height }, boardSize);
}

export function moveRect(
  initialRect: NoteRect,
  pointerOrigin: BoardPoint,
  currentPointer: BoardPoint,
  boardSize: Size,
): NoteRect {
  const dx = currentPointer.x - pointerOrigin.x;
  const dy = currentPointer.y - pointerOrigin.y;
  return normalizeRectToBoard(
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
  const { width: availableWidth, height: availableHeight } = availableSize(boardSize);
  const x = clamp(Math.round(initialRect.x), 0, availableWidth);
  const y = clamp(Math.round(initialRect.y), 0, availableHeight);
  const maxWidth = availableWidth - x;
  const maxHeight = availableHeight - y;
  const minWidth = Math.min(MIN_NOTE_WIDTH, maxWidth);
  const minHeight = Math.min(MIN_NOTE_HEIGHT, maxHeight);
  const dx = currentPointer.x - pointerOrigin.x;
  const dy = currentPointer.y - pointerOrigin.y;
  const width = clamp(Math.round(initialRect.width + dx), minWidth, maxWidth);
  const height = clamp(Math.round(initialRect.height + dy), minHeight, maxHeight);
  return { x, y, width, height };
}

export function isPointStrictlyInsideRectangle(
  point: BoardPoint,
  rect: NoteRect,
): boolean {
  return (
    point.x > rect.x &&
    point.x < rect.x + rect.width &&
    point.y > rect.y &&
    point.y < rect.y + rect.height
  );
}
