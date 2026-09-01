import { describe, expect, it } from 'vitest';

import { useBoardGestures } from './useBoardGestures';

describe('useBoardGestures', () => {
  it('is exported as a hook', () => {
    expect(typeof useBoardGestures).toBe('function');
  });

  it.skip('captures the pointer and previews a move while dragging', () => {});

  it.skip('cancels the gesture on Escape / lost capture', () => {});

  it.todo('removes a note when the pointer is released over the trash');
});
