import { expect, test } from '#test';
import { setupChart } from '../setup/chart.js';

test.describe('Chart updates', () => {
    test.beforeEach(setupChart);
    test.beforeEach(async ({ page }) => {
        await page.evaluate(() => window.createChart());
    });

    test.describe('#setData', () => {
        test('replaces labels and values and recalculates the scale', async ({ page }) => {
            await page.evaluate(() => window.chart.setData({
                labels: ['New'],
                datasets: [{ data: [-500] }],
            }));

            expect(await page.evaluate(() => window.chart.getLabels())).toEqual(['New']);
            expect(await page.evaluate(() => window.chart.getValues())).toEqual([-500]);
            expect(await page.evaluate(() => window.chart.getScaleMin())).toBe(-500);
            expect(await page.evaluate(() => window.chart.getScaleMax())).toBe(0);
        });

        for (const { name, type, orientation } of [
            { name: 'x', type: 'bar', orientation: 'vertical' },
            { name: 'y', type: 'bar', orientation: 'horizontal' },
            { name: 'radial', type: 'radar', orientation: 'vertical' },
        ]) {
            test(`updates large datasets with ${name} category labels`, async ({ page }) => {
                await page.evaluate(({ type, orientation }) => window.createChart({
                    type,
                    orientation,
                    scales: {
                        x: { grid: { display: false } },
                        y: { grid: { display: false } },
                        r: { grid: { display: false } },
                    },
                }), { type, orientation });

                const canvas = page.locator('canvas');
                const previous = await canvas.evaluate((node) => node.toDataURL());

                await page.evaluate(() => {
                    // Exceeds Chromium's function argument limit during label measurement.
                    window.chart.setData({
                        labels: Array(150000).fill('Category'),
                        datasets: [{ data: Array(150000).fill(1), borderWidth: 0, pointRadius: 0 }],
                    });
                });

                expect(await page.evaluate(() => window.chart.getLabels().length)).toBe(150000);
                expect(await page.evaluate(() => window.chart.options.data.datasets[0].data.length)).toBe(150000);
                expect(await canvas.evaluate((node) => node.toDataURL())).not.toBe(previous);
            });
        }

        test('copies input data instead of retaining caller-owned arrays', async ({ page }) => {
            await page.evaluate(() => {
                const data = { labels: ['New'], datasets: [{ data: [-500], backgroundColor: ['red'] }] };

                window.chart.setData(data);
                data.labels[0] = 'Changed';
                data.datasets[0].data[0] = 2;
                data.datasets[0].backgroundColor[0] = 'blue';
            });

            expect(await page.evaluate(() => window.chart.getLabels())).toEqual(['New']);
            expect(await page.evaluate(() => window.chart.getValues())).toEqual([-500]);
            expect(await page.evaluate(() => window.chart.getData()[0].backgroundColor)).toEqual(['red']);
        });

        test('repeated data updates replace stale hover regions', async ({ page }) => {
            await page.evaluate(() => {
                window.createChart();

                for (let value = 1; value <= 20; value++) {
                    window.chart.setData({
                        labels: ['Current'],
                        datasets: [{ label: 'Latest', data: [value] }],
                    });
                }
            });

            const canvas = page.locator('canvas');
            const bounds = await canvas.boundingBox();

            await page.mouse.move(bounds.x + 300, bounds.y + 200);
            await expect(canvas).toHaveAttribute('aria-description', 'Current. Latest: 20');

            await page.evaluate(() => window.chart.setData({ labels: [], datasets: [] }));
            await page.mouse.move(bounds.x + 301, bounds.y + 200);
            await expect(canvas).not.toHaveAttribute('aria-description');
        });

        for (const { name, data, message } of [
            {
                name: 'mismatched label and value counts',
                data: { labels: ['A'], datasets: [{ data: [] }] },
                message: 'Dataset 0 must have one value per label.',
            },
            {
                name: 'NaN values',
                data: { labels: ['A'], datasets: [{ data: [NaN] }] },
                message: 'Dataset 0 values must be finite numbers.',
            },
            {
                name: 'infinite values',
                data: { labels: ['A'], datasets: [{ data: [Infinity] }] },
                message: 'Dataset 0 values must be finite numbers.',
            },
            {
                name: 'nonnumeric values',
                data: { labels: ['A'], datasets: [{ data: ['invalid'] }] },
                message: 'Dataset 0 values must be finite numbers.',
            },
            {
                name: 'empty color arrays',
                data: { labels: ['A'], datasets: [{ data: [1], backgroundColor: [] }] },
                message: 'Dataset 0 backgroundColor must contain at least one color.',
            },
        ]) {
            test(`rejects ${name} without replacing the data`, async ({ page }) => {
                const previous = await page.evaluateHandle(() => window.chart.options);

                await expect(page.evaluate((data) => window.chart.setData(data), data)).rejects.toThrow(message);

                expect(await page.evaluate(() => window.chart.getValues())).toEqual([10, 20]);
                expect(await page.evaluate(() => window.chart.getLabels())).toEqual(['A', 'B']);
                expect(await previous.evaluate((options) => window.chart.options === options)).toBe(true);
            });
        }
    });

    test.describe('#setSettings', () => {
        test('changes the renderer without adding another canvas', async ({ page }) => {
            await page.evaluate(() => window.chart.setSettings({ type: 'line' }));

            expect(await page.evaluate(() => window.chart.options.type)).toBe('line');
            expect(await page.evaluate(() => window.chart.getValues())).toEqual([10, 20]);
            await expect(page.locator('canvas')).toHaveCount(1);
        });

        test('changes chart type and data together', async ({ page }) => {
            await page.evaluate(() => window.chart.setSettings({
                type: 'pie',
                data: { labels: ['Slice'], datasets: [{ data: [5] }] },
            }));

            expect(await page.evaluate(() => window.chart.options.type)).toBe('pie');
            expect(await page.evaluate(() => window.chart.getLabels())).toEqual(['Slice']);
            expect(await page.evaluate(() => window.chart.getValues())).toEqual([5]);
            await expect(page.locator('canvas')).toHaveCount(1);
        });

        test('retains the latest data when changing unrelated settings', async ({ page }) => {
            await page.evaluate(() => {
                window.chart.setData({ labels: ['Current'], datasets: [{ data: [30] }] });
                window.chart.setSettings({ title: { text: 'Updated' } });
            });

            expect(await page.evaluate(() => window.chart.getLabels())).toEqual(['Current']);
            expect(await page.evaluate(() => window.chart.getValues())).toEqual([30]);
            expect(await page.evaluate(() => window.chart.options.data.labels)).toEqual(['Current']);
            expect(await page.evaluate(() => window.chart.options.data.datasets[0].data)).toEqual([30]);
        });

        test('updates inherited fonts while retaining layer overrides', async ({ page }) => {
            await page.evaluate(() => window.chart.setSettings({ font: { family: 'serif', size: 16 } }));

            const options = await page.evaluate(() => window.chart.options);

            expect(options.font.size).toBe(16);
            expect(options.scales.y.ticks.font.size).toBe(16);
            expect(options.title.font.size).toBe(18);
            expect(options.legend.labels.font.family).toBe('serif');
        });

        test('rejects unsupported chart types without replacing settings', async ({ page }) => {
            const previous = await page.evaluateHandle(() => window.chart.options);

            await expect(page.evaluate(() => window.chart.setSettings({ type: 'bad' }))).rejects.toThrow(
                'Chart type must be bar, line, area, pie, donut, scatter, polarArea, or radar.',
            );

            expect(await page.evaluate(() => window.chart.options.type)).toBe('bar');
            expect(await page.evaluate(() => window.chart.getValues())).toEqual([10, 20]);
            expect(await previous.evaluate((options) => window.chart.options === options)).toBe(true);
        });

        test('rejects a type change when existing values are invalid for that type', async ({ page }) => {
            await page.evaluate(() => window.chart.setData({ labels: ['A'], datasets: [{ data: [-1] }] }));

            await expect(page.evaluate(() => window.chart.setSettings({ type: 'pie' }))).rejects.toThrow(
                'Dataset 0 circular and radial values must be nonnegative.',
            );

            expect(await page.evaluate(() => window.chart.options.type)).toBe('bar');
            expect(await page.evaluate(() => window.chart.getValues())).toEqual([-1]);
            expect(await page.evaluate(() => Chart.init(document.getElementById('chart')) === window.chart)).toBe(true);
        });
    });

    test.describe('data getters', () => {
        test('returns independent copies of labels and dataset values', async ({ page }) => {
            await page.evaluate(() => {
                window.chart.getData()[0].data[0] = 99;
                window.chart.getLabels()[0] = 'Changed';
            });

            expect(await page.evaluate(() => window.chart.getValues())).toEqual([10, 20]);
            expect(await page.evaluate(() => window.chart.getLabels())).toEqual(['A', 'B']);
        });

        test('copies scatter coordinates returned by getData', async ({ page }) => {
            await page.evaluate(() => {
                window.createChart({ type: 'scatter', data: { datasets: [{ data: [{ x: 2, y: 3 }] }] } });
                window.chart.getData()[0].data[0].x = 99;
            });

            expect(await page.evaluate(() => window.chart.getData()[0].data)).toEqual([{ x: 2, y: 3 }]);
        });
    });

    test.describe('scale boundaries', () => {
        for (const { name, values } of [
            { name: 'constant values', values: [3, 3] },
            { name: 'small fractions', values: [.00001, .00002] },
            { name: 'subnormal values', values: [0, 5e-324] },
            { name: 'large positive values', values: [0, 1.79e308] },
            { name: 'large mixed-sign values', values: [-1e308, 1e308] },
        ]) {
            test(`bounds ${name} with a finite scale`, async ({ page }) => {
                await page.evaluate((values) => window.chart.setData({
                    labels: ['A', 'B'],
                    datasets: [{ data: values }],
                }), values);

                const scale = await page.evaluate(() => window.chart.getScale());

                expect(scale.length).toBeGreaterThanOrEqual(2);
                expect(scale.length).toBeLessThanOrEqual(23);
                expect(scale[0]).toBeLessThanOrEqual(Math.min(...values));
                expect(scale.at(-1)).toBeGreaterThanOrEqual(Math.max(...values));

                for (const [index, tick] of scale.entries()) {
                    expect(Number.isFinite(tick), `Tick ${index}`).toBe(true);
                }
            });
        }
    });
});
