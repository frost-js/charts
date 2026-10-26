import { expect, test } from '#test';
import { setupChart } from '../setup/chart.js';
import { getPixel } from '../support/canvas.js';

test.describe('Circular charts', () => {
    test.beforeEach(setupChart);

    test.describe('pie', () => {
        test('pie preserves combined datasets and individual slice colors', async ({ page }) => {
            await page.evaluate(() => {
                window.createChart({
                    type: 'pie',
                    data: {
                        labels: ['A', 'B'],
                        datasets: [
                            {
                                label: 'Outer',
                                data: [1, 1],
                                backgroundColor: ['red', 'blue'],
                                borderWidth: 0,
                            },
                            {
                                label: 'Inner',
                                data: [1, 1],
                                backgroundColor: ['lime', 'yellow'],
                                borderWidth: 0,
                            },
                        ],
                    },
                });
            });

            const canvas = page.locator('canvas');

            expect(await getPixel(canvas, 400, 300)).toEqual([255, 0, 0, 255]);
            expect(await getPixel(canvas, 200, 300)).toEqual([0, 0, 255, 255]);
            expect(await getPixel(canvas, 200, 100)).toEqual([0, 255, 0, 255]);
            expect(await getPixel(canvas, 400, 100)).toEqual([255, 255, 0, 255]);

            const rect = await page.locator('canvas').boundingBox();

            await page.mouse.move(rect.x + 200, rect.y + 100);
            await expect(page.locator('canvas')).toHaveAttribute('aria-description', 'A. Inner: 1');
        });
    });

    test.describe('donut', () => {
        test('donut cutout stays transparent and is excluded from hover regions', async ({ page }) => {
            await page.evaluate(() => window.createChart({ type: 'donut' }));

            const canvas = page.locator('canvas');
            const bounds = await canvas.boundingBox();
            const center = await canvas.evaluate((node) => node.getContext('2d').getImageData(300, 200, 1, 1).data[3]);

            expect(center).toBe(0);

            await page.mouse.move(bounds.x + 430, bounds.y + 270);
            await expect(canvas).toHaveAttribute('aria-description', 'A. Sales: 10');

            await page.mouse.move(bounds.x + 300, bounds.y + 200);
            await expect(canvas).not.toHaveAttribute('aria-description');

            await page.evaluate(() => window.chart.setSettings({ cutout: 0 }));
            await page.mouse.move(bounds.x + 320, bounds.y + 210);
            await expect(canvas).toHaveAttribute('aria-description', 'A. Sales: 10');
        });

        for (const { name, cutout, expected } of [
            { name: 'numeric strings', cutout: '.4', expected: .4 },
            { name: 'negative values', cutout: -1, expected: .6 },
            { name: 'a fully cut-out circle', cutout: 1, expected: .6 },
            { name: 'NaN', cutout: NaN, expected: .6 },
        ]) {
            test(`normalizes donut cutout for ${name}`, async ({ page }) => {
                await page.evaluate((cutout) => {
                    window.createChart({ type: 'donut' });
                    window.chart.setSettings({ cutout });
                }, cutout);

                expect(await page.evaluate(() => window.chart.options.cutout)).toBe(expected);
            });
        }
    });

    test.describe('donut data boundaries', () => {
        test('renders empty data with a finite scale', async ({ page }) => {
            await page.evaluate(() => window.createChart({
                type: 'donut', data: { labels: [], datasets: [] },
            }));

            expect(await page.evaluate(() => window.chart.getValues())).toEqual([]);

            const scale = await page.evaluate(() => window.chart.getScale());

            expect(scale.length).toBeGreaterThanOrEqual(2);

            for (const [index, tick] of scale.entries()) {
                expect(Number.isFinite(tick), `Tick ${index}`).toBe(true);
            }
        });

        test('updates empty data to zero values', async ({ page }) => {
            await page.evaluate(() => {
                window.createChart({ type: 'donut', data: { labels: [], datasets: [] } });
                window.chart.setData({ labels: ['Only'], datasets: [{ data: [0] }] });
            });

            expect(await page.evaluate(() => window.chart.getLabels())).toEqual(['Only']);
            expect(await page.evaluate(() => window.chart.getValues())).toEqual([0]);

            const scale = await page.evaluate(() => window.chart.getScale());

            expect(scale.length).toBeGreaterThanOrEqual(2);

            for (const [index, tick] of scale.entries()) {
                expect(Number.isFinite(tick), `Tick ${index}`).toBe(true);
            }
        });

        for (const { name, value, message } of [
            { name: 'NaN values', value: NaN, message: 'Dataset 0 values must be finite numbers.' },
            { name: 'infinite values', value: Infinity, message: 'Dataset 0 values must be finite numbers.' },
            { name: 'negative values', value: -1, message: 'Dataset 0 circular and radial values must be nonnegative.' },
        ]) {
            test(`rejects ${name} without replacing existing data`, async ({ page }) => {
                await page.evaluate(() => window.createChart({
                    type: 'donut',
                    data: { labels: ['Only'], datasets: [{ data: [0] }] },
                }));

                await expect(page.evaluate((value) => window.chart.setData({
                    labels: ['Bad'], datasets: [{ data: [value] }],
                }), value)).rejects.toThrow(message);

                expect(await page.evaluate(() => window.chart.getLabels())).toEqual(['Only']);
                expect(await page.evaluate(() => window.chart.getValues())).toEqual([0]);
            });
        }
    });
});
