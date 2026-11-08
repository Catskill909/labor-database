/**
 * Labor Radio/Podcast tab (Phase 1, 8 Nov 2026): card badges, the popup,
 * blank and unsafe listen links, and contact details that must stay private.
 */
import { test, expect } from '@playwright/test';
import { fixtures, dialog, openTab } from './helpers';
import { PRIVATE_MARKER } from './constants';

test('card shows the badges and On Hiatus; popup shows only filled-in, safe links', async ({ page }) => {
    await page.goto('/');
    await openTab(page, /Labor Radio\/Podcast/);
    const card = page.getByRole('button', { name: /Union Hall Radio/ });
    await expect(card).toContainText('Founder');
    await expect(card).toContainText('Builder');
    await expect(card).toContainText('On Hiatus');

    await card.click();
    const popup = dialog(page);
    await expect(popup).toContainText('Network Founder');
    await expect(popup).toContainText('Washington, DC');
    await expect(popup.getByRole('link', { name: /Apple Podcasts/ })).toHaveAttribute('href', 'https://podcasts.apple.com/us/podcast/test/id1');
    await expect(popup.getByRole('link', { name: /Station archive/ })).toBeVisible();
    // Blank Spotify, blank custom link and a javascript: YouTube link: none shown.
    await expect(popup.getByRole('link', { name: /Spotify/ })).toHaveCount(0);
    await expect(popup.getByRole('link', { name: /YouTube/ })).toHaveCount(0);
    await expect(popup.getByRole('link', { name: /^Blank/ })).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
    await expect(popup.getByRole('link', { name: /Show website/ })).toHaveAttribute('href', 'https://example.org/union-hall-radio');
    await expect(popup.getByRole('button', { name: /Copy RSS feed/ })).toBeVisible();
});

test('contact details never reach the public page, its API or search', async ({ page, request }) => {
    const { podcast } = fixtures();
    await page.goto(`/entry/${podcast}`);
    await expect(dialog(page)).toContainText('Union Hall Radio');
    expect(await page.content()).not.toContain(PRIVATE_MARKER);

    for (const url of [
        `/api/entries/${podcast}`,
        '/api/entries?category=podcast',
        '/api/feed.json',
        `/entry/${podcast}`,
    ]) {
        const body = await (await request.get(url)).text();
        expect(body, url).not.toContain(PRIVATE_MARKER);
        expect(body, url).not.toContain('555-0100');
        expect(body, url).not.toContain('privateMetadata');
    }
    const search = await (await request.get(`/api/entries?search=${PRIVATE_MARKER}`)).json();
    expect(Array.isArray(search) ? search : search.entries).toHaveLength(0);
});
