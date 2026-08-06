import { test, expect, type Locator, type Page } from '@playwright/test';

const STORAGE_KEY = 'sticky-notes-ts:document';
const NOTE_TEXT = 'Hello smoke test';

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  if (box === null) {
    throw new Error('Expected element to be visible with a bounding box');
  }
  return box;
}

function center(box: Box): { x: number; y: number } {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function drag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.mouse.up();
}

test('create, edit, move, resize, persist, then trash a note', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const surface = page.locator('.boardSurface');
  const notes = page.locator('.noteCard');
  const surfaceBox = await boxOf(surface);

  await page.getByRole('button', { name: 'New note' }).click();
  await drag(
    page,
    { x: surfaceBox.x + 60, y: surfaceBox.y + 60 },
    { x: surfaceBox.x + 280, y: surfaceBox.y + 240 },
  );
  await expect(notes).toHaveCount(1);

  const editor = page.getByRole('textbox', { name: 'Note text' });
  await editor.fill(NOTE_TEXT);
  await expect(editor).toHaveValue(NOTE_TEXT);

  const headerCenter = center(await boxOf(page.locator('.noteCard .noteHeader')));
  await drag(page, headerCenter, {
    x: headerCenter.x + 140,
    y: headerCenter.y + 130,
  });

  const handleCenter = center(await boxOf(page.locator('.noteCard .resizeHandle')));
  await drag(page, handleCenter, {
    x: handleCenter.x + 60,
    y: handleCenter.y + 60,
  });

  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY))
    .toContain(NOTE_TEXT);
  await page.reload();
  await expect(notes).toHaveCount(1);
  await expect(page.getByRole('textbox', { name: 'Note text' })).toHaveValue(
    NOTE_TEXT,
  );

  const trashCenter = center(await boxOf(page.locator('.trashZone')));
  const headerCenterAfterReload = center(
    await boxOf(page.locator('.noteCard .noteHeader')),
  );
  await drag(page, headerCenterAfterReload, trashCenter);
  await expect(notes).toHaveCount(0);
});
