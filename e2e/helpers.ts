import { type Page, expect } from '@playwright/test';

/**
 * Wait for the auth page to fully load and be visible.
 */
export async function waitForAuthPage(page: Page) {
  await page.goto('/');
  // Wait for the React app to render the login heading
  await expect(page.getByRole('heading', { name: 'IBM Cloud Infrastructure Explorer' })).toBeVisible({ timeout: 15_000 });
}

/**
 * Get the API key input field.
 */
export function getApiKeyInput(page: Page) {
  return page.locator('#api-key-input');
}

/**
 * Get the Connect (login) button.
 */
export function getConnectButton(page: Page) {
  return page.getByRole('button', { name: 'Connect' });
}

/**
 * Get the Import button on the auth page.
 */
export function getImportButton(page: Page) {
  return page.getByRole('button', { name: /import xlsx/i });
}
