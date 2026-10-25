import { expect, test } from '#test';
import { setupChart } from '../setup/chart.js';

test.describe('Chart updates', () => {
    test.beforeEach(setupChart);

    test.describe('#setData', () => {
        test('data updates replace values, recalculate scales, and copy input and output', async ({ page }) => {
            const result = await page.evaluate(() => {
                window.makeChart();

                const data = {
                    labels: ['New'],
                    datasets: [{ data: [-500], backgroundColor: 'red' }],
                };

                window.chart.setData(data);
                data.datasets[0].data[0] = 2;
                window.chart.getData()[0].data[0] = 8;
                window.chart.getLabels()[0] = 'Bad';

                return {
                    values: window.chart.getValues(),
                    labels: window.chart.getLabels(),
                    min: window.chart.getScaleMin(),
                    max: window.chart.getScaleMax(),
                };
            });

            expect(result).toEqual({ values: [-500], labels: ['New'], min: -500, max: 0 });
        });

        test('repeated data updates replace stale hover regions', async ({ page }) => {
            await page.evaluate(() => {
                window.makeChart();

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

        test('normalizes scatter coordinates without changing caller data', async ({ page }) => {
            const state = await page.evaluate(() => {
                const point = { x: '2', y: '3' };

                window.makeChart({
                    type: 'scatter',
                    data: { datasets: [{ data: [point] }] },
                });

                return { input: point, values: window.chart.getData()[0].data };
            });

            expect(state).toEqual({ input: { x: '2', y: '3' }, values: [{ x: 2, y: 3 }] });
        });
    });

    test.describe('#setSettings', () => {
        test('settings changes rebuild chart types and preserve inherited fonts', async ({ page }) => {
            const state = await page.evaluate(() => {
                window.makeChart();
                window.chart.setSettings({
                    type: 'line',
                    font: { family: 'serif', size: 16 },
                });

                const lineOptions = window.chart.options;

                window.chart.setSettings({
                    type: 'pie',
                    data: {
                        labels: ['Slice'],
                        datasets: [{ data: [5] }],
                    },
                });

                return {
                    lineType: lineOptions.type,
                    baseFont: lineOptions.font.size,
                    tickFont: lineOptions.scales.y.ticks.font.size,
                    titleFont: lineOptions.title.font.size,
                    legendFamily: lineOptions.legend.labels.font.family,
                    finalType: window.chart.options.type,
                    values: window.chart.getValues(),
                    canvases: document.querySelectorAll('canvas').length,
                };
            });

            expect(state).toEqual({
                lineType: 'line',
                baseFont: 16,
                tickFont: 16,
                titleFont: 18,
                legendFamily: 'serif',
                finalType: 'pie',
                values: [5],
                canvases: 1,
            });
        });

        test('enabling responsive sizing measures changes made while it was disabled', async ({ page }) => {
            await page.evaluate(() => {
                window.makeChart({ responsive: false });
                document.getElementById('chart').style.width = '320px';
            });

            await expect(page.locator('canvas')).toHaveAttribute('width', '600');

            await page.evaluate(() => window.chart.setSettings({ responsive: true }));

            await expect(page.locator('canvas')).toHaveAttribute('width', '320');
        });

        test('normalizes numeric strings and falls back or clamps presentation options', async ({ page }) => {
            const state = await page.evaluate(() => {
                window.makeChart({
                    font: { size: '16', lineHeight: '1.5' },
                    layout: { padding: '24' },
                    title: { position: 'unknown' },
                    legend: { maxWidth: '300', labels: { boxWidth: '18' } },
                    tooltip: { borderRadius: -1, arrowSize: Infinity },
                    data: {
                        labels: ['A'],
                        datasets: [{ data: ['10'], borderWidth: '-1', pointRadius: '3', fillOpacity: 2 }],
                    },
                });

                const initial = window.chart.options;

                window.chart.setSettings({
                    font: { size: 0 },
                    animation: { duration: -1 },
                    layout: { padding: 'invalid' },
                });

                return {
                    size: initial.font.size,
                    tickSize: initial.scales.y.ticks.font.size,
                    lineHeight: initial.font.lineHeight,
                    padding: initial.layout.padding,
                    titlePosition: initial.title.position,
                    legendWidth: initial.legend.maxWidth,
                    swatchWidth: initial.legend.labels.boxWidth,
                    radius: initial.tooltip.borderRadius,
                    arrow: initial.tooltip.arrowSize,
                    values: window.chart.getValues(),
                    borderWidth: initial.data.datasets[0].borderWidth,
                    pointRadius: initial.data.datasets[0].pointRadius,
                    opacity: initial.data.datasets[0].fillOpacity,
                    fallbackSize: window.chart.options.font.size,
                    fallbackPadding: window.chart.options.layout.padding,
                    duration: window.chart.options.animation.duration,
                };
            });

            expect(state).toEqual({
                size: 16,
                tickSize: 16,
                lineHeight: 1.5,
                padding: 24,
                titlePosition: 'top',
                legendWidth: 300,
                swatchWidth: 18,
                radius: 0,
                arrow: 5,
                values: [10],
                borderWidth: 0,
                pointRadius: 3,
                opacity: 1,
                fallbackSize: 12,
                fallbackPadding: 20,
                duration: 0,
            });
        });
    });

    test.describe('invalid updates', () => {
        test('invalid updates leave the existing chart intact', async ({ page }) => {
            const result = await page.evaluate(() => {
                window.makeChart();

                const invalid = [
                    { labels: ['A'], datasets: [{ data: [] }] },
                    { labels: ['A'], datasets: [{ data: [NaN] }] },
                    { labels: ['A'], datasets: [{ data: [Infinity] }] },
                    { labels: ['A'], datasets: [{ data: ['invalid'] }] },
                    { labels: ['A'], datasets: [{ data: [1], backgroundColor: [] }] },
                ];
                let errors = 0;

                for (const data of invalid) {
                    try {
                        window.chart.setData(data);
                    } catch {
                        errors++;
                    }
                }

                for (const settings of [
                    { type: 'bad' },
                ]) {
                    try {
                        window.chart.setSettings(settings);
                    } catch {
                        errors++;
                    }
                }

                return {
                    errors,
                    values: window.chart.getValues(),
                    type: window.chart.options.type,
                };
            });

            expect(result).toEqual({ errors: 6, values: [10, 20], type: 'bar' });
        });
    });

    test.describe('options snapshot', () => {
        test('exposes a stable frozen snapshot until data or settings change', async ({ page }) => {
            const state = await page.evaluate(() => {
                const callback = (value) => `$${value}`;

                window.makeChart({ scales: { y: { ticks: { callback } } } });

                const chart = window.chart;
                const initial = chart.options;
                const stable = chart.options === initial;
                const frozen = [initial, initial.font, initial.data, initial.data.datasets[0].data]
                    .every(Object.isFrozen);

                chart.setData({ labels: ['New'], datasets: [{ data: [5] }] });

                const updated = chart.options;

                chart.setSettings({ font: { size: 16 } });

                const configured = chart.options;

                try {
                    chart.setSettings({ type: 'unknown' });
                } catch {
                    // Failed updates must leave the last successful snapshot in place.
                }

                return {
                    stable,
                    frozen,
                    callbackFrozen: Object.isFrozen(callback),
                    defaultsFrozen: Object.isFrozen(Chart.defaults.font),
                    dataReplaced: updated !== initial,
                    settingsReplaced: configured !== updated,
                    failedUpdatePreserved: chart.options === configured,
                    originalValues: initial.data.datasets[0].data,
                    updatedValues: updated.data.datasets[0].data,
                    oldSize: updated.font.size,
                    currentSize: configured.font.size,
                };
            });

            expect(state).toEqual({
                stable: true,
                frozen: true,
                callbackFrozen: false,
                defaultsFrozen: false,
                dataReplaced: true,
                settingsReplaced: true,
                failedUpdatePreserved: true,
                originalValues: [10, 20],
                updatedValues: [5],
                oldSize: 12,
                currentSize: 16,
            });
        });
    });

    test.describe('scale boundaries', () => {
        test('finite extremes and tiny data produce bounded scales', async ({ page }) => {
            const results = await page.evaluate(() => {
                window.makeChart();
                return [[-1e308, 1e308], [0, 5e-324], [0, 1.79e308], [.00001, .00002], [3, 3]].map((values) => {
                    window.chart.setData({ labels: ['A', 'B'], datasets: [{ data: values }] });
                    const scale = window.chart.getScale();

                    return scale.length >= 2 && scale.length <= 23 &&
                        scale.every(Number.isFinite) &&
                        scale[0] <= Math.min(...values) && scale.at(-1) >= Math.max(...values);
                });
            });

            expect(results).toEqual([true, true, true, true, true]);
        });
    });
});
