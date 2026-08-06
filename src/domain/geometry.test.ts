import { describe, expect, it } from "vitest";

import {
  clientPointToBoardPoint,
  createRectFromDrag,
  hasReachedCreateThreshold,
  isPointStrictlyInsideRectangle,
  isPointerOverTrash,
  moveRect,
  resizeRect,
} from "./geometry";
import type { NoteRect, Size } from "./types";

const board: Size = { width: 1000, height: 800 };

describe("clientPointToBoardPoint", () => {
  it("subtracts the board origin from client coordinates", () => {
    expect(
      clientPointToBoardPoint(
        { clientX: 130, clientY: 90 },
        { left: 30, top: 20, width: 1000, height: 800 },
      ),
    ).toEqual({ x: 100, y: 70 });
  });
});

describe("hasReachedCreateThreshold", () => {
  it("rejects drags shorter than the minimum distance", () => {
    expect(hasReachedCreateThreshold({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(false);
  });

  it("accepts drags at or beyond the minimum distance", () => {
    expect(hasReachedCreateThreshold({ x: 0, y: 0 }, { x: 6, y: 0 })).toBe(true);
    expect(hasReachedCreateThreshold({ x: 0, y: 0 }, { x: 5, y: 5 })).toBe(true);
  });
});

describe("createRectFromDrag", () => {
  it("anchors the far edge for a reverse (up-left) drag", () => {
    const rect = createRectFromDrag({ x: 500, y: 400 }, { x: 300, y: 250 }, board);
    expect(rect).toEqual({ x: 300, y: 250, width: 200, height: 150 });
  });

  it("uses the available axis size when the board is smaller than the minimum", () => {
    const smallBoard: Size = { width: 100, height: 80 };
    const rect = createRectFromDrag({ x: 0, y: 0 }, { x: 50, y: 40 }, smallBoard);
    expect(rect).toEqual({ x: 0, y: 0, width: 100, height: 80 });
  });
});

describe("moveRect", () => {
  it("translates by the pointer delta when the result stays inside the board", () => {
    const initial: NoteRect = { x: 100, y: 100, width: 160, height: 120 };
    const moved = moveRect(initial, { x: 0, y: 0 }, { x: 50, y: 30 }, board);
    expect(moved).toEqual({ x: 150, y: 130, width: 160, height: 120 });
  });

  it("clamps a note dragged past the board edge back inside", () => {
    const initial: NoteRect = { x: 900, y: 700, width: 160, height: 120 };
    const moved = moveRect(initial, { x: 0, y: 0 }, { x: 500, y: 500 }, board);
    expect(moved).toEqual({ x: 840, y: 680, width: 160, height: 120 });
  });
});

describe("resizeRect", () => {
  const initial: NoteRect = { x: 100, y: 100, width: 160, height: 120 };

  it("enforces the minimum dimensions", () => {
    const resized = resizeRect(initial, { x: 0, y: 0 }, { x: -50, y: -50 }, board);
    expect(resized).toEqual({ x: 100, y: 100, width: 160, height: 120 });
  });

  it("clamps maximum size to the board space right of and below x/y", () => {
    const resized = resizeRect(initial, { x: 0, y: 0 }, { x: 10000, y: 10000 }, board);
    expect(resized).toEqual({ x: 100, y: 100, width: 900, height: 700 });
  });
});

describe("trash hit testing", () => {
  const trashRect: NoteRect = { x: 100, y: 100, width: 100, height: 100 };

  it("treats points exactly on an edge as outside", () => {
    expect(isPointStrictlyInsideRectangle({ x: 100, y: 150 }, trashRect)).toBe(false);
    expect(isPointStrictlyInsideRectangle({ x: 200, y: 150 }, trashRect)).toBe(false);
  });

  it("treats strictly interior points as inside", () => {
    expect(isPointStrictlyInsideRectangle({ x: 150, y: 150 }, trashRect)).toBe(true);
  });

  it("isPointerOverTrash delegates to the strict predicate", () => {
    expect(isPointerOverTrash({ x: 150, y: 150 }, trashRect)).toBe(true);
    expect(isPointerOverTrash({ x: 100, y: 100 }, trashRect)).toBe(false);
  });
});
