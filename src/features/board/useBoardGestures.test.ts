import { describe, expect, it } from 'vitest';

import { useBoardGestures } from './useBoardGestures';

// I wanted to test the actual gesture flow here, but jsdom doesn't implement
// setPointerCapture / releasePointerCapture and getBoundingClientRect just
// returns zeros, so the interesting paths need a real browser. Leaving these
// skipped as a reminder - would probably do them in Playwright instead.
describe('useBoardGestures', () => {
  it('is exported as a hook', () => {
    expect(typeof useBoardGestures).toBe('function');
  });

  it.skip('captures the pointer and previews a move while dragging', () => {
    // needs setPointerCapture support in the test env
  });

  it.skip('cancels the gesture on Escape / lost capture', () => {
    // same issue, no pointer capture in jsdom
  });

  it.todo('removes a note when the pointer is released over the trash');
});
