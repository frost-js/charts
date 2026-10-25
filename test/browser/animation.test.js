import { expect, test } from '#test';

for (const type of ['bar', 'line', 'pie', 'area', 'donut', 'radar', 'polarArea']) {
    test(`${type} animates initial geometry, updates, and interrupted transitions`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.clock.install();
        await page.clock.pauseAt(new Date());

        await page.evaluate((chartType) => {
            window.makeChart({
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

    test(`${type} cancels animation on render, resize, and disposal`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.clock.install();
        await page.clock.pauseAt(new Date());
        await page.evaluate((chartType) => {
            window.drawCount = 0;

            const draw = Chart.prototype.draw;

            Chart.prototype.draw = function() {
                window.drawCount++;

                return draw.call(this);
            };

            window.makeChart({ type: chartType, animation: { duration: 1000, easing: 'linear' } });
        }, type);

        await page.clock.runFor(250);
        await page.evaluate(() => window.chart.render());

        const rendered = await page.evaluate(() => window.drawCount);

        await page.clock.runFor(1000);
        expect(await page.evaluate(() => window.drawCount)).toBe(rendered);

        await page.evaluate(() => {
            window.chart.run();
            document.getElementById('chart').style.width = '500px';
            window.chart.resize();
        });

        const resized = await page.evaluate(() => window.drawCount);

        await page.clock.runFor(1000);
        expect(await page.evaluate(() => window.drawCount)).toBe(resized);

        await page.evaluate(() => {
            window.chart.run();
            window.chart.dispose();
        });

        const disposed = await page.evaluate(() => window.drawCount);

        await page.clock.runFor(1000);
        expect(await page.evaluate(() => window.drawCount)).toBe(disposed);
    });

    test(`${type} respects reduced motion and zero duration`, async ({ page }) => {
        await page.clock.install();
        await page.clock.pauseAt(new Date());

        for (const reducedMotion of ['reduce', 'no-preference']) {
            await page.emulateMedia({ reducedMotion });
            await page.evaluate(({ chartType, duration }) => {
                window.makeChart({ type: chartType, animation: { duration } });
            }, { chartType: type, duration: reducedMotion === 'reduce' ? 1000 : 0 });

            const immediate = await page.locator('canvas').evaluate((canvas) => canvas.toDataURL());

            await page.clock.runFor(500);
            expect(await page.locator('canvas').evaluate((canvas) => canvas.toDataURL())).toBe(immediate);

            await page.evaluate(() => window.chart.render());
            expect(await page.locator('canvas').evaluate((canvas) => canvas.toDataURL())).toBe(immediate);
        }
    });
}

test('line hit regions follow moving points', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await page.evaluate(() => {
        window.makeChart({
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
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await page.evaluate(() => {
        window.makeChart({
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

test('ease-out moves points sooner than linear timing and defaults finish in 300ms', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.clock.install();
    await page.clock.pauseAt(new Date());

    const positions = {};

    for (const easing of ['linear', 'easeOutQuad', 'easeInOutQuad']) {
        await page.evaluate((curve) => {
            window.makeChart({
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

    await page.evaluate(() => window.makeChart({ type: 'line', animation: Chart.defaults.animation }));
    await page.clock.runFor(350);

    const completed = await page.locator('canvas').evaluate((node) => node.toDataURL());

    await page.evaluate(() => window.chart.render());
    expect(await page.locator('canvas').evaluate((node) => node.toDataURL())).toBe(completed);
});

test('scatter transitions interpolate numeric coordinates', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await page.evaluate(() => {
        window.makeChart({
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
