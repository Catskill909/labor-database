# Browser tests

Checks the real site in Google Chrome: shareable links, Copy link, Back/Forward,
failed links, link previews, tag clicks and tabs.

```bash
npm run test:browser
```

About a minute. It builds the app, starts it on port **3101** against a
**throwaway test database** (`tests/browser/.tmp/test.db`), runs every check,
and stops. Your real local database (`prisma/dev.db`) is never touched: the
start-up script refuses to run against anything but the test database.

- **Needs Google Chrome installed.** Without it, run
  `npx playwright install chromium` once and remove `channel: 'chrome'` from
  `playwright.config.ts`.
- **Test data** is in `fixtures.ts` — a few known entries (a history item dated
  today, 80 films, a quote, an unpublished film, a title that is an HTML/script
  injection attempt). Add to it when a new check needs a particular case.
- **A failure** prints what it expected and what it found. A trace of the
  failed test is saved under `tests/browser/.tmp/results/`; open it with
  `npx playwright show-trace <file>`.
- `npm test` (no browser) still runs the fast server tests.

Run both before pushing changes to the pages.
