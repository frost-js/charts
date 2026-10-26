import { expect, test } from '#test';
import { setupChart } from '../setup/chart.js';
import { getPixel } from '../support/canvas.js';

test.describe('Radial charts', () => {
    test.beforeEach(setupChart);

    test.describe('geometry', () => {
        test('polar area uses equal sectors with radii proportional to values', async ({ page }) => {
            await page.evaluate(() => {
                window.createChart({ type: 'polarArea', scales: { r: { display: false } } });
            });

            const canvas = page.locator('canvas');

            expect(await getPixel(canvas, 340, 180)).toEqual([255, 0, 0, 191]);
            expect((await getPixel(canvas, 430, 180))[3]).toBe(0);
            expect(await getPixel(canvas, 140, 200)).toEqual([0, 0, 255, 191]);

            const bounds = await canvas.boundingBox();

            await page.mouse.move(bounds.x + 340, bounds.y + 180);
            await expect(canvas).toHaveAttribute('aria-description', 'A. Sales: 10');
        });

        test('radar connects shared category axes and exposes point tooltips', async ({ page }) => {
            await page.evaluate(() => {
                window.createChart({
                    type: 'radar',
                    scales: { r: { display: false } },
                    data: {
                        labels: ['North', 'East', 'South', 'West'],
                        datasets: [{ label: 'Profile', data: [10, 20, 10, 20], backgroundColor: '#ff0000', pointRadius: 6 }],
                    },
                });
            });

            const canvas = page.locator('canvas');

            expect((await getPixel(canvas, 300, 110))[3]).toBe(255);
            expect((await getPixel(canvas, 480, 200))[3]).toBe(255);
            expect((await getPixel(canvas, 300, 200))[3]).toBe(51);
            expect((await getPixel(canvas, 450, 100))[3]).toBe(0);

            const bounds = await canvas.boundingBox();

            await page.mouse.move(bounds.x + 300, bounds.y + 110);
            await expect(canvas).toHaveAttribute('aria-description', 'North. Profile: 10');
        });
    });

    test.describe('scales', () => {
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

                    window.createChart({
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

    test.describe('data boundaries', () => {
        for (const type of ['radar', 'polarArea']) {
            test.describe(type, () => {
                test('updates empty data to zero values', async ({ page }) => {
                    await page.evaluate((type) => window.createChart({ type, data: { labels: [], datasets: [] } }), type);

                    expect(await page.evaluate(() => window.chart.getValues())).toEqual([]);

                    await page.evaluate(() => window.chart.setData({ labels: ['Only'], datasets: [{ data: [0] }] }));

                    expect(await page.evaluate(() => window.chart.getValues())).toEqual([0]);
                });

                test('resizes zero-valued data in a narrow container', async ({ page }) => {
                    await page.evaluate((type) => {
                        window.createChart({ type, data: { labels: ['Only'], datasets: [{ data: [0] }] } });
                        document.getElementById('chart').style.width = '60px';
                        document.getElementById('chart').style.height = '60px';
                        window.chart.resize();
                    }, type);

                    await expect(page.locator('canvas')).toHaveAttribute('width', '60');
                    expect(await page.evaluate(() => window.chart.getValues())).toEqual([0]);
                });

                test('rejects negative values without replacing existing data', async ({ page }) => {
                    await page.evaluate((type) => window.createChart({
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
