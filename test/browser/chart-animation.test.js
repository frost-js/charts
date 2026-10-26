import { expect, test } from '#test';
import { setupChart } from '../setup/chart.js';

test.describe('Chart animation', () => {
    test.beforeEach(setupChart);

    test.use({ mockClock: true });

    test.describe('duration and reduced motion', () => {
        test('uses a 300ms duration by default', async ({ page }) => {
            await page.emulateMedia({ reducedMotion: 'no-preference' });

            await page.evaluate(() => window.createChart({ type: 'line', animation: Chart.defaults.animation }));

            expect(await page.evaluate(() => window.chart.options.animation.duration)).toBe(300);

            await page.clock.runFor(350);

            const completed = await page.locator('canvas').evaluate((node) => node.toDataURL());

            await page.evaluate(() => window.chart.render());
            expect(await page.locator('canvas').evaluate((node) => node.toDataURL())).toBe(completed);
        });

        for (const type of ['bar', 'line', 'pie', 'area', 'donut', 'radar', 'polarArea']) {
            for (const { name, reducedMotion, duration } of [
                { name: 'reduced motion', reducedMotion: 'reduce', duration: 1000 },
                { name: 'zero duration', reducedMotion: 'no-preference', duration: 0 },
            ]) {
                test(`${type} respects ${name}`, async ({ page }) => {
                    await page.emulateMedia({ reducedMotion });
                    await page.evaluate(({ type, duration }) => window.createChart({
                        type, animation: { duration },
                    }), { type, duration });

                    const frame = () => page.locator('canvas').evaluate((canvas) => canvas.toDataURL());
                    const immediate = await frame();

                    await page.clock.runFor(500);
                    expect(await frame()).toBe(immediate);

                    await page.evaluate(() => window.chart.render());
                    expect(await frame()).toBe(immediate);
                });
            }
        }

        for (const duration of [0, 1000]) {
            test(`draws once per update before scheduling frames with a ${duration}ms duration`, async ({ page }) => {
                await page.emulateMedia({ reducedMotion: 'no-preference' });

                const counts = await page.evaluate((duration) => {
                    const draw = Chart.prototype.draw;
                    let count = 0;

                    Chart.prototype.draw = function() {
                        count++;

                        return draw.call(this);
                    };

                    window.createChart({ animation: { duration } });
                    const construction = count;

                    count = 0;
                    window.chart.setData({ labels: ['New'], datasets: [{ data: [30] }] });
                    const data = count;

                    count = 0;
                    document.getElementById('chart').style.width = '500px';
                    window.chart.setSettings({ title: { text: 'Updated' } });
                    const settings = count;

                    return { construction, data, settings };
                }, duration);

                expect(counts.construction).toBe(1);
                expect(counts.data).toBe(1);
                expect(counts.settings).toBe(1);
            });
        }

        test('clamps negative duration to zero on update', async ({ page }) => {
            await page.evaluate(() => {
                window.createChart();
                window.chart.setSettings({ animation: { duration: -1 } });
            });

            expect(await page.evaluate(() => window.chart.options.animation.duration)).toBe(0);
        });
    });

    test.describe('easing', () => {
        test('ease-out advances sooner than linear while ease-in-out starts more slowly', async ({ page }) => {
            await page.emulateMedia({ reducedMotion: 'no-preference' });

            const positions = {};

            for (const easing of ['linear', 'easeOutQuad', 'easeInOutQuad']) {
                await page.evaluate((curve) => {
                    window.createChart({
                        type: 'line',
                        animation: { duration: 1000, easing: curve },
                        data: {
                            labels: ['A'],
                            datasets: [{ data: [10], backgroundColor: '#ff0000', borderWidth: 0, pointRadius: 12 }],
                        },
                    });
                }, easing);
                await page.clock.runFor(250);

                positions[easing] = await page.locator('canvas').evaluate((node) => {
                    const pixels = node.getContext('2d').getImageData(300, 0, 1, node.height).data;
                    const rows = [];

                    for (let y = 0; y < node.height; y++) {
                        if (pixels[y * 4 + 3]) {
                            rows.push(y);
                        }
                    }

                    return (rows[0] + rows.at(-1)) / 2;
                });
            }

            expect(positions.easeOutQuad).toBeLessThan(positions.linear - 40);
            expect(positions.easeInOutQuad).toBeGreaterThan(positions.linear + 20);
        });
    });

    test.describe('transitions', () => {
        for (const type of ['bar', 'line', 'pie', 'area', 'donut', 'radar', 'polarArea']) {
            test(`${type} animates initial geometry, updates, and interrupted transitions`, async ({ page }) => {
                await page.emulateMedia({ reducedMotion: 'no-preference' });

                await page.evaluate((chartType) => {
                    window.createChart({
                        type: chartType,
                        animation: { duration: 1000, easing: 'linear' },
                        data: {
                            labels: ['A', 'B'],
                            datasets: [{ data: [10, 20], borderWidth: 0, pointRadius: 6 }],
                        },
                    });
                }, type);

                const frame = () => page.locator('canvas').evaluate((canvas) => canvas.toDataURL());
                const initial = await frame();

                await page.clock.runFor(250);
                const intermediate = await frame();

                expect(intermediate).not.toBe(initial);

                await page.clock.runFor(800);
                const final = await frame();

                expect(final).not.toBe(intermediate);

                await page.evaluate(() => {
                    window.chart.setData({
                        labels: ['A', 'B'],
                        datasets: [{ data: [20, 10], borderWidth: 0, pointRadius: 6 }],
                    });
                });

                expect(await frame()).toBe(final);

                await page.clock.runFor(250);
                const updating = await frame();

                expect(updating).not.toBe(final);

                await page.evaluate(() => {
                    window.chart.setData({
                        labels: ['A', 'B'],
                        datasets: [{ data: [5, 20], borderWidth: 0, pointRadius: 6 }],
                    });
                });

                expect(await frame()).toBe(updating);

                await page.clock.runFor(1050);
                const finished = await frame();

                await page.evaluate(() => window.chart.render());
                expect(await frame()).toBe(finished);
            });
        }

        test('scatter transitions interpolate numeric coordinates', async ({ page }) => {
            await page.emulateMedia({ reducedMotion: 'no-preference' });
            await page.evaluate(() => {
                window.createChart({
                    type: 'scatter',
                    data: { datasets: [{ data: [{ x: 2, y: 2 }, { x: 10, y: 10 }] }] },
                });
                window.chart.setSettings({ animation: { duration: 1000, easing: 'linear' } });
                window.chart.render();
                window.chart.setData({ datasets: [{ data: [{ x: 8, y: 8 }, { x: 10, y: 10 }] }] });
            });

            const frame = () => page.locator('canvas').evaluate((node) => node.toDataURL());
            const initial = await frame();

            await page.clock.runFor(500);
            const intermediate = await frame();

            expect(intermediate).not.toBe(initial);

            await page.clock.runFor(600);
            expect(await frame()).not.toBe(intermediate);
        });

        test('stops requesting frames after the duration elapses', async ({ page }) => {
            await page.emulateMedia({ reducedMotion: 'no-preference' });
            await page.evaluate(() => {
                window.drawCount = 0;

                const draw = Chart.prototype.draw;

                Chart.prototype.draw = function() {
                    window.drawCount++;

                    return draw.call(this);
                };

                window.createChart({ animation: { duration: 100 } });
            });

            await page.clock.runFor(200);

            const before = await page.evaluate(() => window.drawCount);

            await page.clock.runFor(80);
            expect(await page.evaluate(() => window.drawCount)).toBe(before);
        });
    });

    test.describe('hit regions', () => {
        test('line hit regions follow moving points', async ({ page }) => {
            await page.emulateMedia({ reducedMotion: 'no-preference' });
            await page.evaluate(() => {
                window.createChart({
                    type: 'line',
                    animation: { duration: 1000, easing: 'linear' },
                    data: {
                        labels: ['Moving'],
                        datasets: [{ label: 'Sales', data: [10], backgroundColor: '#ff0000', borderWidth: 0, pointRadius: 8 }],
                    },
                });
            });
            await page.clock.runFor(500);

            const canvas = page.locator('canvas');
            const point = await canvas.evaluate((node) => {
                const context = node.getContext('2d');
                const pixels = context.getImageData(300, 0, 1, node.height).data;
                const rows = [];

                for (let y = 0; y < node.height; y++) {
                    if (pixels[y * 4] === 255 && pixels[y * 4 + 3]) {
                        rows.push(y);
                    }
                }

                return { x: 300, y: (rows[0] + rows.at(-1)) / 2 };
            });
            const bounds = await canvas.boundingBox();

            expect(point.y).toBeGreaterThan(150);
            expect(point.y).toBeLessThan(250);

            await page.mouse.move(bounds.x + point.x, bounds.y + point.y);
            await expect(canvas).toHaveAttribute('aria-description', 'Moving. Sales: 10');

            await page.mouse.move(bounds.x + 300, bounds.y + 20);
            await expect(canvas).not.toHaveAttribute('aria-description');
        });

        test('pie hover preserves the current sweep and cannot hit unrevealed slices', async ({ page }) => {
            await page.emulateMedia({ reducedMotion: 'no-preference' });
            await page.evaluate(() => {
                window.createChart({
                    type: 'pie',
                    animation: { duration: 1000, easing: 'linear' },
                    data: {
                        labels: ['Slice'],
                        datasets: [{ label: 'Sales', data: [10], backgroundColor: '#ff0000', borderWidth: 0 }],
                    },
                });
            });
            await page.clock.runFor(500);

            const canvas = page.locator('canvas');
            const bounds = await canvas.boundingBox();

            await page.mouse.move(bounds.x + 300, bounds.y + 300);
            await expect(canvas).toHaveAttribute('aria-description', 'Slice. Sales: 10');

            // A hover redraw must not finish the animation and paint the upper half.
            const upperAlpha = await canvas.evaluate((node) => {
                return node.getContext('2d').getImageData(300, 80, 1, 1).data[3];
            });

            expect(upperAlpha).toBe(0);

            await page.mouse.move(bounds.x + 300, bounds.y + 80);
            await expect(canvas).not.toHaveAttribute('aria-description');

            await page.clock.runFor(600);
            await page.mouse.move(bounds.x + 301, bounds.y + 80);
            await expect(canvas).toHaveAttribute('aria-description', 'Slice. Sales: 10');
        });
    });

    test.describe('cancellation', () => {
        for (const type of ['bar', 'line', 'pie', 'area', 'donut', 'radar', 'polarArea']) {
            for (const method of ['render', 'resize', 'dispose']) {
                test(`${type} cancels pending frames on ${method}`, async ({ page }) => {
                    await page.emulateMedia({ reducedMotion: 'no-preference' });
                    await page.evaluate((type) => {
                        window.drawCount = 0;

                        const draw = Chart.prototype.draw;

                        Chart.prototype.draw = function() {
                            window.drawCount++;

                            return draw.call(this);
                        };

                        window.createChart({ type, animation: { duration: 1000, easing: 'linear' } });
                    }, type);

                    await page.clock.runFor(250);
                    await page.evaluate((method) => {
                        if (method === 'resize') {
                            document.getElementById('chart').style.width = '500px';
                        }

                        window.chart[method]();
                    }, method);

                    const stopped = await page.evaluate(() => window.drawCount);

                    await page.clock.runFor(1000);
                    expect(await page.evaluate(() => window.drawCount)).toBe(stopped);
                });
            }
        }

        test('cancels restarted frames after a data update and disposal', async ({ page }) => {
            await page.emulateMedia({ reducedMotion: 'no-preference' });
            await page.evaluate(() => {
                window.drawCount = 0;

                const draw = Chart.prototype.draw;

                Chart.prototype.draw = function() {
                    window.drawCount++;

                    return draw.call(this);
                };

                window.createChart({ animation: { duration: 100 } });
            });

            await page.clock.runFor(200);

            await page.evaluate(() => {
                window.chart.run();
                window.chart.setData({ labels: ['New'], datasets: [{ data: [50] }] });
                window.chart.dispose();
            });
            const after = await page.evaluate(() => window.drawCount);

            await page.clock.runFor(150);
            expect(await page.evaluate(() => window.drawCount)).toBe(after);
        });
    });
});
