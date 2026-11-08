import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, type Page } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));

export interface FixtureIds {
    history: number;
    quote: number;
    salt: number;
    hostile: number;
    unpublished: number;
}

/** Ids written by fixtures.ts when the test server started. Call inside a test. */
export function fixtures(): FixtureIds {
    return JSON.parse(fs.readFileSync(path.join(here, '.tmp', 'fixtures.json'), 'utf8'));
}

/** Counts from fixtures.ts, published entries only. */
export const COUNTS = {
    history: 6,          // 1 tagged "Child Labor" + 5 others
    historyChildLabor: 1,
    films: 82,           // 80 numbered + Salt of the Earth + the hostile title
    filmsOrganizing: 40, // the even-numbered fixture films
};

export const SITE_TITLE = 'LHF Labor Arts & Culture Database';
export const HOME = /localhost:\d+\/$/;

export const dialog = (page: Page) => page.getByRole('dialog');

/** The list footer, e.g. "Showing 1 of 6 entries". */
export async function expectShowing(page: Page, shown: number, total: number) {
    await page.waitForLoadState('networkidle');
    await expect(page.locator('footer')).toContainText(`Showing ${shown} of ${total} entries`);
}

export async function openTab(page: Page, label: RegExp) {
    await page.getByRole('button', { name: label }).first().click();
}
