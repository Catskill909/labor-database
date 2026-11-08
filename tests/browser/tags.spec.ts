/**
 * Tag clicks and tab changes.
 *
 * The bug these exist for (fixed 8 Nov 2026): clicking a tag in a popup that
 * also switched tab set the filter, then a "reset filters when the tab
 * changes" effect wiped it, so the whole tab showed. Every case where a tag
 * click switches tab is covered, plus the tab behaviour around it.
 */
import { test, expect } from '@playwright/test';
import { fixtures, dialog, expectShowing, openTab, COUNTS } from './helpers';

test('tag in a popup opened from a link keeps its filter (tab switches)', async ({ page }) => {
    await page.goto(`/entry/${fixtures().history}`);
    await dialog(page).getByRole('button', { name: 'Child Labor' }).click();
    await expect(dialog(page)).toBeHidden();
    await expectShowing(page, COUNTS.historyChildLabor, COUNTS.history);
});

test('tag in a popup opened from an On This Day card keeps its filter (tab switches)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /textile workers strike at the mill/ }).first().click();
    await dialog(page).getByRole('button', { name: 'Child Labor' }).click();
    await expect(dialog(page)).toBeHidden();
    await expectShowing(page, COUNTS.historyChildLabor, COUNTS.history);
});

test('tag in a popup opened from a search result keeps its filter (tab switches)', async ({ page }) => {
    await page.goto('/');
    // "mill" matches all six history entries; only one carries "Child Labor".
    // The search stays applied alongside the tag, so a lost filter shows 6.
    await page.getByPlaceholder('Search all categories...').fill('mill');
    await page.getByRole('button', { name: /textile workers strike at the mill/ }).first().click();
    await dialog(page).getByRole('button', { name: 'Child Labor' }).click();
    await expect(dialog(page)).toBeHidden();
    await expectShowing(page, COUNTS.historyChildLabor, COUNTS.history);
});

test('tag in a popup from its own tab filters; clicking that tab again keeps the filter; another tab starts clean', async ({ page }) => {
    await page.goto('/');
    await openTab(page, /Labor Films/);
    await page.getByRole('button', { name: /Fixture Film 002/ }).click();
    await dialog(page).getByRole('button', { name: 'Organizing' }).click();
    await expectShowing(page, COUNTS.filmsOrganizing, COUNTS.films);

    await openTab(page, /Labor Films/);
    await expectShowing(page, COUNTS.filmsOrganizing, COUNTS.films);

    await openTab(page, /Labor History/);
    await expectShowing(page, COUNTS.history, COUNTS.history);
});

test('typing a search on On This Day switches to results from every collection', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Pick date' })).toBeVisible();
    await page.getByPlaceholder('Search all categories...').fill('Salt of the Earth');
    await expect(page.getByRole('button', { name: /Salt of the Earth/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pick date' })).toBeHidden();
});
