/**
 * Search box clear button (15 Nov 2026): a round ✕ appears while there is
 * text; it, or Escape, empties the box and keeps the cursor there.
 */
import { test, expect } from '@playwright/test';

test('search box: ✕ and Escape clear it, cursor stays in the box', async ({ page }) => {
    await page.goto('/');
    const box = page.getByPlaceholder('Search all categories...');
    const clear = page.getByRole('button', { name: 'Clear search' });
    await expect(clear).toHaveCount(0);

    await box.fill('Salt of the Earth');
    await expect(clear).toBeVisible();
    await clear.click();
    await expect(box).toHaveValue('');
    await expect(box).toBeFocused();
    await expect(clear).toHaveCount(0);

    await box.fill('mill');
    await box.press('Escape');
    await expect(box).toHaveValue('');
    await expect(clear).toHaveCount(0);
});
