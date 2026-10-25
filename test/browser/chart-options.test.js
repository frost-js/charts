import { expect, test } from '#test';
import { setupChart } from '../setup/chart.js';

test.describe('Chart options', () => {
    test.beforeEach(setupChart);

    test.describe('font option', () => {
        test('normalizes numeric strings in inherited fonts', async ({ page }) => {
            await page.evaluate(() => window.makeChart({ font: { size: '16', lineHeight: '1.5' } }));

            const options = await page.evaluate(() => window.chart.options);

            expect(options.font.size).toBe(16);
            expect(options.font.lineHeight).toBe(1.5);
            expect(options.scales.y.ticks.font.size).toBe(16);
        });

        test('falls back to the default size for an invalid font update', async ({ page }) => {
            await page.evaluate(() => {
                window.makeChart({ font: { size: 16 } });
                window.chart.setSettings({ font: { size: 0 } });
            });

            expect(await page.evaluate(() => window.chart.options.font.size)).toBe(12);
        });
    });

    test.describe('layout option', () => {
        test('normalizes numeric padding strings', async ({ page }) => {
            await page.evaluate(() => window.makeChart({ layout: { padding: '24' } }));

            expect(await page.evaluate(() => window.chart.options.layout.padding)).toBe(24);
        });

        test('falls back to default padding for an invalid update', async ({ page }) => {
            await page.evaluate(() => {
                window.makeChart({ layout: { padding: 24 } });
                window.chart.setSettings({ layout: { padding: 'invalid' } });
            });

            expect(await page.evaluate(() => window.chart.options.layout.padding)).toBe(20);
        });
    });

    test.describe('title option', () => {
        test('falls back to the default position for an unknown edge', async ({ page }) => {
            await page.evaluate(() => window.makeChart({ title: { position: 'unknown' } }));

            expect(await page.evaluate(() => window.chart.options.title.position)).toBe('top');
        });
    });

    test.describe('legend option', () => {
        test('normalizes numeric width and swatch strings', async ({ page }) => {
            await page.evaluate(() => window.makeChart({ legend: { maxWidth: '300', labels: { boxWidth: '18' } } }));

            const legend = await page.evaluate(() => window.chart.options.legend);

            expect(legend.maxWidth).toBe(300);
            expect(legend.labels.boxWidth).toBe(18);
        });
    });

    test.describe('tooltip option', () => {
        test('anchors tooltips to the data mark by default', async ({ page }) => {
            await page.evaluate(() => window.makeChart());

            expect(await page.evaluate(() => window.chart.options.tooltip.position)).toBe('fixed');
        });

        test('clamps negative corner radii and falls back for invalid arrow sizes', async ({ page }) => {
            await page.evaluate(() => window.makeChart({ tooltip: { borderRadius: -1, arrowSize: Infinity } }));

            const tooltip = await page.evaluate(() => window.chart.options.tooltip);

            expect(tooltip.borderRadius).toBe(0);
            expect(tooltip.arrowSize).toBe(5);
        });
    });

    test.describe('dataset options', () => {
        test('normalizes numeric values and point radii', async ({ page }) => {
            await page.evaluate(() => window.makeChart({
                data: { labels: ['A'], datasets: [{ data: ['10'], pointRadius: '3' }] },
            }));

            const dataset = await page.evaluate(() => window.chart.getData()[0]);

            expect(dataset.data).toEqual([10]);
            expect(dataset.pointRadius).toBe(3);
        });

        test('clamps border widths and fill opacity', async ({ page }) => {
            await page.evaluate(() => window.makeChart({
                data: { labels: ['A'], datasets: [{ data: [10], borderWidth: '-1', fillOpacity: 2 }] },
            }));

            const dataset = await page.evaluate(() => window.chart.getData()[0]);

            expect(dataset.borderWidth).toBe(0);
            expect(dataset.fillOpacity).toBe(1);
        });

        test('normalizes scatter coordinates without changing caller data', async ({ page }) => {
            const point = await page.evaluateHandle(() => {
                const point = { x: '2', y: '3' };

                window.makeChart({ type: 'scatter', data: { datasets: [{ data: [point] }] } });

                return point;
            });

            expect(await point.evaluate((value) => value.x)).toBe('2');
            expect(await point.evaluate((value) => value.y)).toBe('3');
            expect(await page.evaluate(() => window.chart.getData()[0].data)).toEqual([{ x: 2, y: 3 }]);
        });
    });

    test.describe('options snapshot', () => {
        test.beforeEach(async ({ page }) => {
            await page.evaluate(() => window.makeChart());
        });

        test('reuses the same snapshot between reads', async ({ page }) => {
            const snapshot = await page.evaluateHandle(() => window.chart.options);

            expect(await snapshot.evaluate((options) => window.chart.options === options)).toBe(true);
        });

        test('freezes nested settings and data', async ({ page }) => {
            const snapshot = await page.evaluateHandle(() => window.chart.options);

            expect(await snapshot.evaluate((options) => Object.isFrozen(options))).toBe(true);
            expect(await snapshot.evaluate((options) => Object.isFrozen(options.font))).toBe(true);
            expect(await snapshot.evaluate((options) => Object.isFrozen(options.data))).toBe(true);
            expect(await snapshot.evaluate((options) => Object.isFrozen(options.data.datasets[0].data))).toBe(true);
        });

        test('does not freeze caller callbacks or component defaults', async ({ page }) => {
            const callback = await page.evaluateHandle(() => {
                const callback = (value) => `$${value}`;

                window.makeChart({ scales: { y: { ticks: { callback } } } });

                return callback;
            });

            expect(await callback.evaluate((value) => Object.isFrozen(value))).toBe(false);
            expect(await page.evaluate(() => Object.isFrozen(Chart.defaults.font))).toBe(false);
        });

        test('replaces the snapshot after data changes and preserves old values', async ({ page }) => {
            const previous = await page.evaluateHandle(() => window.chart.options);

            await page.evaluate(() => window.chart.setData({ labels: ['New'], datasets: [{ data: [5] }] }));

            expect(await previous.evaluate((options) => window.chart.options === options)).toBe(false);
            expect(await previous.evaluate((options) => options.data.datasets[0].data)).toEqual([10, 20]);
            expect(await page.evaluate(() => window.chart.options.data.datasets[0].data)).toEqual([5]);
        });

        test('replaces the snapshot after settings changes and preserves old settings', async ({ page }) => {
            const previous = await page.evaluateHandle(() => window.chart.options);

            await page.evaluate(() => window.chart.setSettings({ font: { size: 16 } }));

            expect(await previous.evaluate((options) => window.chart.options === options)).toBe(false);
            expect(await previous.evaluate((options) => options.font.size)).toBe(12);
            expect(await page.evaluate(() => window.chart.options.font.size)).toBe(16);
        });
    });
});
