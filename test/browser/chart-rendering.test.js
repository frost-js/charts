import { expect, test } from '#test';
import { setupChart } from '../setup/chart.js';

test.describe('Chart rendering', () => {
    test.beforeEach(setupChart);

    test.describe('data geometry', () => {
        for (const type of ['bar', 'line', 'pie']) {
            test(`${type} renders visible data and supports pointer tooltips`, async ({ page }) => {
                const result = await page.evaluate((type) => {
                    window.createChart({ type });

                    const canvas = document.querySelector('canvas');
                    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;

                    return {
                        painted: pixels.some((value) => value !== 0),
                        labels: window.chart.getLabels(),
                        values: window.chart.getValues(),
                    };
                }, type);

                expect(result.painted).toBe(true);
                expect(result.labels).toEqual(['A', 'B']);
                expect(result.values).toEqual([10, 20]);

                const positions = {
                    bar: [160, 300],
                    line: [20, 200],
                    pie: [400, 260],
                };
                const [x, y] = positions[type];
                const bounds = await page.locator('canvas').boundingBox();

                await page.mouse.move(bounds.x + x, bounds.y + y);
                await expect(page.locator('canvas')).toHaveAttribute('aria-description', 'A. Sales: 10');

                await page.mouse.move(bounds.x + 5, bounds.y + 5);
                await expect(page.locator('canvas')).not.toHaveAttribute('aria-description');
                await expect(page.locator('canvas')).toHaveAttribute('aria-label', /A 10, B 20/);
            });

            for (const { name, data } of [
                { name: 'empty data', data: { labels: [], datasets: [] } },
                { name: 'labels without datasets', data: { labels: ['Only'], datasets: [] } },
                { name: 'zero values', data: { labels: ['Only'], datasets: [{ data: [0] }] } },
                { name: 'a single value', data: { labels: ['Only'], datasets: [{ data: [3] }] } },
            ]) {
                test(`${type} renders ${name} with a finite scale`, async ({ page }) => {
                    await page.evaluate(({ type, data }) => {
                        window.createChart({ type, data });
                        window.chart.render();
                    }, { type, data });

                    const scale = await page.evaluate(() => window.chart.getScale());

                    expect(scale.length).toBeGreaterThanOrEqual(2);

                    for (const [index, tick] of scale.entries()) {
                        expect(Number.isFinite(tick), `Tick ${index}`).toBe(true);
                    }

                    if (data.datasets.length) {
                        await expect(page.locator('canvas')).toHaveAttribute(
                            'aria-label', new RegExp(`Only ${data.datasets[0].data[0]}`),
                        );
                    }
                });
            }
        }

        test('disabled axes leave empty charts blank', async ({ page }) => {
            const painted = await page.evaluate(() => {
                window.createChart({ data: { labels: ['A'], datasets: [] } });

                const canvas = document.querySelector('canvas');
                const context = canvas.getContext('2d');
                const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;

                return pixels.some((value) => value !== 0);
            });

            expect(painted).toBe(false);
        });
    });

    test.describe('title and legend layout', () => {
        for (const position of ['top', 'right', 'bottom', 'left']) {
            test(`lays out title and legend at ${position} with formatters`, async ({ page }) => {
                const result = await page.evaluate((position) => {
                    const labels = [];

                    window.createChart({
                        title: {
                            display: true,
                            text: 'A long title that wraps in narrow containers',
                            position,
                        },
                        legend: {
                            display: true,
                            position,
                        },
                        scales: {
                            x: {
                                ticks: {
                                    callback: (value) => {
                                        labels.push(value);

                                        return `Label ${value}`;
                                    },
                                },
                            },
                            y: {
                                ticks: {
                                    callback: (value) => `$${value}`,
                                },
                            },
                        },
                    });

                    const node = document.getElementById('chart');
                    node.style.width = '80px';
                    node.style.height = '60px';
                    window.chart.resize();
                    return { labels, width: node.querySelector('canvas').width };
                }, position);
                expect(result.labels).toContain('A');
                expect(result.width).toBe(80);
            });
        }

        test('zero-sized legend swatches and limits do not corrupt layout', async ({ page }) => {
            await page.evaluate(() => {
                window.createChart({
                    legend: {
                        display: true,
                        labels: { boxWidth: 0, boxHeight: 0 },
                    },
                });

                window.chart.setSettings({
                    legend: { maxWidth: 0, maxHeight: 0 },
                    layout: { padding: 1000 },
                });
            });

            await expect(page.locator('canvas')).toHaveAttribute('width', '600');
        });
    });

    test.describe('legend alignment', () => {
        for (const position of ['left', 'right']) {
            test(`${position} legends align swatches and labels along a shared edge`, async ({ page }) => {
                const labels = await page.evaluate((legendPosition) => {
                    const recorded = [];
                    const fillText = CanvasRenderingContext2D.prototype.fillText;

                    CanvasRenderingContext2D.prototype.fillText = function(text, x, y, ...args) {
                        if (text === 'Short' || text === 'A longer series name') {
                            recorded.push({ text, x, y });
                        }

                        return fillText.call(this, text, x, y, ...args);
                    };

                    window.createChart({
                        legend: { display: true, position: legendPosition },
                        data: {
                            labels: ['A'],
                            datasets: [{ label: 'Short', data: [1] }, { label: 'A longer series name', data: [2] }],
                        },
                    });

                    CanvasRenderingContext2D.prototype.fillText = fillText;

                    return recorded.slice(0, 2);
                }, position);

                expect(labels[0].x).toBe(labels[1].x);
                expect(labels[0].y).toBeLessThan(labels[1].y);
            });
        }
    });

    test.describe('default palette', () => {
        test('the default palette supplies twelve colors before repeating', async ({ page }) => {
            const colors = await page.evaluate(() => {
                window.createChart({
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
