import { describe, expect, it } from "vitest";

import {
  createRectFromDrag,
  hasReachedCreateThreshold,
  isPointStrictlyInsideRectangle,
  isPointerOverTrash,
  moveRect,
  resizeRect,
} from "./geometry";
import type { BoardPoint, NoteRect, Size } from "./types";

const board: Size = { width: 1000, height: 800 };

describe("geometry", () => {
  it.each<[string, BoardPoint, BoardPoint, NoteRect]>([
    [
      "forward (down-right)",
      { x: 100, y: 100 },
      { x: 400, y: 300 },
      { x: 100, y: 100, width: 300, height: 200 },
    ],
    [
      "reverse (up-left)",
      { x: 500, y: 400 },
      { x: 300, y: 250 },
      { x: 300, y: 250, width: 200, height: 150 },
    ],
  ])(
    "creates normalized rectangles in the %s drag direction",
    (_label, origin, current, expected) => {
      expect(createRectFromDrag(origin, current, board)).toEqual(expected);
    },
  );

  it("rejects short drags and applies minimum size at the board edge", () => {
    expect(hasReachedCreateThreshold({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(false);
    expect(hasReachedCreateThreshold({ x: 0, y: 0 }, { x: 6, y: 0 })).toBe(true);

    const smallBoard: Size = { width: 100, height: 80 };
    expect(
      createRectFromDrag({ x: 0, y: 0 }, { x: 50, y: 40 }, smallBoard),
    ).toEqual({ x: 0, y: 0, width: 100, height: 80 });
  });

  it.each<[string, NoteRect, BoardPoint, BoardPoint, NoteRect]>([
    [
      "translates within bounds",
      { x: 100, y: 100, width: 160, height: 120 },
      { x: 0, y: 0 },
      { x: 50, y: 30 },
      { x: 150, y: 130, width: 160, height: 120 },
    ],
    [
      "clamps past the bottom-right edge",
      { x: 900, y: 700, width: 160, height: 120 },
      { x: 0, y: 0 },
      { x: 500, y: 500 },
      { x: 840, y: 680, width: 160, height: 120 },
    ],
    [
      "clamps past the top-left edge",
      { x: 100, y: 100, width: 160, height: 120 },
      { x: 0, y: 0 },
      { x: -500, y: -500 },
      { x: 0, y: 0, width: 160, height: 120 },
    ],
  ])("moves a note and %s", (_label, initial, origin, current, expected) => {
    expect(moveRect(initial, origin, current, board)).toEqual(expected);
  });

  it.each<[string, BoardPoint, NoteRect]>([
    [
      "enforces the minimum size",
      { x: -50, y: -50 },
      { x: 100, y: 100, width: 160, height: 120 },
    ],
    [
      "clamps to the board maximum",
      { x: 10000, y: 10000 },
      { x: 100, y: 100, width: 900, height: 700 },
    ],
  ])("resizes a note and %s", (_label, current, expected) => {
    const initial: NoteRect = { x: 100, y: 100, width: 160, height: 120 };
    expect(resizeRect(initial, { x: 0, y: 0 }, current, board)).toEqual(expected);
  });

  it.each<[string, BoardPoint, boolean]>([
    ["left edge", { x: 100, y: 150 }, false],
    ["right edge", { x: 200, y: 150 }, false],
    ["top edge", { x: 150, y: 100 }, false],
    ["bottom edge", { x: 150, y: 200 }, false],
    ["interior point", { x: 150, y: 150 }, true],
  ])("treats a %s of the trash strictly for both predicates", (_label, point, expected) => {
    const trashRect: NoteRect = { x: 100, y: 100, width: 100, height: 100 };
    expect(isPointStrictlyInsideRectangle(point, trashRect)).toBe(expected);
    expect(isPointerOverTrash(point, trashRect)).toBe(expected);
  });
});
