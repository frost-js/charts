/**
 * @import { Page } from '@playwright/test';
 */

/**
 * Creates the chart container and a factory with predictable rendering defaults.
 * @param {{page: Page}} fixtures The Playwright fixtures.
 */
export async function setupChart({ page }) {
    await page.evaluate(() => {
        document.body.innerHTML = '<div id="chart" style="width:600px;height:400px"></div>';
        window.chart = null;

        // Keep construction in the page so tests can supply browser-local formatters.
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
}
