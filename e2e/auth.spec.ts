import { test, expect } from '@playwright/test';
import { waitForAuthPage, getApiKeyInput, getConnectButton } from './helpers';

test.describe('Auth flow', () => {
  test('page loads with login form visible', async ({ page }) => {
    await waitForAuthPage(page);

    const heading = page.getByRole('heading', { name: 'IBM Cloud Infrastructure Explorer' });
    await expect(heading).toBeVisible();
  });

  test('API key input is present', async ({ page }) => {
    await waitForAuthPage(page);

    const input = getApiKeyInput(page);
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('type', 'password');
  });

  test('Connect button exists and is initially disabled', async ({ page }) => {
    await waitForAuthPage(page);

    const button = getConnectButton(page);
    await expect(button).toBeVisible();
    await expect(button).toBeDisabled();
  });

  test('Connect button enables when API key is entered', async ({ page }) => {
    await waitForAuthPage(page);

    const input = getApiKeyInput(page);
    const button = getConnectButton(page);

    await input.fill('some-test-key');
    await expect(button).toBeEnabled();
  });

  test('invalid key shows error notification', async ({ page }) => {
    // Mock all three validation endpoints to return errors
    await page.route('**/api/auth/validate', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid API key' }),
      })
    );
    await page.route('**/api/vpc/auth/validate', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid API key' }),
      })
    );
    await page.route('**/api/powervs/auth/validate', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid API key' }),
      })
    );

    await waitForAuthPage(page);

    const input = getApiKeyInput(page);
    await input.fill('invalid-api-key');

    const button = getConnectButton(page);
    await button.click();

    // Wait for the error notification to appear
    const notification = page.locator('.cds--inline-notification--error');
    await expect(notification).toBeVisible({ timeout: 10_000 });
    await expect(notification).toContainText('Authentication failed');
  });
});
