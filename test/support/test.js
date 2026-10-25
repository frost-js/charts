import process from 'node:process';
import { test as base, expect } from '@playwright/test';
import { addCoverageReport } from 'monocart-reporter';

const collectCoverage = process.env.FROST_CHARTS_COVERAGE === 'true';

const test = base.extend({
    chartPage: [
        async ({ page }, use, testInfo) => {
            const errors = [];

            page.on('pageerror', (error) => errors.push(error.message));

            if (collectCoverage) {
                await page.coverage.startJSCoverage({ resetOnNavigation: false });
            }

            await page.goto('/');

            await page.evaluate(() => {
                document.body.innerHTML = '<div id="chart" style="width:600px;height:400px"></div>';
                window.chart = null;

                window.makeChart = (settings = {}) => {
                    window.chart?.dispose();

                    window.chart = new Chart(document.getElementById('chart'), {
                        animation: { duration: 0 },
                        title: { display: false },
                        legend: { display: false },
                        scales: {
                            x: { display: false },
                            y: { display: false },
                        },
                        data: {
                            labels: ['A', 'B'],
                            datasets: [
                                {
                                    label: 'Sales',
                                    data: [10, 20],
                                    backgroundColor: ['#ff0000', '#0000ff'],
                                    borderWidth: 0,
                                },
                            ],
                        },
                        ...settings,
                    });
                };
            });

            await use();

            if (collectCoverage) {
                const coverage = await page.coverage.stopJSCoverage();

                await addCoverageReport(coverage, testInfo);
            }

            expect(errors, 'Uncaught browser errors').toEqual([]);
        },
        { auto: true },
    ],
});

export { expect, test };
