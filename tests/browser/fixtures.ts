/**
 * Test data for the browser tests: a small, known set of entries written into
 * the throwaway test database (never the real one — serve.sh refuses to run
 * otherwise). The ids are saved to .tmp/fixtures.json for the specs to read.
 *
 * Shaped to reach the cases that matter:
 * - a history entry dated today, with tags, so On This Day shows a tagged card
 * - 80 films, so the list scrolls (scroll position is checked after Back)
 * - a quote (named by author in links; general popup layout)
 * - a film whose title is an HTML/script injection attempt
 * - an unpublished entry, which must behave like a missing one
 * - a podcast with badges, On Hiatus, mixed listen links and private contact
 *   details (PRIVATE_MARKER) that must never reach a public page or API
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { PRIVATE_MARKER } from './constants';

const here = path.dirname(fileURLToPath(import.meta.url));
const db = process.env.DATABASE_URL ?? '';
if (!db.endsWith('/tests/browser/.tmp/test.db')) {
    throw new Error(`Refusing to write test data: DATABASE_URL is not the test database (${db})`);
}

const prisma = new PrismaClient();
const today = new Date();
const month = today.getMonth() + 1;
const day = today.getDate();

export const HOSTILE_TITLE = 'Evil "><script>window.__pwned=1</script> Film';

async function main() {
    const history = await prisma.entry.create({
        data: {
            category: 'history', isPublished: true, month, day, year: 1912,
            title: 'Test fixture: textile workers strike at the mill',
            description: 'Test fixture: textile workers strike at the mill for bread and roses.',
            tags: 'Child Labor, Strikes & Lockouts',
        },
    });
    // Five more history entries on other days, without the history fixture's
    // tags — so "filtered by Child Labor" (1) and "whole tab" (6) differ.
    for (let i = 1; i <= 5; i++) {
        await prisma.entry.create({
            data: {
                category: 'history', isPublished: true, month: ((month + i - 1) % 12) + 1, day: 1, year: 1930 + i,
                // "mill" here too: a search for "mill" finds all six history
                // entries, so a lost tag filter shows 6 instead of 1.
                title: `Test fixture: history event ${i}`, description: `Test fixture history event ${i} at the mill.`,
                tags: 'Organizing',
            },
        });
    }
    const quote = await prisma.entry.create({
        data: {
            category: 'quote', isPublished: true, creator: 'Mother Jones',
            title: 'Pray for the dead and fight like hell for the living.',
            description: 'Pray for the dead and fight like hell for the living.',
            tags: 'Organizing',
        },
    });
    // Quotes dated today whose stored text already carries marks: On This Day
    // adds its own, and must not show two sets.
    await prisma.entry.create({
        data: {
            category: 'quote', isPublished: true, month, day, creator: 'Fixture Author',
            title: 'Fixture quote with its own marks',
            description: '"Fixture quote with its own marks."',
        },
    });
    await prisma.entry.create({
        data: {
            category: 'quote', isPublished: true, month, day, creator: 'Fixture Author',
            title: 'Fixture quote with only a closing mark',
            description: 'Fixture quote with only a closing mark.”',
        },
    });
    const salt = await prisma.entry.create({
        data: {
            category: 'film', isPublished: true, year: 1954, creator: 'Herbert J. Biberman',
            title: 'Salt of the Earth', description: 'Test fixture: zinc miners strike in New Mexico.',
            tags: 'Mining, Strikes & Lockouts',
        },
    });
    const hostile = await prisma.entry.create({
        data: {
            category: 'film', isPublished: true, title: HOSTILE_TITLE,
            description: '"><img src=x onerror="window.__pwned=2"> test fixture',
        },
    });
    const unpublished = await prisma.entry.create({
        data: {
            category: 'film', isPublished: false, title: 'Test fixture: unpublished film',
            description: 'Must not be reachable by link.',
        },
    });
    await prisma.entry.create({
        data: {
            category: 'music', isPublished: true, title: 'Test fixture: Solidarity Song',
            description: 'Test fixture song.', tags: 'Organizing',
        },
    });
    const podcast = await prisma.entry.create({
        data: {
            category: 'podcast', isPublished: true,
            title: 'Test fixture: Union Hall Radio',
            creator: 'Pat Organizer, host',
            description: 'Test fixture podcast about union news.',
            sourceUrl: 'https://example.org/union-hall-radio',
            metadata: JSON.stringify({
                rssUrl: 'https://example.org/feed.xml',
                location: 'Washington, DC',
                frequency: 'Weekly',
                status: 'hiatus',
                badges: ['founder', 'builder'],
                listenLinks: {
                    apple: 'https://podcasts.apple.com/us/podcast/test/id1',
                    spotify: '',
                    youtube: 'javascript:window.__pwned=3',
                },
                extraLinks: [{ label: 'Station archive', url: 'https://example.org/archive' }, { label: 'Blank', url: '' }],
            }),
            privateMetadata: JSON.stringify({
                contactName: `Contact ${PRIVATE_MARKER}`,
                contactEmail: `${PRIVATE_MARKER}@example.org`,
                contactPhone: '555-0100',
            }),
            submitterEmail: `submitter-${PRIVATE_MARKER}@example.org`,
        },
    });
    for (let i = 1; i <= 80; i++) {
        await prisma.entry.create({
            data: {
                category: 'film', isPublished: true, year: 1900 + i,
                title: `Fixture Film ${String(i).padStart(3, '0')}`,
                description: `Test fixture film number ${i}.`,
                tags: i % 2 ? 'Mining' : 'Organizing',
            },
        });
    }

    const ids = { history: history.id, quote: quote.id, salt: salt.id, hostile: hostile.id, unpublished: unpublished.id, podcast: podcast.id };
    fs.writeFileSync(path.join(here, '.tmp', 'fixtures.json'), JSON.stringify(ids, null, 2));
    console.log('Test fixtures written:', ids);
}

main().finally(() => prisma.$disconnect());
