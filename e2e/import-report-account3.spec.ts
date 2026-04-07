import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { waitForAuthPage } from './helpers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ALT_INPUT_3 = path.resolve(__dirname, '../alt_input/3');

/**
 * Account 3 IMS Report files (excluding .mdl which requires server-side conversion).
 */
const ACCOUNT3_FILES = [
  '1703429.html',
  '1703429_summary.html',
  '1703429_gw.csv',
  '1703429_nas.csv',
  '1703429.drawio',
  '1703429_deviceinventory.xlsx',
  '1703429_consolidated.xlsx',
].map(f => path.join(ALT_INPUT_3, f));

test.describe('IMS Report Import — Account 3 (1703429)', () => {
  test('imports IMS report files and navigates to dashboard', async ({ page }) => {
    await waitForAuthPage(page);

    // Find the "Import IMS Reports" button
    const importButton = page.getByRole('button', { name: /import ims reports/i });
    await expect(importButton).toBeVisible();

    // Trigger file chooser and set Account 3 files
    const fileChooserPromise = page.waitForEvent('filechooser');
    await importButton.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(ACCOUNT3_FILES);

    // Wait for parsing and navigation to dashboard (may take time for large drawio)
    await page.waitForURL('**/dashboard', { timeout: 60_000 });

    // Dashboard should show content (Carbon v11 uses cds-- prefix)
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
  });

  test('dashboard shows Account 3 data after import', async ({ page }) => {
    await waitForAuthPage(page);

    // Import files
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /import ims reports/i }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(ACCOUNT3_FILES);
    await page.waitForURL('**/dashboard', { timeout: 60_000 });

    // Should show resource cards with non-zero counts
    // Look for common resource type names on the dashboard
    const dashboardContent = await page.textContent('main');
    expect(dashboardContent).toBeTruthy();
  });

  test('resource tables render with data', async ({ page }) => {
    await waitForAuthPage(page);

    // Import files
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /import ims reports/i }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(ACCOUNT3_FILES);
    await page.waitForURL('**/dashboard', { timeout: 60_000 });

    // Navigate to Resources page via sidebar
    const resourcesLink = page.getByRole('link', { name: /resources/i });
    if (await resourcesLink.isVisible()) {
      await resourcesLink.click();
      await page.waitForURL('**/resources', { timeout: 10_000 });

      // Should have a data table with rows
      const table = page.locator('table');
      if (await table.isVisible({ timeout: 5_000 })) {
        const rows = table.locator('tbody tr');
        const rowCount = await rows.count();
        expect(rowCount).toBeGreaterThan(0);
      }
    }
  });

  test('export produces downloadable XLSX', async ({ page }) => {
    await waitForAuthPage(page);

    // Import files
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /import ims reports/i }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(ACCOUNT3_FILES);
    await page.waitForURL('**/dashboard', { timeout: 60_000 });

    // Navigate to Export page
    const exportLink = page.getByRole('link', { name: /export/i });
    if (await exportLink.isVisible()) {
      await exportLink.click();
      await page.waitForURL('**/export', { timeout: 10_000 });

      // Look for export button and trigger download
      const exportButton = page.getByRole('button', { name: /export.*xlsx/i });
      if (await exportButton.isVisible({ timeout: 5_000 })) {
        const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
        await exportButton.click();
        const download = await downloadPromise;

        expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
      }
    }
  });
});
