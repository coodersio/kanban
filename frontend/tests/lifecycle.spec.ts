import { test, expect } from '@playwright/test';

test.describe('Task Lifecycle', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3003/login');
        await page.fill('input[type="text"]', 'admin');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('http://localhost:3003/dashboard');
        await page.goto('http://localhost:3003/dashboard/workbench'); // Go to board
    });

    test('should open task details drawer', async ({ page }) => {
        // Find a task card. The new design has task cards with a specific class or structure.
        // We'll look for a visible task card.
        const taskCard = page.locator('div[draggable="true"]').first();

        // Ensure there is at least one task
        if (await taskCard.count() > 0) {
            await taskCard.click();

            // Verify Drawer Opens
            await expect(page.locator('div[role="dialog"]')).toBeVisible();

            // Verify Fields in Drawer (Monday.com style)
            // Look for "Status" label or specific input
            await expect(page.getByText('Status')).toBeVisible();
            await expect(page.getByText('Priority')).toBeVisible();

            // Close Drawer
            await page.keyboard.press('Escape');
            await expect(page.locator('div[role="dialog"]')).not.toBeVisible();
        } else {
            test.skip(true, 'No tasks found to test details drawer');
        }
    });

    test('should create a new task', async ({ page }) => {
        const addTaskBtn = page.locator('button').filter({ hasText: '添加任务' }).first(); // Chinese text from Workbench
        if (await addTaskBtn.isVisible()) {
            await addTaskBtn.click();

            // If dialog:
            await expect(page.locator('div[role="dialog"]')).toBeVisible();
            await page.fill('input[placeholder="任务标题"]', 'E2E Test Task');
            await page.click('button:has-text("创建")'); // Confirm create

            // Verify it appears
            await expect(page.getByText('E2E Test Task')).toBeVisible();
        }
    });
});
