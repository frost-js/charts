import { expect, test } from '#test';
import { setupChart } from '../setup/chart.js';

test.describe('Chart options', () => {
    test.beforeEach(setupChart);

    test.describe('option merging', () => {
        test('copies nested arrays and plain objects without freezing caller data', async ({ page }) => {
            const input = await page.evaluateHandle(() => {
                const custom = [[1, 2], [{ value: 3 }]];

                window.createChart({ custom });
                custom[0].push(4);
                custom[1][0].value = 5;

                return custom;
            });

            expect(await page.evaluate(() => window.chart.options.custom)).toEqual([[1, 2], [{ value: 3 }]]);
            expect(await input.evaluate((custom) => Object.isFrozen(custom[1][0]))).toBe(false);
            expect(await page.evaluate(() => Object.isFrozen(window.chart.options.custom[1][0]))).toBe(true);
        });

        test('replaces arrays instead of retaining entries from the previous value', async ({ page }) => {
            await page.evaluate(() => {
                window.createChart({ custom: [[1, 2], [3, 4]] });
                window.chart.setSettings({ custom: [[5]] });
            });

            expect(await page.evaluate(() => window.chart.options.custom)).toEqual([[5]]);
        });

        test('merges nested plain objects without dropping existing properties', async ({ page }) => {
            await page.evaluate(() => {
                window.createChart({ custom: { nested: { first: 1, second: 2 } } });
                window.chart.setSettings({ custom: { nested: { second: 3 } } });
            });

            expect(await page.evaluate(() => window.chart.options.custom.nested.first)).toBe(1);
            expect(await page.evaluate(() => window.chart.options.custom.nested.second)).toBe(3);
        });

        test('copies plain objects without a prototype', async ({ page }) => {
            await page.evaluate(() => {
                const custom = Object.create(null);

                custom.value = 1;
                window.createChart({ custom });
                custom.value = 2;
            });

            expect(await page.evaluate(() => window.chart.options.custom.value)).toBe(1);
        });

        for (const type of ['date', 'class instance']) {
            test(`preserves a ${type} by reference without freezing it`, async ({ page }) => {
                const value = await page.evaluateHandle((type) => {
                    class Formatter {
                        format() {
                            return 'Formatted';
                        }
                    }

                    const value = type === 'date' ? new Date('2026-01-01T00:00:00Z') : new Formatter();

                    window.createChart({ custom: { value, entries: [value] } });
                    window.chart.setSettings({ title: { text: 'Updated' } });

                    return value;
                }, type);

                expect(await value.evaluate((value) => window.chart.options.custom.value === value)).toBe(true);
                expect(await value.evaluate((value) => window.chart.options.custom.entries[0] === value)).toBe(true);
                expect(await value.evaluate((value) => Object.isFrozen(value))).toBe(false);
                expect(await page.evaluate(() => Object.isFrozen(window.chart.options.custom.entries))).toBe(true);
            });
        }

        for (const { name, value } of [
            { name: 'a string', value: 'red' },
            { name: 'an array', value: ['red'] },
        ]) {
            test(`replaces ${name} with a plain object without retaining indexed properties`, async ({ page }) => {
                await page.evaluate((value) => {
                    window.createChart({ custom: value });
                    window.chart.setSettings({ custom: { value: 1 } });
                }, value);

                expect(await page.evaluate(() => Object.keys(window.chart.options.custom))).toEqual(['value']);
                expect(await page.evaluate(() => window.chart.options.custom.value)).toBe(1);
            });
        }
    });

    test.describe('font option', () => {
        test('normalizes numeric strings in inherited fonts', async ({ page }) => {
            await page.evaluate(() => window.createChart({ font: { size: '16', lineHeight: '1.5' } }));

            const options = await page.evaluate(() => window.chart.options);

            expect(options.font.size).toBe(16);
            expect(options.font.lineHeight).toBe(1.5);
            expect(options.scales.y.ticks.font.size).toBe(16);
        });

        test('falls back to the default size for an invalid font update', async ({ page }) => {
            await page.evaluate(() => {
                window.createChart({ font: { size: 16 } });
                window.chart.setSettings({ font: { size: 0 } });
            });

            expect(await page.evaluate(() => window.chart.options.font.size)).toBe(12);
        });
    });

    test.describe('layout option', () => {
        test('normalizes numeric padding strings', async ({ page }) => {
            await page.evaluate(() => window.createChart({ layout: { padding: '24' } }));

            expect(await page.evaluate(() => window.chart.options.layout.padding)).toBe(24);
        });

        test('falls back to default padding for an invalid update', async ({ page }) => {
            await page.evaluate(() => {
                window.createChart({ layout: { padding: 24 } });
                window.chart.setSettings({ layout: { padding: 'invalid' } });
            });

            expect(await page.evaluate(() => window.chart.options.layout.padding)).toBe(20);
        });
    });

    test.describe('title option', () => {
        test('falls back to the default position for an unknown edge', async ({ page }) => {
            await page.evaluate(() => window.createChart({ title: { position: 'unknown' } }));

            expect(await page.evaluate(() => window.chart.options.title.position)).toBe('top');
        });
    });

    test.describe('legend option', () => {
        test('normalizes numeric width and swatch strings', async ({ page }) => {
            await page.evaluate(() => window.createChart({ legend: { maxWidth: '300', labels: { boxWidth: '18' } } }));

            const legend = await page.evaluate(() => window.chart.options.legend);

            expect(legend.maxWidth).toBe(300);
            expect(legend.labels.boxWidth).toBe(18);
        });
    });

    test.describe('tooltip option', () => {
        test('anchors tooltips to the data mark by default', async ({ page }) => {
            await page.evaluate(() => window.createChart());

            expect(await page.evaluate(() => window.chart.options.tooltip.position)).toBe('fixed');
        });

        test('clamps negative corner radii and falls back for invalid arrow sizes', async ({ page }) => {
            await page.evaluate(() => window.createChart({ tooltip: { borderRadius: -1, arrowSize: Infinity } }));

            const tooltip = await page.evaluate(() => window.chart.options.tooltip);

            expect(tooltip.borderRadius).toBe(0);
            expect(tooltip.arrowSize).toBe(5);
        });
    });

    test.describe('dataset options', () => {
        test('normalizes numeric values and point radii', async ({ page }) => {
            await page.evaluate(() => window.createChart({
                data: { labels: ['A'], datasets: [{ data: ['10'], pointRadius: '3' }] },
            }));

            const dataset = await page.evaluate(() => window.chart.getData()[0]);

            expect(dataset.data).toEqual([10]);
            expect(dataset.pointRadius).toBe(3);
        });

        test('clamps border widths and fill opacity', async ({ page }) => {
            await page.evaluate(() => window.createChart({
                data: { labels: ['A'], datasets: [{ data: [10], borderWidth: '-1', fillOpacity: 2 }] },
            }));

            const dataset = await page.evaluate(() => window.chart.getData()[0]);

            expect(dataset.borderWidth).toBe(0);
            expect(dataset.fillOpacity).toBe(1);
        });

        test('normalizes scatter coordinates without changing caller data', async ({ page }) => {
            const point = await page.evaluateHandle(() => {
                const point = { x: '2', y: '3' };

                window.createChart({ type: 'scatter', data: { datasets: [{ data: [point] }] } });

                return point;
            });

            expect(await point.evaluate((value) => value.x)).toBe('2');
            expect(await point.evaluate((value) => value.y)).toBe('3');
            expect(await page.evaluate(() => window.chart.getData()[0].data)).toEqual([{ x: 2, y: 3 }]);
        });
    });

    test.describe('options snapshot', () => {
        test.beforeEach(async ({ page }) => {
            await page.evaluate(() => window.createChart());
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

                window.createChart({ scales: { y: { ticks: { callback } } } });

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
