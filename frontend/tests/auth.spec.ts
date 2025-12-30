import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test('should login successfully with valid credentials', async ({ page }) => {
        await page.goto('http://localhost:3003/login');

        // Fill in credentials
        await page.fill('input[type="text"]', 'admin');
        await page.fill('input[type="password"]', 'admin123');

        // Click login
        await page.click('button[type="submit"]');

        // Verify redirect to dashboard
        await expect(page).toHaveURL('http://localhost:3003/dashboard');

        // Verify user avatar or header element is present
        await expect(page.locator('header')).toBeVisible();
    });

    test('should show error with invalid credentials', async ({ page }) => {
        await page.goto('http://localhost:3003/login');

        await page.fill('input[type="text"]', 'wrong');
        await page.fill('input[type="password"]', 'wrong');

        await page.click('button[type="submit"]');

        // Verify error message
        await expect(page.getByText('Invalid credentials')).toBeVisible();
        await expect(page).toHaveURL('http://localhost:3003/login');
    });

    test('should logout successfully', async ({ page }) => {
        // Perform login first
        await page.goto('http://localhost:3003/login');
        await page.fill('input[type="text"]', 'admin');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('http://localhost:3003/dashboard');

        // Click user avatar to open dropdown
        // Find the avatar button - it's usually in the header
        await page.locator('header button').filter({ has: page.locator('span.relative') }).last().click();
        // Or cleaner: 
        // await page.getByRole('button').filter({ has: page.locator('img') }).click();

        // Based on DashboardLayout, it's a trigger for dropdown.
        // Let's rely on text or specific class if possible, or just the last button in header

        // Click logout
        await page.getByText('退出登录').click();

        // Verify redirect to login
        await expect(page).toHaveURL('http://localhost:3003/login');
    });
});
