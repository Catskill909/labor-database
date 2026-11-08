/**
 * Layout regressions found on the live site, 8 Nov 2026.
 */
import { test, expect } from '@playwright/test';

// The tab bar grew to fit its tabs on anything wider than a phone, so with six
// tabs it ran off the right edge with no way to reach the last ones.
for (const width of [390, 768, 1024, 1280, 1600]) {
    test(`tab bar stays on screen and every tab is reachable at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        const bar = page.locator('nav').filter({ has: page.getByRole('button', { name: /On This Day/ }) }).first();
        const box = await bar.boundingBox();
        expect(box, 'tab bar rendered').not.toBeNull();
        expect(box!.x + box!.width, 'tab bar ends inside the window').toBeLessThanOrEqual(width);

        const last = page.getByRole('button', { name: /Labor Radio\/Podcast/ });
        const right = page.getByRole('button', { name: 'Scroll tabs right' });
        const lastBox = await last.boundingBox();
        const lastVisible = lastBox !== null && lastBox.x + lastBox.width <= width;
        if (!lastVisible) {
            await expect(right, 'hidden tabs need an arrow').toBeVisible();
            await right.click();
            await right.click();
            await page.waitForTimeout(500);
        }
        await last.click();
        await expect(last).toHaveAttribute('aria-current', 'page');
        const after = await last.boundingBox();
        expect(after!.x + after!.width).toBeLessThanOrEqual(width);
    });
}

test('On This Day shows one set of quote marks, whatever the stored text carries', async ({ page }) => {
    await page.goto('/');
    for (const text of ['Fixture quote with its own marks.', 'Fixture quote with only a closing mark.']) {
        const card = page.getByRole('button', { name: new RegExp(text.replace('.', '\\.')) }).first();
        await expect(card).toBeVisible();
        const shown = (await card.locator('p').first().innerText()).trim();
        expect(shown).toBe(`“${text}”`);
    }
});
