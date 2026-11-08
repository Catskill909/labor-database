/**
 * Shareable entry links (Phase 3, 8 Nov 2026): /entry/<id>-<words>,
 * Copy link, Back/Forward/close, failed links, and server link previews.
 */
import { test, expect } from '@playwright/test';
import { fixtures, dialog, HOME, SITE_TITLE, openTab } from './helpers';

test('opening a card gives the entry its own address; Copy link copies it', async ({ page }) => {
    await page.goto('/');
    await openTab(page, /Labor Films/);
    await page.getByRole('button', { name: /Fixture Film 010/ }).click();

    await expect(page).toHaveURL(/\/entry\/\d+-fixture-film-010$/);
    await expect(dialog(page)).toBeVisible();
    await expect(page).toHaveTitle(`Fixture Film 010 | ${SITE_TITLE}`);

    await dialog(page).getByRole('button', { name: 'Copy link to this entry' }).click();
    await expect(dialog(page).getByRole('button', { name: 'Link copied' })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(page.url());
});

test('Back closes the popup without reloading and the list keeps its place; Forward reopens', async ({ page }) => {
    await page.goto('/');
    await openTab(page, /Labor Films/);
    const card = page.getByRole('button', { name: /Fixture Film 040/ });
    await card.scrollIntoViewIfNeeded();
    const main = page.locator('main');
    const before = await main.evaluate(el => el.scrollTop);
    expect(before).toBeGreaterThan(300);
    await page.evaluate(() => { (window as unknown as { sameDocument: boolean }).sameDocument = true; });

    await card.click();
    await expect(dialog(page)).toBeVisible();
    await page.goBack();

    await expect(page).toHaveURL(HOME);
    await expect(dialog(page)).toBeHidden();
    await expect(page).toHaveTitle(SITE_TITLE);
    expect(await page.evaluate(() => (window as unknown as { sameDocument?: boolean }).sameDocument)).toBe(true);
    expect(Math.abs((await main.evaluate(el => el.scrollTop)) - before)).toBeLessThan(80);

    await page.goForward();
    await expect(dialog(page)).toBeVisible();
    await dialog(page).getByRole('button', { name: 'Close' }).click();
    await expect(dialog(page)).toBeHidden();
    await expect(page).toHaveURL(HOME);
});

test('a link with only the number opens the entry at its full address; closing goes home', async ({ page }) => {
    const { salt } = fixtures();
    await page.goto(`/entry/${salt}`);
    await expect(page).toHaveURL(new RegExp(`/entry/${salt}-salt-of-the-earth$`));
    await expect(dialog(page)).toHaveAccessibleName('Salt of the Earth');
    await dialog(page).getByRole('button', { name: 'Close' }).click();
    await expect(page).toHaveURL(HOME);
    await expect(dialog(page)).toBeHidden();
});

test('quote links are named by the author', async ({ page }) => {
    const { quote } = fixtures();
    await page.goto(`/entry/${quote}`);
    await expect(page).toHaveURL(new RegExp(`/entry/${quote}-mother-jones$`));
    await expect(dialog(page)).toHaveAccessibleName('Quote by Mother Jones');
});

for (const [label, ref] of [
    ['an unknown entry', () => '999999-nothing-here'],
    ['an unpublished entry', () => String(fixtures().unpublished)],
    ['a malformed link', () => 'abc'],
] as const) {
    test(`${label} lands on the home page with a notice`, async ({ page }) => {
        const response = await page.goto(`/entry/${ref()}`);
        expect(response?.status()).toBe(404);
        await expect(page.getByRole('status')).toContainText("That entry isn't available");
        await expect(page).toHaveURL(HOME);
        await expect(dialog(page)).toBeHidden();
    });
}

test('server: stale or missing words redirect (301) to the current address, keeping the query', async ({ request }) => {
    const { salt } = fixtures();
    for (const ref of [`${salt}`, `${salt}-an-old-title`]) {
        const res = await request.get(`/entry/${ref}?utm_source=news`, { maxRedirects: 0 });
        expect(res.status()).toBe(301);
        expect(res.headers()['location']).toBe(`/entry/${salt}-salt-of-the-earth?utm_source=news`);
    }
});

test('server: link previews carry title, address and picture', async ({ request }) => {
    const { salt, quote } = fixtures();
    const film = await (await request.get(`/entry/${salt}-salt-of-the-earth`)).text();
    expect(film).toContain('<meta property="og:title" content="Salt of the Earth (1954)" />');
    expect(film).toContain(`<meta property="og:url" content="http://localhost:3101/entry/${salt}-salt-of-the-earth" />`);
    // No picture of its own: the LHF logo, in a small card.
    expect(film).toContain('<meta property="og:image" content="http://localhost:3101/laborheritage.png" />');
    expect(film).toContain('<meta name="twitter:card" content="summary" />');

    const q = await (await request.get(`/entry/${quote}-mother-jones`)).text();
    expect(q).toContain('<meta property="og:title" content="Quote by Mother Jones" />');

    const logo = await request.get('/laborheritage.png');
    expect(logo.headers()['content-type']).toBe('image/png');
});

test('a title containing HTML/script stays text — in the preview and on the page', async ({ page, request }) => {
    const { hostile } = fixtures();
    const html = await (await request.get(`/entry/${hostile}`)).text();
    expect(html).not.toContain('<script>window.__pwned');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;window.__pwned=1&lt;/script&gt;');

    await page.goto(`/entry/${hostile}`);
    await expect(dialog(page)).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
});

test.describe('on a phone', () => {
    test.use({ viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true });

    test('popup fits the screen and the icon-only Copy link still has a name', async ({ page }) => {
        const { quote } = fixtures();
        await page.goto(`/entry/${quote}`);
        await expect(dialog(page)).toBeVisible();
        await expect(dialog(page).getByRole('button', { name: 'Copy link to this entry' })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
});
