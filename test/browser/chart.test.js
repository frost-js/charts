import { expect, test } from '#test';

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
        window.chart.options.data.datasets[0].data[0] = 9;

        return {
            values: window.chart.getValues(),
            labels: window.chart.getLabels(),
            min: window.chart.getScaleMin(),
            max: window.chart.getScaleMax(),
        };
    });

    expect(result).toEqual({ values: [-500], labels: ['New'], min: -500, max: 0 });
});

test('invalid updates leave the existing chart intact', async ({ page }) => {
    const result = await page.evaluate(() => {
        window.makeChart();

        const invalid = [
            { labels: ['A'], datasets: [{ data: [] }] },
            { labels: ['A'], datasets: [{ data: [NaN] }] },
            { labels: ['A'], datasets: [{ data: [Infinity] }] },
            { labels: ['A'], datasets: [{ data: ['1'] }] },
            { labels: ['A'], datasets: [{ data: [1], backgroundColor: [] }] },
            { labels: ['A'], datasets: [{ data: [1], borderWidth: -1 }] },
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
            { animation: { duration: -1 } },
            { title: { position: 'bad' } },
            { font: { size: 0 } },
            { tooltip: { padding: -1 } },
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

    expect(result).toEqual({ errors: 11, values: [10, 20], type: 'bar' });
});

test('rejects negative pies and cleans up failed construction', async ({ page }) => {
    const result = await page.evaluate(() => {
        let error;
        const node = document.getElementById('chart');

        try {
            new UI.Chart(node, {
                type: 'pie',
                data: { labels: ['A'], datasets: [{ data: [-1] }] },
            });
        } catch (caught) {
            error = caught.message;
        }

        const canvasCount = node.querySelectorAll('canvas').length;
        window.makeChart();
        window.chart.setData({ labels: ['A'], datasets: [{ data: [-1] }] });
        let rejected = false;

        try {
            window.chart.setSettings({ type: 'pie' });
        } catch {
            rejected = true;
        }

        return {
            error,
            canvasCount,
            rejected,
            type: window.chart.options.type,
            registered: UI.Chart.init(node) === window.chart,
        };
    });

    expect(result).toEqual({
        error: expect.stringContaining('nonnegative'),
        canvasCount: 0,
        rejected: true,
        type: 'bar',
        registered: true,
    });
});

test('bar coordinates are correct after scroll and CSS scaling', async ({ page }) => {
    await page.evaluate(() => {
        window.makeChart();
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

test('negative and positive bars extend on opposite sides of zero', async ({ page }) => {
    const result = await page.evaluate(() => {
        window.makeChart({ data: {
            labels: ['Negative', 'Positive'],
            datasets: [{ data: [-10, 10], backgroundColor: ['red', 'blue'], borderWidth: 0 }],
        } });
        const context = document.querySelector('canvas').getContext('2d');
        return [[160, 290], [440, 110], [160, 110], [440, 290]].map(([x, y]) => [...context.getImageData(x, y, 1, 1).data]);
    });

    expect(result).toEqual([[255, 0, 0, 255], [0, 0, 255, 255], [0, 0, 0, 0], [0, 0, 0, 0]]);
});

test('pie preserves combined datasets and individual slice colors', async ({ page }) => {
    const result = await page.evaluate(() => {
        window.makeChart({
            type: 'pie',
            data: { labels: ['A', 'B'], datasets: [{ label: 'Outer', data: [1, 1], backgroundColor: ['red', 'blue'], borderWidth: 0 }, { label: 'Inner', data: [1, 1], backgroundColor: ['lime', 'yellow'], borderWidth: 0 }] },
        });
        const context = document.querySelector('canvas').getContext('2d');
        return [[400, 300], [200, 300], [200, 100], [400, 100]].map(([x, y]) => [...context.getImageData(x, y, 1, 1).data]);
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

for (const position of ['top', 'right', 'bottom', 'left']) {
    test(`lays out title and legend at ${position} with formatters`, async ({ page }) => {
        const result = await page.evaluate((position) => {
            const labels = [];
            window.makeChart({ title: {
                display: true,
                text: 'A long title that wraps in narrow containers',
                position,
            }, legend: { display: true, position }, scales: { x: { ticks: { callback: (value) => {
                labels.push(value); return `Label ${value}`;
            } } }, y: { ticks: { callback: (value) => `$${value}` } } } });
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

test('resize tracks the container and disposal preserves original children', async ({ page }) => {
    await page.evaluate(() => {
        const node = document.getElementById('chart');
        node.innerHTML = '<span id="original">Original content</span>';
        window.makeChart();
        node.style.width = '350px';
        node.style.height = '240px';
    });

    await expect(page.locator('canvas')).toHaveAttribute('width', '350');
    await expect(page.locator('canvas')).toHaveAttribute('height', '240');
    const result = await page.evaluate(() => {
        const node = document.getElementById('chart');
        window.chart.dispose();
        window.chart.dispose();
        window.chart.update();
        window.chart.render();
        window.chart.resize();
        return {
            node: window.chart.node,
            options: window.chart.options,
            registered: window.fQuery.hasData(node, UI.Chart.DATA_KEY),
            children: node.innerHTML,
        };
    });

    expect(result).toEqual({
        node: null,
        options: null,
        registered: false,
        children: '<span id="original">Original content</span>',
    });
});

test('hidden chart recovers when shown and supports manual resize', async ({ page }) => {
    await page.evaluate(() => {
        document.getElementById('chart').style.display = 'none';
        window.makeChart({ responsive: false });
        document.getElementById('chart').style.display = '';
        window.chart.resize();
    });

    await expect(page.locator('canvas')).toHaveAttribute('width', '600');
});

test('finite extremes and tiny data produce bounded scales', async ({ page }) => {
    const results = await page.evaluate(() => {
        window.makeChart();
        return [[-1e308, 1e308], [0, 5e-324], [0, 1.79e308], [.00001, .00002], [3, 3]].map((values) => {
            window.chart.setData({ labels: ['A', 'B'], datasets: [{ data: values }] });
            const scale = window.chart.getScale();
            return scale.length >= 2 && scale.length <= 23 && scale.every(Number.isFinite) && scale[0] <= Math.min(...values) && scale.at(-1) >= Math.max(...values);
        });
    });

    expect(results).toEqual([true, true, true, true, true]);
});

test('canvas tooltips treat labels as text and can be disabled', async ({ page }) => {
    await page.evaluate(() => {
        window.makeChart({
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

    await page.evaluate(() => window.chart.setSettings({ tooltip: { display: false } }));
    await page.mouse.move(bounds.x + 301, bounds.y + 200);
    await expect(canvas).not.toHaveAttribute('aria-description');
});

test('query plugin reuses instances and disposes on query removal', async ({ page }) => {
    const result = await page.evaluate(() => {
        const node = document.getElementById('chart');
        const chart = window.fQuery(node).chart({ animation: { duration: 0 } });
        const same = UI.Chart.init(node) === chart;
        window.fQuery(node).remove();
        return { same, disposed: chart.node === null };
    });

    expect(result).toEqual({ same: true, disposed: true });
});

test('high DPI uses a larger backing canvas without changing hit coordinates', async ({ browser }) => {
    const context = await browser.newContext({ deviceScaleFactor: 2, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    await page.evaluate(() => {
        document.body.innerHTML = '<div id="chart" style="width:600px;height:400px"></div>';
        new UI.Chart(document.getElementById('chart'), {
            data: { labels: ['A'], datasets: [{ data: [1] }] },
            legend: { display: false },
            scales: { x: { display: false }, y: { display: false } },
        });
    });

    await expect(page.locator('canvas')).toHaveAttribute('width', '1200');
    const rect = await page.locator('canvas').boundingBox();
    await page.mouse.move(rect.x + 300, rect.y + 200);
    await expect(page.locator('canvas')).toHaveAttribute('aria-description', 'A. Dataset 1: 1');
    await context.close();
});

test('animation finishes and disposal cancels pending frames', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(() => {
        window.drawCount = 0;
        const draw = UI.Chart.prototype.draw;
        UI.Chart.prototype.draw = function() {
            window.drawCount++; return draw.call(this);
        };
        window.makeChart({ animation: { duration: 100 } });
    });

    await page.waitForTimeout(200);
    const before = await page.evaluate(() => window.drawCount);
    await page.waitForTimeout(80);
    expect(await page.evaluate(() => window.drawCount)).toBe(before);
    await page.evaluate(() => {
        window.chart.run();
        window.chart.setData({ labels: ['New'], datasets: [{ data: [50] }] });
        window.chart.dispose();
    });
    const after = await page.evaluate(() => window.drawCount);
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => window.drawCount)).toBe(after);
});
