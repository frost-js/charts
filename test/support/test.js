import process from 'node:process';
import { test as base, expect } from '@playwright/test';
import { addCoverageReport } from 'monocart-reporter';
import { setupClock } from '../setup/browser.js';

const collectCoverage = process.env.FROST_CHARTS_COVERAGE === 'true';

const test = base.extend({
    expectedBrowserErrors: [[], { option: true }],
    mockClock: [false, { option: true }],
    chartPage: [
        async ({ page, mockClock, expectedBrowserErrors }, use, testInfo) => {
            const errors = [];

            page.on('pageerror', (error) => errors.push(error.message));

            if (collectCoverage) {
                await page.coverage.startJSCoverage({
                    resetOnNavigation: false,
                });
            }

            if (mockClock) {
                await setupClock(page);
            }

            await page.goto('/', {
                waitUntil: 'domcontentloaded',
            });

            await page.evaluate(() => {
                if (typeof window.Chart !== 'function') {
                    throw new Error('Failed to load Frost Charts on the test page.');
                }

                document.body.replaceChildren();
            });

            await use();

            if (collectCoverage) {
                const coverage = await page.coverage.stopJSCoverage();

                await addCoverageReport(coverage, testInfo);
            }

            expect(errors, 'Uncaught browser errors').toEqual(expectedBrowserErrors);
        },
        { auto: true },
    ],
});

export { expect, test };
