import { expect, test } from '#test';
import { setupChart } from '../setup/chart.js';

test.describe('Chart interactions', () => {
    test.beforeEach(setupChart);

    test.describe('dataset visibility', () => {
        for (const type of ['bar', 'line', 'area', 'scatter', 'pie', 'donut', 'polarArea', 'radar']) {
            test(`${type} hides and restores datasets without losing values or colors`, async ({ page }) => {
                const result = await page.evaluate((chartType) => {
                    const first = chartType === 'scatter' ? [{ x: 10, y: 20 }] : [20];
                    const second = chartType === 'scatter' ? [{ x: 5, y: 5 }] : [5];

                    window.createChart({
                        type: chartType,
                        legend: { display: true },
                        data: {
                            labels: ['A'],
                            datasets: [{ label: 'First', data: first }, { label: 'Second', data: second }],
                        },
                    });

                    const original = window.chart.getData();

                    window.chart.setDatasetVisibility(0, false);
                    const hidden = window.chart.getValues();
                    const maximum = window.chart.getScaleMax();

                    window.chart.setData({ labels: ['A'], datasets: window.chart.getData() });
                    const retained = !window.chart.isDatasetVisible(0);

                    window.chart.setDatasetVisibility(1, false);
                    const empty = window.chart.getValues();

                    window.chart.setDatasetVisibility(0, true);
                    window.chart.setDatasetVisibility(1, true);

                    return { original, restored: window.chart.getData(), hidden, maximum, retained, empty };
                }, type);

                expect(result.restored).toEqual(result.original);
                expect(result.hidden).toEqual([5]);
                expect(result.maximum).toBe(5);
                expect(result.retained).toBe(true);
                expect(result.empty).toEqual([]);
            });
        }

        test('removed items do not retain hidden state when data is replaced', async ({ page }) => {
            await page.evaluate(() => {
                window.createChart();
                window.chart.setDatasetVisibility(0, false);
                window.chart.setData({ labels: [], datasets: [] });
                window.chart.setData({ labels: ['A'], datasets: [{ data: [3] }] });
            });

            expect(await page.evaluate(() => window.chart.isDatasetVisible(0))).toBe(true);
            expect(await page.evaluate(() => window.chart.getValues())).toEqual([3]);
        });
    });

    test.describe('legend controls', () => {
        test('canvas legend clicks toggle datasets and native controls retain keyboard focus', async ({ page }) => {
            await page.evaluate(() => window.createChart({
                legend: { display: true, align: 'start' },
                data: {
                    labels: ['A', 'B'],
                    datasets: [
                        { label: 'First', data: [10, 20] },
                        { label: 'Second', data: [4, 5] },
                    ],
                },
            }));

            const bounds = await page.locator('canvas').boundingBox();

            await page.mouse.move(bounds.x + 30, bounds.y + 26);
            await expect(page.locator('canvas')).toHaveCSS('cursor', 'pointer');
            await page.mouse.click(bounds.x + 30, bounds.y + 26);

            const button = page.getByRole('button', { name: 'First', exact: true });

            await expect(button).toHaveAttribute('aria-pressed', 'false');
            expect(await page.evaluate(() => window.chart.getValues())).toEqual([4, 5]);

            await button.focus();
            await page.keyboard.press('Space');
            await expect(button).toHaveAttribute('aria-pressed', 'true');
            await expect(button).toBeFocused();

            await page.keyboard.press('Enter');
            await expect(button).toHaveAttribute('aria-pressed', 'false');
            await expect(button).toBeFocused();

            await page.evaluate(() => window.chart.dispose());
            await expect(page.getByRole('group', { name: 'Chart legend' })).toHaveCount(0);
        });

        for (const type of ['pie', 'donut', 'polarArea']) {
            test(`${type} legend keys toggle individual slices`, async ({ page }) => {
                await page.evaluate((chartType) => window.createChart({
                    type: chartType,
                    legend: { display: true },
                }), type);

                const first = page.getByRole('button', { name: 'A', exact: true });

                await first.focus();
                await page.keyboard.press('Enter');
                await expect(first).toHaveAttribute('aria-pressed', 'false');
                expect(await page.evaluate(() => window.chart.getValues())).toEqual([20]);
                expect(await page.evaluate(() => window.chart.getData()[0].data)).toEqual([10, 20]);

                await page.keyboard.press('Enter');
                expect(await page.evaluate(() => window.chart.getValues())).toEqual([10, 20]);
            });
        }

        test('disables legend controls when interaction is disabled', async ({ page }) => {
            await page.evaluate(() => window.createChart({ legend: { display: true, interactive: false } }));

            await expect(page.getByRole('button')).toHaveCount(0);
        });
    });

    test.describe('tooltips', () => {
        test('tooltips stay anchored by default and can follow the cursor', async ({ page }) => {
            await page.evaluate(() => window.createChart());

            const canvas = page.locator('canvas');
            const bounds = await canvas.boundingBox();
            const frame = () => canvas.evaluate((node) => node.toDataURL());

            await page.mouse.move(bounds.x + 140, bounds.y + 300);
            const fixed = await frame();

            await page.mouse.move(bounds.x + 180, bounds.y + 300);
            expect(await frame()).toBe(fixed);

            await page.evaluate(() => window.chart.setSettings({ tooltip: { position: 'cursor' } }));
            await page.mouse.move(bounds.x + 140, bounds.y + 300);
            const cursor = await frame();

            await page.mouse.move(bounds.x + 180, bounds.y + 300);
            expect(await frame()).not.toBe(cursor);
        });

        test('anchored tooltips follow marks, stay stable within a mark, and use rounded translucent bodies', async ({ page }) => {
            await page.evaluate(() => {
                const render = Chart.Tooltip.prototype.render;

                Chart.Tooltip.prototype.render = function() {
                    render.call(this);

                    if (!this.active) {
                        return;
                    }

                    const pixels = this.context.getImageData(0, 0, this.context.canvas.width, this.context.canvas.height);
                    const xs = [];
                    const ys = [];
                    let translucent = false;

                    for (let index = 3; index < pixels.data.length; index += 4) {
                        if (!pixels.data[index]) {
                            continue;
                        }

                        const point = (index - 3) / 4;

                        xs.push(point % pixels.width);
                        ys.push(Math.floor(point / pixels.width));
                        translucent ||= pixels.data[index] > 220 && pixels.data[index] < 250;
                    }

                    const left = Math.min(...xs);
                    const top = Math.min(...ys);
                    const corner = pixels.data[(top * pixels.width + left) * 4 + 3];

                    window.tooltipBounds = {
                        left, top, right: Math.max(...xs), bottom: Math.max(...ys), translucent, corner,
                        anchorX: this.active.anchorX - this.canvasRect.x,
                        anchorY: this.active.anchorY - this.canvasRect.y,
                    };
                };

                window.createChart({ tooltip: { position: 'fixed' } });
            });

            const canvas = page.locator('canvas');
            const bounds = await canvas.boundingBox();

            await page.mouse.move(bounds.x + 140, bounds.y + 300);
            const first = await page.evaluate(() => window.tooltipBounds);
            const frame = await canvas.evaluate((node) => node.toDataURL());

            await page.mouse.move(bounds.x + 180, bounds.y + 300);
            expect(await canvas.evaluate((node) => node.toDataURL())).toBe(frame);
            expect(first.left).toBeLessThan(first.anchorX);
            expect(first.right).toBeGreaterThan(first.anchorX);
            expect(first.bottom).toBeLessThan(first.anchorY);
            expect(first.translucent).toBe(true);
            expect(first.corner).toBe(0);

            await page.mouse.move(bounds.x + 440, bounds.y + 300);
            const second = await page.evaluate(() => window.tooltipBounds);

            expect(second.left).toBeGreaterThan(first.right);
            expect(second.top).toBeGreaterThan(second.anchorY);
            expect(second.right).toBeLessThan(560);
        });

        test('canvas tooltips treat labels as text', async ({ page }) => {
            await page.evaluate(() => {
                window.createChart({
                    data: {
                        labels: ['<img src=x onerror=alert(1)>'],
                        datasets: [{ data: [1] }],
                    },
                });
            });

            const canvas = page.locator('canvas');
            const bounds = await canvas.boundingBox();

            await page.mouse.move(bounds.x + 300, bounds.y + 200);
            await expect(canvas).toHaveAttribute('aria-description', '<img src=x onerror=alert(1)>. Dataset 1: 1');
            await expect(page.locator('img')).toHaveCount(0);
        });

        test('removes tooltip descriptions when display is disabled', async ({ page }) => {
            await page.evaluate(() => window.createChart());

            const canvas = page.locator('canvas');
            const bounds = await canvas.boundingBox();

            await page.mouse.move(bounds.x + 160, bounds.y + 300);
            await expect(canvas).toHaveAttribute('aria-description', 'A. Sales: 10');

            await page.evaluate(() => window.chart.setSettings({ tooltip: { display: false } }));
            await page.mouse.move(bounds.x + 161, bounds.y + 300);
            await expect(canvas).not.toHaveAttribute('aria-description');
        });

        test('bar coordinates are correct after scroll and CSS scaling', async ({ page }) => {
            await page.evaluate(() => {
                window.createChart();
                document.body.style.height = '2000px';
                const node = document.getElementById('chart');
                node.style.marginTop = '500px';
                node.style.transformOrigin = 'top left';
                node.style.transform = 'scale(.75)';
                window.scrollTo(0, 400);
            });
            const canvas = await page.locator('canvas').boundingBox();
            await page.mouse.move(canvas.x + 160 * .75, canvas.y + 300 * .75);
            await expect(page.locator('canvas')).toHaveAttribute('aria-description', 'A. Sales: 10');
            await page.mouse.move(canvas.x + 5, canvas.y + 5);
            await expect(page.locator('canvas')).not.toHaveAttribute('aria-description');
        });
    });
});
