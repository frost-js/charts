import { expect, test } from '#test';
import { setupChart } from '../setup/chart.js';

test.describe('Cartesian charts', () => {
    test.beforeEach(setupChart);

    test.describe('bar', () => {
        test('negative and positive bars extend on opposite sides of zero', async ({ page }) => {
            const result = await page.evaluate(() => {
                window.createChart({
                    data: {
                        labels: ['Negative', 'Positive'],
                        datasets: [
                            {
                                data: [-10, 10],
                                backgroundColor: ['red', 'blue'],
                                borderWidth: 0,
                            },
                        ],
                    },
                });

                const context = document.querySelector('canvas').getContext('2d');
                const points = [[160, 290], [440, 110], [160, 110], [440, 290]];

                return points.map(([x, y]) => [...context.getImageData(x, y, 1, 1).data]);
            });

            expect(result).toEqual([[255, 0, 0, 255], [0, 0, 255, 255], [0, 0, 0, 0], [0, 0, 0, 0]]);
        });

        test('horizontal bars use a numeric x axis and top-to-bottom category labels', async ({ page }) => {
            const ticks = await page.evaluate(() => {
                const x = [];
                const y = [];

                window.createChart({
                    orientation: 'horizontal',
                    scales: {
                        x: {
                            ticks: {
                                callback: (value) => {
                                    x.push(value);

                                    return value;
                                },
                            },
                        },
                        y: {
                            ticks: {
                                callback: (value) => {
                                    y.push(value);

                                    return value;
                                },
                            },
                        },
                    },
                });

                return { x, y };
            });

            expect(ticks.x).toContain(0);
            expect(ticks.x).toContain(20);
            expect(ticks.y).toEqual(['A', 'B']);
        });

        test('horizontal bar hit regions follow the top-to-bottom category order', async ({ page }) => {
            await page.evaluate(() => window.createChart({ orientation: 'horizontal', tooltip: { position: 'fixed' } }));

            const canvas = page.locator('canvas');
            const bounds = await canvas.boundingBox();

            await page.mouse.move(bounds.x + 160, bounds.y + 110);
            await expect(canvas).toHaveAttribute('aria-description', 'A. Sales: 10');
            await page.mouse.move(bounds.x + 500, bounds.y + 290);
            await expect(canvas).toHaveAttribute('aria-description', 'B. Sales: 20');
        });

        for (const orientation of ['vertical', 'horizontal']) {
            test(`${orientation} stacks separate positive and negative totals and rescale hidden datasets`, async ({ page }) => {
                const result = await page.evaluate((direction) => {
                    window.createChart({
                        orientation: direction,
                        stacked: true,
                        data: {
                            labels: ['A'],
                            datasets: [
                                { data: [10], backgroundColor: '#ff0000', borderWidth: 0 },
                                { data: [20], backgroundColor: '#00ff00', borderWidth: 0 },
                                { data: [-5], backgroundColor: '#0000ff', borderWidth: 0 },
                                { data: [-10], backgroundColor: '#ff00ff', borderWidth: 0 },
                            ],
                        },
                    });

                    const min = window.chart.getScaleMin();
                    const max = window.chart.getScaleMax();
                    const context = document.querySelector('canvas').getContext('2d');
                    const samples = [5, 20, -2, -10].map((value) => {
                        const fraction = (value - min) / (max - min);
                        const x = direction === 'horizontal' ? 20 + fraction * 560 : 300;
                        const y = direction === 'horizontal' ? 200 : 380 - fraction * 360;

                        return Array.from(context.getImageData(x, y, 1, 1).data);
                    });

                    window.chart.setDatasetVisibility(1, false);

                    return { min, max, samples, hiddenMax: window.chart.getScaleMax() };
                }, orientation);

                expect(result.min).toBeLessThanOrEqual(-15);
                expect(result.max).toBeGreaterThanOrEqual(30);
                expect(result.hiddenMax).toBeLessThan(30);
                expect(result.samples).toEqual([
                    [255, 0, 0, 255], [0, 255, 0, 255], [0, 0, 255, 255], [255, 0, 255, 255],
                ]);
            });
        }

        test('overflowing stacks leave the existing data intact', async ({ page }) => {
            await page.evaluate(() => window.createChart());

            await expect(page.evaluate(() => {
                window.chart.setSettings({
                    stacked: true,
                    data: {
                        labels: ['A'],
                        datasets: [
                            { data: [Number.MAX_VALUE] },
                            { data: [Number.MAX_VALUE] },
                        ],
                    },
                });
            })).rejects.toThrow('Stack totals must be finite numbers.');

            expect(await page.evaluate(() => window.chart.getValues())).toEqual([10, 20]);
        });
    });

    test.describe('line', () => {
        test('single-point line renders a centered point', async ({ page }) => {
            await page.evaluate(() => window.createChart({
                type: 'line',
                data: { labels: ['Only'], datasets: [{ data: [0] }] },
            }));

            const rect = await page.locator('canvas').boundingBox();

            await page.mouse.move(rect.x + 300, rect.y + 380);
            await expect(page.locator('canvas')).toHaveAttribute('aria-description', 'Only. Dataset 1: 0');
        });
    });

    test.describe('area', () => {
        test('area fills both sides of zero without painting above the series', async ({ page }) => {
            const pixels = await page.evaluate(() => {
                window.createChart({
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

    test.describe('scatter', () => {
        test('scatter uses numeric x positions, independent dataset lengths, and coordinate tooltips', async ({ page }) => {
            const state = await page.evaluate(() => {
                window.createChart({
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

                window.createChart({
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
        for (const type of ['area', 'scatter']) {
            test.describe(type, () => {
                test('renders empty data with a finite scale', async ({ page }) => {
                    await page.evaluate((type) => window.createChart({
                        type, data: { labels: [], datasets: [] },
                    }), type);

                    expect(await page.evaluate(() => window.chart.getValues())).toEqual([]);
                    expect(await page.evaluate(() => window.chart.getScale().every(Number.isFinite))).toBe(true);
                });

                test('updates empty data to zero values', async ({ page }) => {
                    await page.evaluate((type) => {
                        const value = type === 'scatter' ? { x: 0, y: 0 } : 0;

                        window.createChart({ type, data: { labels: [], datasets: [] } });
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

                for (const { name, value } of invalid) {
                    test(`rejects ${name} without replacing existing data`, async ({ page }) => {
                        await page.evaluate((type) => window.createChart({
                            type,
                            data: {
                                labels: ['Only'],
                                datasets: [{ data: [type === 'scatter' ? { x: 0, y: 0 } : 0] }],
                            },
                        }), type);

                        let message = 'Dataset 0 values must be finite numbers.';

                        if (type === 'scatter') {
                            message = 'Dataset 0 points must have finite x and y coordinates.';
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
