import { expect, test } from '#test';
import { setupChart } from '../setup/chart.js';

test.describe('Chart bar and radial options', () => {
    test.beforeEach(setupChart);

    test.describe('bar orientation and stacking', () => {
        test('horizontal bars use a numeric x axis and top-to-bottom category labels', async ({ page }) => {
            const ticks = await page.evaluate(() => {
                const x = [];
                const y = [];

                window.makeChart({
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
            await page.evaluate(() => window.makeChart({ orientation: 'horizontal', tooltip: { position: 'fixed' } }));

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
                    window.makeChart({
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
            await page.evaluate(() => window.makeChart());

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

    test.describe('radial geometry', () => {
        test('polar area uses equal sectors with radii proportional to values', async ({ page }) => {
            const pixels = await page.evaluate(() => {
                window.makeChart({ type: 'polarArea', scales: { r: { display: false } } });

                const context = document.querySelector('canvas').getContext('2d');
                const pixel = (x, y) => Array.from(context.getImageData(x, y, 1, 1).data);

                return { first: pixel(340, 180), beyondFirst: pixel(430, 180), second: pixel(140, 200) };
            });

            expect(pixels.first).toEqual([255, 0, 0, 191]);
            expect(pixels.beyondFirst[3]).toBe(0);
            expect(pixels.second).toEqual([0, 0, 255, 191]);

            const canvas = page.locator('canvas');
            const bounds = await canvas.boundingBox();

            await page.mouse.move(bounds.x + 340, bounds.y + 180);
            await expect(canvas).toHaveAttribute('aria-description', 'A. Sales: 10');
        });

        test('radar connects shared category axes and exposes point tooltips', async ({ page }) => {
            const pixels = await page.evaluate(() => {
                window.makeChart({
                    type: 'radar',
                    scales: { r: { display: false } },
                    data: {
                        labels: ['North', 'East', 'South', 'West'],
                        datasets: [{ label: 'Profile', data: [10, 20, 10, 20], backgroundColor: '#ff0000', pointRadius: 6 }],
                    },
                });

                const context = document.querySelector('canvas').getContext('2d');
                const alpha = (x, y) => context.getImageData(x, y, 1, 1).data[3];

                return { top: alpha(300, 110), right: alpha(480, 200), center: alpha(300, 200), outside: alpha(450, 100) };
            });

            expect(pixels.top).toBe(255);
            expect(pixels.right).toBe(255);
            expect(pixels.center).toBe(51);
            expect(pixels.outside).toBe(0);

            const canvas = page.locator('canvas');
            const bounds = await canvas.boundingBox();

            await page.mouse.move(bounds.x + 300, bounds.y + 110);
            await expect(canvas).toHaveAttribute('aria-description', 'North. Profile: 10');
        });
    });

    test.describe('radial scales', () => {
        for (const type of ['radar', 'polarArea']) {
            test(`${type} centers radial tick labels above the data fills`, async ({ page }) => {
                const labels = await page.evaluate((chartType) => {
                    const recorded = [];
                    const fillText = CanvasRenderingContext2D.prototype.fillText;

                    CanvasRenderingContext2D.prototype.fillText = function(text, x, y, ...args) {
                        if (String(text).startsWith('tick:')) {
                            recorded.push({ text, x, y, align: this.textAlign, baseline: this.textBaseline });
                        }

                        return fillText.call(this, text, x, y, ...args);
                    };

                    window.makeChart({
                        type: chartType,
                        scales: { r: { ticks: { callback: (value) => `tick:${value}` } } },
                    });

                    CanvasRenderingContext2D.prototype.fillText = fillText;

                    return recorded;
                }, type);

                expect(labels.length).toBeGreaterThan(1);
                for (const label of labels) {
                    expect(label.align, String(label.text)).toBe('center');
                    expect(label.baseline, String(label.text)).toBe('middle');
                }

                expect(new Set(labels.map((label) => label.x)).size).toBe(1);
            });
        }
    });

    test.describe('radial data boundaries', () => {
        for (const type of ['radar', 'polarArea']) {
            test.describe(type, () => {
                test('updates empty data to zero values', async ({ page }) => {
                    await page.evaluate((type) => window.makeChart({ type, data: { labels: [], datasets: [] } }), type);

                    expect(await page.evaluate(() => window.chart.getValues())).toEqual([]);

                    await page.evaluate(() => window.chart.setData({ labels: ['Only'], datasets: [{ data: [0] }] }));

                    expect(await page.evaluate(() => window.chart.getValues())).toEqual([0]);
                });

                test('resizes zero-valued data in a narrow container', async ({ page }) => {
                    await page.evaluate((type) => {
                        window.makeChart({ type, data: { labels: ['Only'], datasets: [{ data: [0] }] } });
                        document.getElementById('chart').style.width = '60px';
                        document.getElementById('chart').style.height = '60px';
                        window.chart.resize();
                    }, type);

                    await expect(page.locator('canvas')).toHaveAttribute('width', '60');
                    expect(await page.evaluate(() => window.chart.getValues())).toEqual([0]);
                });

                test('rejects negative values without replacing existing data', async ({ page }) => {
                    await page.evaluate((type) => window.makeChart({
                        type, data: { labels: ['Only'], datasets: [{ data: [0] }] },
                    }), type);

                    await expect(page.evaluate(() => window.chart.setData({
                        labels: ['Bad'], datasets: [{ data: [-1] }],
                    }))).rejects.toThrow('Dataset 0 circular and radial values must be nonnegative.');

                    expect(await page.evaluate(() => window.chart.getLabels())).toEqual(['Only']);
                    expect(await page.evaluate(() => window.chart.getValues())).toEqual([0]);
                });
            });
        }
    });
});
