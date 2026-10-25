import { expect, test } from '#test';

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

test('auto-height containers stabilize and retain their original content', async ({ page }) => {
    await page.evaluate(() => {
        const node = document.getElementById('chart');

        node.style.height = 'auto';
        window.makeChart();
    });

    await expect(page.locator('canvas')).toHaveAttribute('height', '300');

    await page.evaluate(() => {
        for (let index = 0; index < 10; index++) {
            window.chart.resize();
        }
    });

    await expect(page.locator('canvas')).toHaveAttribute('height', '300');
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

test('enabling responsive sizing measures changes made while it was disabled', async ({ page }) => {
    await page.evaluate(() => {
        window.makeChart({ responsive: false });
        document.getElementById('chart').style.width = '320px';
    });

    await expect(page.locator('canvas')).toHaveAttribute('width', '600');

    await page.evaluate(() => window.chart.setSettings({ responsive: true }));

    await expect(page.locator('canvas')).toHaveAttribute('width', '320');
});
