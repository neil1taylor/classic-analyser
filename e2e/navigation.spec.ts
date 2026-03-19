import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Classic auth validation to succeed
    await page.route('**/api/auth/validate', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          valid: true,
          account: {
            id: 123456,
            companyName: 'Test Account',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
          },
        }),
      })
    );
    // Mock VPC and PowerVS auth to fail (Classic only mode)
    await page.route('**/api/vpc/auth/validate', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Not authorized' }),
      })
    );
    await page.route('**/api/powervs/auth/validate', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Not authorized' }),
      })
    );

    // Navigate and log in
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'IBM Cloud Infrastructure Explorer' })).toBeVisible({ timeout: 15_000 });

    const input = page.locator('#api-key-input');
    await input.fill('test-api-key');
    await page.getByRole('button', { name: 'Connect' }).click();

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 15_000 });
  });

  test('sidebar navigation is visible after auth', async ({ page }) => {
    const sideNav = page.locator('nav[aria-label="Side navigation"]');
    await expect(sideNav).toBeVisible();
  });

  test('navigation links are present for expected routes', async ({ page }) => {
    // Check for core navigation items that should be present for Classic mode
    await expect(page.getByText('Summary')).toBeVisible();
    await expect(page.getByText('Topology')).toBeVisible();
    await expect(page.getByText('Cost Analysis')).toBeVisible();
    await expect(page.getByText('Geography')).toBeVisible();
  });
});
