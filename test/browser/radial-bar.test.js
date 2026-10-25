import { expect, test } from '#test';

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

test('horizontal bars use a numeric x axis and top-to-bottom category labels', async ({ page }) => {
    const ticks = await page.evaluate(() => {
        const x = [];
        const y = [];

        window.makeChart({
            orientation: 'horizontal',
            scales: {
                x: { ticks: { callback: (value) => {
                    x.push(value); return value;
                } } },
                y: { ticks: { callback: (value) => {
                    y.push(value); return value;
                } } },
            },
        });

        return { x, y };
    });

    expect(ticks.x).toContain(0);
    expect(ticks.x).toContain(20);
    expect(ticks.y).toEqual(['A', 'B']);

    await page.evaluate(() => window.makeChart({ orientation: 'horizontal', tooltip: { position: 'fixed' } }));

    const canvas = page.locator('canvas');
    const bounds = await canvas.boundingBox();

    await page.mouse.move(bounds.x + 160, bounds.y + 110);
    await expect(canvas).toHaveAttribute('aria-description', 'A. Sales: 10');
    await page.mouse.move(bounds.x + 500, bounds.y + 290);
    await expect(canvas).toHaveAttribute('aria-description', 'B. Sales: 20');
});

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

    expect(pixels).toEqual({ top: 255, right: 255, center: 51, outside: 0 });

    const canvas = page.locator('canvas');
    const bounds = await canvas.boundingBox();

    await page.mouse.move(bounds.x + 300, bounds.y + 110);
    await expect(canvas).toHaveAttribute('aria-description', 'North. Profile: 10');
});

for (const type of ['radar', 'polarArea']) {
    test(`${type} handles empty and zero data, resize, and negative-value rejection`, async ({ page }) => {
        const result = await page.evaluate((chartType) => {
            window.makeChart({ type: chartType, data: { labels: [], datasets: [] } });
            window.chart.setData({ labels: ['Only'], datasets: [{ data: [0] }] });

            let rejected = false;

            try {
                window.chart.setData({ labels: ['Bad'], datasets: [{ data: [-1] }] });
            } catch {
                rejected = true;
            }

            document.getElementById('chart').style.width = '60px';
            document.getElementById('chart').style.height = '60px';
            window.chart.resize();

            return { rejected, values: window.chart.getValues(), width: document.querySelector('canvas').width };
        }, type);

        expect(result).toEqual({ rejected: true, values: [0], width: 60 });
    });
}

test('invalid bar and tooltip settings and overflowing stacks are rejected atomically', async ({ page }) => {
    const rejected = await page.evaluate(() => {
        window.makeChart();

        const settings = [
            { orientation: 'diagonal' },
            { stacked: 'yes' },
            { legend: { interactive: 'yes' } },
            { tooltip: { borderRadius: -1 } },
            { tooltip: { arrowSize: Infinity } },
            { stacked: true, data: { labels: ['A'], datasets: [{ data: [Number.MAX_VALUE] }, { data: [Number.MAX_VALUE] }] } },
        ];
        let count = 0;

        for (const update of settings) {
            try {
                window.chart.setSettings(update);
            } catch {
                count++;
            }
        }

        return { count, values: window.chart.getValues() };
    });

    expect(rejected).toEqual({ count: 6, values: [10, 20] });
});

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
        expect(labels.every((label) => label.align === 'center' && label.baseline === 'middle')).toBe(true);
        expect(new Set(labels.map((label) => label.x)).size).toBe(1);
    });
}
