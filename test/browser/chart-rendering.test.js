import { expect, test } from '#test';
import { setupChart } from '../setup/chart.js';

test.describe('Chart rendering', () => {
    test.beforeEach(setupChart);

    test.describe('data geometry', () => {
        for (const type of ['bar', 'line', 'pie']) {
            test(`${type} renders visible data and supports pointer tooltips`, async ({ page }) => {
                const result = await page.evaluate((type) => {
                    window.makeChart({ type });

                    const canvas = document.querySelector('canvas');
                    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;

                    return {
                        painted: pixels.some((value) => value !== 0),
                        labels: window.chart.getLabels(),
                        values: window.chart.getValues(),
                    };
                }, type);

                expect(result).toEqual({ painted: true, labels: ['A', 'B'], values: [10, 20] });

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

            test(`${type} handles empty, zero, and single-value datasets`, async ({ page }) => {
                await page.evaluate((type) => {
                    window.makeChart({ type, data: { labels: [], datasets: [] } });

                    for (const data of [
                        { labels: ['Only'], datasets: [] },
                        { labels: ['Only'], datasets: [{ data: [0] }] },
                        { labels: ['Only'], datasets: [{ data: [3] }] },
                    ]) {
                        window.chart.setData(data);
                        window.chart.render();

                        if (!window.chart.getScale().every(Number.isFinite)) {
                            throw new Error('Nonfinite scale');
                        }
                    }
                }, type);

                await expect(page.locator('canvas')).toHaveAttribute('aria-label', /Only 3/);
            });
        }

        test('negative and positive bars extend on opposite sides of zero', async ({ page }) => {
            const result = await page.evaluate(() => {
                window.makeChart({
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

        test('pie preserves combined datasets and individual slice colors', async ({ page }) => {
            const result = await page.evaluate(() => {
                window.makeChart({
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
                const context = document.querySelector('canvas').getContext('2d');
                const points = [[400, 300], [200, 300], [200, 100], [400, 100]];

                return points.map(([x, y]) => [...context.getImageData(x, y, 1, 1).data]);
            });

            expect(result).toEqual([[255, 0, 0, 255], [0, 0, 255, 255], [0, 255, 0, 255], [255, 255, 0, 255]]);
            const rect = await page.locator('canvas').boundingBox();
            await page.mouse.move(rect.x + 200, rect.y + 100);
            await expect(page.locator('canvas')).toHaveAttribute('aria-description', 'A. Inner: 1');
        });

        test('single-point line renders a centered point', async ({ page }) => {
            await page.evaluate(() => window.makeChart({
                type: 'line',
                data: { labels: ['Only'], datasets: [{ data: [0] }] },
            }));
            const rect = await page.locator('canvas').boundingBox();
            await page.mouse.move(rect.x + 300, rect.y + 380);
            await expect(page.locator('canvas')).toHaveAttribute('aria-description', 'Only. Dataset 1: 0');
        });

        test('disabled axes leave empty charts blank', async ({ page }) => {
            const painted = await page.evaluate(() => {
                window.makeChart({ data: { labels: ['A'], datasets: [] } });

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

                    window.makeChart({
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
                window.makeChart({
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
});
