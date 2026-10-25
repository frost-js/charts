import { expect, test } from '#test';
import { setupChart } from '../setup/chart.js';

test.describe('Chart variants', () => {
    test.beforeEach(setupChart);

    test.describe('area', () => {
        test('area fills both sides of zero without painting above the series', async ({ page }) => {
            const pixels = await page.evaluate(() => {
                window.makeChart({
                    type: 'area',
                    data: {
                        labels: ['Loss', 'Gain'],
                        datasets: [{ data: [-10, 10], backgroundColor: '#ff0000', borderWidth: 0 }],
                    },
                });

                const context = document.querySelector('canvas').getContext('2d');
                const pixel = (x, y) => Array.from(context.getImageData(x, y, 1, 1).data);

                return {
                    negative: pixel(160, 250),
                    positive: pixel(440, 150),
                    outside: pixel(160, 100),
                };
            });

            expect(pixels.negative).toEqual([255, 0, 0, 51]);
            expect(pixels.positive).toEqual([255, 0, 0, 51]);
            expect(pixels.outside[3]).toBe(0);
        });
    });

    test.describe('donut', () => {
        test('donut cutout stays transparent and is excluded from hover regions', async ({ page }) => {
            await page.evaluate(() => window.makeChart({ type: 'donut' }));

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
                    window.makeChart({ type: 'donut' });
                    window.chart.setSettings({ cutout });
                }, cutout);

                expect(await page.evaluate(() => window.chart.options.cutout)).toBe(expected);
            });
        }
    });

    test.describe('scatter', () => {
        test('scatter uses numeric x positions, independent dataset lengths, and coordinate tooltips', async ({ page }) => {
            const state = await page.evaluate(() => {
                window.makeChart({
                    type: 'scatter',
                    data: {
                        datasets: [
                            { label: 'Samples', data: [{ x: 0, y: 0 }, { x: 4, y: 5 }, { x: 10, y: 10 }] },
                            { label: 'Reference', data: [{ x: 8, y: 1 }] },
                        ],
                    },
                });

                const context = document.querySelector('canvas').getContext('2d');

                return {
                    valuesX: window.chart.getValues('x'),
                    valuesY: window.chart.getValues(),
                    pointAlpha: context.getImageData(244, 200, 1, 1).data[3],
                    betweenAlpha: context.getImageData(132, 290, 1, 1).data[3],
                };
            });

            expect(state.valuesX).toEqual([0, 4, 10, 8]);
            expect(state.valuesY).toEqual([0, 5, 10, 1]);
            expect(state.pointAlpha).toBe(255);
            expect(state.betweenAlpha).toBe(0);

            const canvas = page.locator('canvas');
            const bounds = await canvas.boundingBox();

            await page.mouse.move(bounds.x + 244, bounds.y + 200);
            await expect(canvas).toHaveAttribute('aria-description', 'Point 2. Samples: (4, 5)');
            await expect(canvas).toHaveAttribute('aria-label', /Point 2 \(4, 5\)/);
        });

        test('scatter axes format numeric ticks and rescale after updates', async ({ page }) => {
            const state = await page.evaluate(() => {
                const ticks = [];

                window.makeChart({
                    type: 'scatter',
                    scales: {
                        x: {
                            display: true,
                            ticks: {
                                callback: (value) => {
                                    ticks.push(value);

                                    return `x=${value}`;
                                },
                            },
                        },
                        y: { display: true },
                    },
                    data: { datasets: [{ data: [{ x: -10, y: -5 }, { x: 10, y: 5 }] }] },
                });

                const original = window.chart.getScale('x');

                window.chart.setData({ datasets: [{ data: [{ x: 100, y: 50 }] }] });

                return {
                    ticks,
                    original,
                    maxX: window.chart.getScaleMax('x'),
                    maxY: window.chart.getScaleMax(),
                };
            });

            expect(state.ticks).toContain(-10);
            expect(state.ticks).toContain(0);
            expect(state.original[0]).toBeLessThanOrEqual(-10);
            expect(state.maxX).toBeGreaterThanOrEqual(100);
            expect(state.maxY).toBeGreaterThanOrEqual(50);
        });
    });

    test.describe('data boundaries', () => {
        for (const type of ['area', 'donut', 'scatter']) {
            test.describe(type, () => {
                test('renders empty data with a finite scale', async ({ page }) => {
                    await page.evaluate((type) => window.makeChart({
                        type, data: { labels: [], datasets: [] },
                    }), type);

                    expect(await page.evaluate(() => window.chart.getValues())).toEqual([]);
                    expect(await page.evaluate(() => window.chart.getScale().every(Number.isFinite))).toBe(true);
                });

                test('updates empty data to zero values', async ({ page }) => {
                    await page.evaluate((type) => {
                        const value = type === 'scatter' ? { x: 0, y: 0 } : 0;

                        window.makeChart({ type, data: { labels: [], datasets: [] } });
                        window.chart.setData({ labels: ['Only'], datasets: [{ data: [value] }] });
                    }, type);

                    expect(await page.evaluate(() => window.chart.getLabels())).toEqual(['Only']);
                    expect(await page.evaluate(() => window.chart.getValues())).toEqual([0]);
                    expect(await page.evaluate(() => window.chart.getScale().every(Number.isFinite))).toBe(true);
                });

                const invalid = type === 'scatter' ? [
                    { name: 'infinite coordinates', value: { x: Infinity, y: 1 } },
                    { name: 'missing coordinates', value: { x: 1 } },
                ] : [
                    { name: 'NaN values', value: NaN },
                    { name: 'infinite values', value: Infinity },
                ];

                if (type === 'donut') {
                    invalid.push({ name: 'negative values', value: -1 });
                }

                for (const { name, value } of invalid) {
                    test(`rejects ${name} without replacing existing data`, async ({ page }) => {
                        await page.evaluate((type) => window.makeChart({
                            type,
                            data: {
                                labels: ['Only'],
                                datasets: [{ data: [type === 'scatter' ? { x: 0, y: 0 } : 0] }],
                            },
                        }), type);

                        let message = 'Dataset 0 values must be finite numbers.';

                        if (type === 'scatter') {
                            message = 'Dataset 0 points must have finite x and y coordinates.';
                        } else if (value === -1) {
                            message = 'Dataset 0 circular and radial values must be nonnegative.';
                        }

                        await expect(page.evaluate((value) => window.chart.setData({
                            labels: ['Bad'], datasets: [{ data: [value] }],
                        }), value)).rejects.toThrow(message);

                        expect(await page.evaluate(() => window.chart.getLabels())).toEqual(['Only']);
                        expect(await page.evaluate(() => window.chart.getValues())).toEqual([0]);
                    });
                }
            });
        }
    });
});
