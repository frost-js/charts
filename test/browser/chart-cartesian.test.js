import { expect, test } from '#test';
import { setupChart } from '../setup/chart.js';
import { getPixel } from '../support/canvas.js';

test.describe('Cartesian charts', () => {
    test.beforeEach(setupChart);

    test.describe('bar', () => {
        test('negative and positive bars extend on opposite sides of zero', async ({ page }) => {
            await page.evaluate(() => {
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
            });

            const canvas = page.locator('canvas');

            expect(await getPixel(canvas, 160, 290)).toEqual([255, 0, 0, 255]);
            expect(await getPixel(canvas, 440, 110)).toEqual([0, 0, 255, 255]);
            expect(await getPixel(canvas, 160, 110)).toEqual([0, 0, 0, 0]);
            expect(await getPixel(canvas, 440, 290)).toEqual([0, 0, 0, 0]);
        });

        test('horizontal bars use a numeric x axis and top-to-bottom category labels', async ({ page }) => {
            await page.evaluate(() => {
                window.xTicks = [];
                window.yTicks = [];

                window.createChart({
                    orientation: 'horizontal',
                    scales: {
                        x: {
                            ticks: {
                                callback: (value) => {
                                    window.xTicks.push(value);

                                    return value;
                                },
                            },
                        },
                        y: {
                            ticks: {
                                callback: (value) => {
                                    window.yTicks.push(value);

                                    return value;
                                },
                            },
                        },
                    },
                });
            });

            expect(await page.evaluate(() => window.xTicks)).toContain(0);
            expect(await page.evaluate(() => window.xTicks)).toContain(20);
            expect(await page.evaluate(() => window.yTicks)).toEqual(['A', 'B']);
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
                await page.evaluate((direction) => {
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
                }, orientation);

                const minimum = await page.evaluate(() => window.chart.getScaleMin());
                const maximum = await page.evaluate(() => window.chart.getScaleMax());
                const canvas = page.locator('canvas');

                expect(minimum).toBeLessThanOrEqual(-15);
                expect(maximum).toBeGreaterThanOrEqual(30);

                for (const [value, color] of [
                    [5, [255, 0, 0, 255]],
                    [20, [0, 255, 0, 255]],
                    [-2, [0, 0, 255, 255]],
                    [-10, [255, 0, 255, 255]],
                ]) {
                    const fraction = (value - minimum) / (maximum - minimum);
                    const x = orientation === 'horizontal' ? 20 + fraction * 560 : 300;
                    const y = orientation === 'horizontal' ? 200 : 380 - fraction * 360;

                    expect(await getPixel(canvas, x, y), `Stack containing ${value}`).toEqual(color);
                }

                await page.evaluate(() => window.chart.setDatasetVisibility(1, false));

                expect(await page.evaluate(() => window.chart.getScaleMax())).toBeLessThan(30);
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
            await page.evaluate(() => {
                window.createChart({
                    type: 'area',
                    data: {
                        labels: ['Loss', 'Gain'],
                        datasets: [{ data: [-10, 10], backgroundColor: '#ff0000', borderWidth: 0 }],
                    },
                });
            });

            const canvas = page.locator('canvas');

            expect(await getPixel(canvas, 160, 250)).toEqual([255, 0, 0, 51]);
            expect(await getPixel(canvas, 440, 150)).toEqual([255, 0, 0, 51]);
            expect((await getPixel(canvas, 160, 100))[3]).toBe(0);
        });
    });

    test.describe('scatter', () => {
        test('scatter uses numeric x positions, independent dataset lengths, and coordinate tooltips', async ({ page }) => {
            await page.evaluate(() => {
                window.createChart({
                    type: 'scatter',
                    data: {
                        datasets: [
                            { label: 'Samples', data: [{ x: 0, y: 0 }, { x: 4, y: 5 }, { x: 10, y: 10 }] },
                            { label: 'Reference', data: [{ x: 8, y: 1 }] },
                        ],
                    },
                });
            });

            const canvas = page.locator('canvas');

            expect(await page.evaluate(() => window.chart.getValues('x'))).toEqual([0, 4, 10, 8]);
            expect(await page.evaluate(() => window.chart.getValues())).toEqual([0, 5, 10, 1]);
            expect((await getPixel(canvas, 244, 200))[3]).toBe(255);
            expect((await getPixel(canvas, 132, 290))[3]).toBe(0);

            const bounds = await canvas.boundingBox();

            await page.mouse.move(bounds.x + 244, bounds.y + 200);
            await expect(canvas).toHaveAttribute('aria-description', 'Point 2. Samples: (4, 5)');
            await expect(canvas).toHaveAttribute('aria-label', /Point 2 \(4, 5\)/);
        });

        test('scatter axes format numeric ticks and rescale after updates', async ({ page }) => {
            await page.evaluate(() => {
                window.xTicks = [];

                window.createChart({
                    type: 'scatter',
                    scales: {
                        x: {
                            display: true,
                            ticks: {
                                callback: (value) => {
                                    window.xTicks.push(value);

                                    return `x=${value}`;
                                },
                            },
                        },
                        y: { display: true },
                    },
                    data: { datasets: [{ data: [{ x: -10, y: -5 }, { x: 10, y: 5 }] }] },
                });
            });

            expect(await page.evaluate(() => window.xTicks)).toContain(-10);
            expect(await page.evaluate(() => window.xTicks)).toContain(0);
            expect(await page.evaluate(() => window.chart.getScaleMin('x'))).toBeLessThanOrEqual(-10);

            await page.evaluate(() => window.chart.setData({ datasets: [{ data: [{ x: 100, y: 50 }] }] }));

            expect(await page.evaluate(() => window.chart.getScaleMax('x'))).toBeGreaterThanOrEqual(100);
            expect(await page.evaluate(() => window.chart.getScaleMax())).toBeGreaterThanOrEqual(50);
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

                    const scale = await page.evaluate(() => window.chart.getScale());

                    expect(scale.length).toBeGreaterThanOrEqual(2);

                    for (const [index, tick] of scale.entries()) {
                        expect(Number.isFinite(tick), `Tick ${index}`).toBe(true);
                    }
                });

                test('updates empty data to zero values', async ({ page }) => {
                    await page.evaluate((type) => {
                        const value = type === 'scatter' ? { x: 0, y: 0 } : 0;

                        window.createChart({ type, data: { labels: [], datasets: [] } });
                        window.chart.setData({ labels: ['Only'], datasets: [{ data: [value] }] });
                    }, type);

                    expect(await page.evaluate(() => window.chart.getLabels())).toEqual(['Only']);
                    expect(await page.evaluate(() => window.chart.getValues())).toEqual([0]);

                    const scale = await page.evaluate(() => window.chart.getScale());

                    expect(scale.length).toBeGreaterThanOrEqual(2);

                    for (const [index, tick] of scale.entries()) {
                        expect(Number.isFinite(tick), `Tick ${index}`).toBe(true);
                    }
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
