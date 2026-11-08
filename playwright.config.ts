/**
 * Browser tests: `npm run test:browser`.
 *
 * Builds the app, starts it on port 3101 against a throwaway test database
 * (tests/browser/serve.sh), and drives your installed Google Chrome through
 * the real pages. See tests/browser/README.md.
 */
import { defineConfig } from '@playwright/test';

const PORT = 3101;

export default defineConfig({
    testDir: 'tests/browser',
    // One worker: the run shares one test server. (serve.sh raises the app's
    // per-visitor rate limit for the test copy; at the live 100/minute the
    // later tests were refused.)
    workers: 1,
    timeout: 30_000,
    expect: { timeout: 8_000 },
    reporter: [['list']],
    outputDir: 'tests/browser/.tmp/results',
    use: {
        baseURL: `http://localhost:${PORT}`,
        channel: 'chrome',
        viewport: { width: 1280, height: 850 },
        permissions: ['clipboard-read', 'clipboard-write'],
        trace: 'retain-on-failure',
    },
    webServer: {
        command: 'sh tests/browser/serve.sh',
        url: `http://localhost:${PORT}/api/health`,
        env: { PORT: String(PORT) },
        timeout: 180_000,
        reuseExistingServer: false,
        stdout: 'ignore',
        stderr: 'pipe',
    },
});
