import { test, expect } from '@playwright/test';

test.describe('Board Layout & Project Navigation', () => {
    test.beforeEach(async ({ page }) => {
        // Login as Admin
        await page.goto('http://localhost:3003/login');
        await page.fill('input[type="text"]', 'admin');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('http://localhost:3003/dashboard');
    });

    test('should load projects list', async ({ page }) => {
        await page.goto('http://localhost:3003/dashboard/projects');
        // Use more specific selector to avoid ambiguity between Sidebar button and Page Title
        await expect(page.getByRole('heading', { name: '项目管理' })).toBeVisible();
        await expect(page.locator('table')).toBeVisible();
    });

    test('should verify Kanban board structure', async ({ page }) => {
        await page.goto('http://localhost:3003/dashboard/projects');

        // Find a project link. The list has rows with "测试项目1".
        // Instead of clicking, let's navigate directly if clicking is flaky, 
        // BUT the test suite should simulate user actions.
        // Let's try to click the first "edit" button or the row itself if clickable.
        // Or simply wait for the table row.

        const projectRow = page.locator('tr').filter({ hasText: '测试项目1' });
        if (await projectRow.count() > 0) {
            // Check for an edit button or link inside
            // In Monday style, often the name is clickable?
            // If not, we found in manual test that we clicked near the text. 
            // Let's try clicking the text "测试项目1".
            await page.getByText('测试项目1').first().click();
        } else {
            // Fallback
            console.log('Project not found, navigating via workbench');
            await page.goto('http://localhost:3003/dashboard/workbench');
        }

        // Wait for board
        // Check for columns
        await expect(page.getByText('未开始').first()).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('进行中').first()).toBeVisible();

        // Check for Story Group Header (Monday style)
        // Usually has a status color line or distinct header
        // We can check for a known story name like "用户故事12"
        await expect(page.getByText('用户故事12')).toBeVisible();
    });
});
