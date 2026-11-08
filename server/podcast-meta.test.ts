import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  safeHttpUrl, parsePodcastMeta, visibleListenLinks, visibleBadges, isOnHiatus, LISTEN_PLATFORMS,
} from './podcast-meta.js';
import type { PodcastMeta } from './podcast-meta.js';

test('blank, whitespace and missing links are hidden', () => {
  const links = visibleListenLinks({
    listenLinks: { apple: 'https://podcasts.apple.com/x', spotify: '', youtube: '   ' },
    extraLinks: [{ label: 'Station', url: '' }, { label: '', url: 'https://a.org' }],
  });
  assert.deepEqual(links.map(l => l.key), ['apple']);
});

test('every named platform shows when filled, in list order', () => {
  const listenLinks = Object.fromEntries(LISTEN_PLATFORMS.map(p => [p.key, `https://${p.key}.example.com/show`]));
  const links = visibleListenLinks({ listenLinks });
  assert.deepEqual(links.map(l => l.key), LISTEN_PLATFORMS.map(p => p.key));
});

test('extra links show after the named platforms', () => {
  const links = visibleListenLinks({
    listenLinks: { spotify: 'https://open.spotify.com/show/1' },
    extraLinks: [{ label: 'Station archive', url: 'https://zeno.fm/x' }],
  });
  assert.deepEqual(links.map(l => l.label), ['Spotify', 'Station archive']);
});

test('only http(s) links survive — no javascript:, data: or junk', () => {
  for (const bad of ['javascript:alert(1)', 'JavaScript:alert(1)', 'data:text/html,x', 'ftp://a.org',
                     'not a url', 'localhost', 'mailto:a@b.org']) {
    assert.equal(safeHttpUrl(bad), null, bad);
  }
  assert.equal(safeHttpUrl('https://a.org/x'), 'https://a.org/x');
  assert.equal(safeHttpUrl('iam4.me/podcast'), 'https://iam4.me/podcast');
});

test('unreadable metadata gives an empty object, never throws', () => {
  for (const raw of [null, undefined, '', '{bad', '[1,2]', 'null', '"text"']) {
    assert.deepEqual(parsePodcastMeta(raw), {}, String(raw));
  }
});

test('badges show in fixed order and unknown keys are ignored', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const badges = visibleBadges({ badges: ['steward', 'bogus' as any, 'founder'] });
  assert.deepEqual(badges.map(b => b.label), ['Network Founder', 'Network Steward']);
});

test('only status "hiatus" shows On Hiatus', () => {
  assert.equal(isOnHiatus({ status: 'hiatus' }), true);
  assert.equal(isOnHiatus({ status: 'active' }), false);
  assert.equal(isOnHiatus({}), false);
});

test('cleanPodcastMeta drops blanks, fixes links, keeps unknown keys', async () => {
  const { cleanPodcastMeta } = await import('./podcast-meta.js');
  const out = cleanPodcastMeta({
    rssUrl: '  feed.podbean.com/x/feed.xml ', location: ' Washington, DC ', frequency: '', union: '   ',
    status: 'active',
    badges: ['founder', 'founder', 'bogus' as never],
    listenLinks: { apple: 'https://podcasts.apple.com/1', spotify: '  ', youtube: 'javascript:alert(1)' },
    extraLinks: [{ label: ' Station ', url: 'zeno.fm/x' }, { label: 'Empty', url: '' }],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/X',
  });
  assert.deepEqual(out, {
    rssUrl: 'https://feed.podbean.com/x/feed.xml',
    location: 'Washington, DC',
    status: 'active',
    badges: ['founder'],
    listenLinks: { apple: 'https://podcasts.apple.com/1' },
    extraLinks: [{ label: 'Station', url: 'https://zeno.fm/x' }],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/X',
  });
});

test('cleanPodcastMeta: anything but "hiatus" saves as active', async () => {
  const { cleanPodcastMeta } = await import('./podcast-meta.js');
  assert.equal(cleanPodcastMeta({ status: 'hiatus' }).status, 'hiatus');
  assert.equal(cleanPodcastMeta({ status: 'paused' as never }).status, 'active');
  assert.equal(cleanPodcastMeta({} as PodcastMeta).status, 'active');
});

test('cleanPodcastPrivate keeps only filled-in fields', async () => {
  const { cleanPodcastPrivate } = await import('./podcast-meta.js');
  assert.deepEqual(cleanPodcastPrivate({ contactName: ' Pat ', contactEmail: '', contactPhone: '  ' }), { contactName: 'Pat' });
});
