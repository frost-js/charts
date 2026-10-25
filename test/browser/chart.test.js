import { expect, test } from '#test';
import { setupChart } from '../setup/chart.js';

test.describe('Chart', () => {
    test.beforeEach(setupChart);

    test.describe('#init', () => {
        test('creates a standalone chart and registers its container', async ({ page }) => {
            const instance = await page.evaluateHandle(() => Chart.init(document.getElementById('chart')));

            expect(await instance.evaluate((chart) => chart instanceof Chart)).toBe(true);
            expect(await instance.evaluate((chart) => chart.node === document.getElementById('chart'))).toBe(true);
            await expect(page.locator('canvas')).toHaveCount(1);

            expect(await page.evaluate(() => 'UI' in window)).toBe(false);
            expect(await page.evaluate(() => 'fQuery' in window)).toBe(false);
        });

        test('reuses the registered chart', async ({ page }) => {
            const instance = await page.evaluateHandle(() => Chart.init(document.getElementById('chart')));

            expect(await instance.evaluate((chart) => Chart.init(chart.node) === chart)).toBe(true);
            await expect(page.locator('canvas')).toHaveCount(1);
        });

        test('rejects duplicate construction without replacing the registered chart', async ({ page }) => {
            const instance = await page.evaluateHandle(() => Chart.init(document.getElementById('chart')));

            await expect(page.evaluate(() => new Chart(document.getElementById('chart')))).rejects.toThrow(
                'This container already has a chart. Use Chart.init() to reuse it.',
            );

            expect(await instance.evaluate((chart) => Chart.init(chart.node) === chart)).toBe(true);
            await expect(page.locator('canvas')).toHaveCount(1);
        });

        test('cleans up failed construction and allows initialization afterward', async ({ page }) => {
            await expect(page.evaluate(() => new Chart(document.getElementById('chart'), {
                type: 'pie',
                data: { labels: ['A'], datasets: [{ data: [-1] }] },
            }))).rejects.toThrow('Dataset 0 circular and radial values must be nonnegative.');

            await expect(page.locator('canvas')).toHaveCount(0);

            const instance = await page.evaluateHandle(() => Chart.init(document.getElementById('chart')));

            expect(await instance.evaluate((chart) => chart instanceof Chart)).toBe(true);
            expect(await instance.evaluate((chart) => Chart.init(chart.node) === chart)).toBe(true);
            await expect(page.locator('canvas')).toHaveCount(1);
        });
    });

    test.describe('#resize', () => {
        test('tracks changes to the container dimensions', async ({ page }) => {
            await page.evaluate(() => {
                window.makeChart();

                const node = document.getElementById('chart');

                node.style.width = '350px';
                node.style.height = '240px';
            });

            await expect(page.locator('canvas')).toHaveAttribute('width', '350');
            await expect(page.locator('canvas')).toHaveAttribute('height', '240');
        });

        test('hidden chart recovers when shown and supports manual resize', async ({ page }) => {
            await page.evaluate(() => {
                document.getElementById('chart').style.display = 'none';
                window.makeChart({ responsive: false });
                document.getElementById('chart').style.display = '';
                window.chart.resize();
            });

            await expect(page.locator('canvas')).toHaveAttribute('width', '600');
        });

        test('auto-height containers stabilize across repeated resizes', async ({ page }) => {
            await page.evaluate(() => {
                const node = document.getElementById('chart');

                node.style.height = 'auto';
                window.makeChart();
            });

            await expect(page.locator('canvas')).toHaveAttribute('height', '300');

            await page.evaluate(() => {
                for (let index = 0; index < 10; index++) {
                    window.chart.resize();
                }
            });

            await expect(page.locator('canvas')).toHaveAttribute('height', '300');
        });

        test('enabling responsive sizing measures changes made while it was disabled', async ({ page }) => {
            await page.evaluate(() => {
                window.makeChart({ responsive: false });
                document.getElementById('chart').style.width = '320px';
            });

            await expect(page.locator('canvas')).toHaveAttribute('width', '600');

            await page.evaluate(() => window.chart.setSettings({ responsive: true }));

            await expect(page.locator('canvas')).toHaveAttribute('width', '320');
        });

        test.describe('high DPI', () => {
            test.use({ deviceScaleFactor: 2 });

            test('high DPI uses a larger backing canvas without changing hit coordinates', async ({ page }) => {
                await page.evaluate(() => {
                    new Chart(document.getElementById('chart'), {
                        data: { labels: ['A'], datasets: [{ data: [1] }] },
                        legend: { display: false },
                        scales: { x: { display: false }, y: { display: false } },
                    });
                });

                await expect(page.locator('canvas')).toHaveAttribute('width', '1200');
                const rect = await page.locator('canvas').boundingBox();
                await page.mouse.move(rect.x + 300, rect.y + 200);
                await expect(page.locator('canvas')).toHaveAttribute('aria-description', 'A. Dataset 1: 1');
            });
        });
    });

    test.describe('#dispose', () => {
        test.beforeEach(async ({ page }) => {
            await page.evaluate(() => {
                document.getElementById('chart').innerHTML = '<span id="original">Original content</span>';
                window.makeChart();
            });
        });

        test('removes generated markup and preserves original children', async ({ page }) => {
            await page.evaluate(() => window.chart.dispose());

            expect(await page.evaluate(() => window.chart.node)).toBeNull();
            expect(await page.evaluate(() => window.chart.options)).toBeNull();
            await expect(page.locator('canvas')).toHaveCount(0);
            await expect(page.locator('#chart > *')).toHaveCount(1);
            await expect(page.locator('#original')).toHaveText('Original content');
        });

        test('allows repeated disposal and rendering calls after disposal', async ({ page }) => {
            await page.evaluate(() => {
                window.chart.dispose();
                window.chart.dispose();
                window.chart.update();
                window.chart.render();
                window.chart.resize();
            });

            expect(await page.evaluate(() => window.chart.node)).toBeNull();
            await expect(page.locator('canvas')).toHaveCount(0);
        });

        test('releases listeners on the removed canvas and window', async ({ page }) => {
            await page.evaluate(() => {
                const canvas = document.querySelector('canvas');

                window.chart.dispose();

                // These listeners would access cleared state if disposal left them attached.
                canvas.dispatchEvent(new PointerEvent('pointerleave'));
                window.dispatchEvent(new Event('resize'));
            });

            await expect(page.locator('canvas')).toHaveCount(0);
        });

        test('releases registration so the container can be reused', async ({ page }) => {
            const previous = await page.evaluateHandle(() => window.chart);

            await page.evaluate(() => {
                window.chart.dispose();
                window.chart = Chart.init(document.getElementById('chart'));
            });

            expect(await previous.evaluate((chart) => chart.node)).toBeNull();
            expect(await previous.evaluate((chart) => window.chart === chart)).toBe(false);
            expect(await page.evaluate(() => Chart.init(document.getElementById('chart')) === window.chart)).toBe(true);
            await expect(page.locator('canvas')).toHaveCount(1);
        });
    });
});
