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

        test('donut cutout falls back for invalid values and accepts numeric strings', async ({ page }) => {
            const cutouts = await page.evaluate(() => {
                window.makeChart({ type: 'donut' });

                return [-1, 1, NaN, '.4'].map((cutout) => {
                    window.chart.setSettings({ cutout });

                    return window.chart.options.cutout;
                });
            });

            expect(cutouts).toEqual([.6, .6, .6, .4]);
        });
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

                const copy = window.chart.getData();

                copy[0].data[1].x = 99;

                const context = document.querySelector('canvas').getContext('2d');

                return {
                    valuesX: window.chart.getValues('x'),
                    valuesY: window.chart.getValues(),
                    pointAlpha: context.getImageData(244, 200, 1, 1).data[3],
                    betweenAlpha: context.getImageData(132, 290, 1, 1).data[3],
                };
            });

            expect(state).toEqual({
                valuesX: [0, 4, 10, 8],
                valuesY: [0, 5, 10, 1],
                pointAlpha: 255,
                betweenAlpha: 0,
            });

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
            test(`${type} handles empty and zero data and rejects invalid updates atomically`, async ({ page }) => {
                const state = await page.evaluate((chartType) => {
                    const value = chartType === 'scatter' ? { x: 0, y: 0 } : 0;

                    window.makeChart({ type: chartType, data: { labels: [], datasets: [] } });
                    window.chart.setData({ labels: ['Only'], datasets: [{ data: [value] }] });

                    const invalid = chartType === 'scatter' ? [{ x: Infinity, y: 1 }, { x: 1 }] : [NaN, Infinity];

                    if (chartType === 'donut') {
                        invalid.push(-1);
                    }

                    let rejected = 0;

                    for (const badValue of invalid) {
                        try {
                            window.chart.setData({ labels: ['Bad'], datasets: [{ data: [badValue] }] });
                        } catch {
                            rejected++;
                        }
                    }

                    return {
                        rejected,
                        expected: invalid.length,
                        labels: window.chart.getLabels(),
                        values: window.chart.getValues(),
                        finite: window.chart.getScale().every(Number.isFinite),
                    };
                }, type);

                expect(state.rejected).toBe(state.expected);
                expect(state.labels).toEqual(['Only']);
                expect(state.values).toEqual([0]);
                expect(state.finite).toBe(true);
            });
        }
    });

    test.describe('default palette', () => {
        test('the default palette supplies twelve colors before repeating', async ({ page }) => {
            const colors = await page.evaluate(() => {
                window.makeChart({
                    data: {
                        labels: ['A'],
                        datasets: Array.from({ length: 13 }, () => ({ data: [1] })),
                    },
                });

                const series = window.chart.getData().map((dataset) => dataset.backgroundColor[0]);

                window.chart.setSettings({
                    type: 'donut',
                    data: { labels: ['A'], datasets: [{ data: [1] }] },
                });

                return { series, slices: window.chart.getData()[0].backgroundColor };
            });

            expect(new Set(colors.series.slice(0, 12)).size).toBe(12);
            expect(colors.series[12]).toBe(colors.series[0]);
            expect(colors.slices).toEqual(colors.series.slice(0, 12));
        });
    });
});
