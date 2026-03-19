import { test, expect } from '@playwright/test';
import { waitForAuthPage, getImportButton } from './helpers';

test.describe('Import flow', () => {
  test('Import button is visible on auth page', async ({ page }) => {
    await waitForAuthPage(page);

    const importButton = getImportButton(page);
    await expect(importButton).toBeVisible();
  });

  test('can trigger file import dialog', async ({ page }) => {
    await waitForAuthPage(page);

    const importButton = getImportButton(page);

    // Verify there is a hidden file input associated with the import button
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    // Verify clicking the import button does not throw
    // (The file chooser dialog is triggered programmatically)
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 5_000 });
    await importButton.click();
    const fileChooser = await fileChooserPromise;

    expect(fileChooser).toBeTruthy();
  });
});
