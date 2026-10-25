import { expect, test } from '#test';
import { setupChart } from '../setup/chart.js';

test.describe('Chart', () => {
    test.beforeEach(setupChart);

    test.describe('#init', () => {
        test('rejects negative pies and cleans up failed construction', async ({ page }) => {
            const result = await page.evaluate(() => {
                let error;
                const node = document.getElementById('chart');

                try {
                    new Chart(node, {
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
                    registered: Chart.init(node) === window.chart,
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

        test('initialization reuses charts and disposal releases the container and listeners', async ({ page }) => {
            const result = await page.evaluate(() => {
                const node = document.getElementById('chart');
                const chart = new Chart(node, { animation: { duration: 0 } });
                const canvas = node.querySelector('canvas');
                const same = Chart.init(node) === chart;
                let duplicateRejected = false;

                try {
                    new Chart(node);
                } catch {
                    duplicateRejected = true;
                }

                chart.dispose();

                // These would access disposed state if their listeners were still attached.
                canvas.dispatchEvent(new PointerEvent('pointerleave'));
                window.dispatchEvent(new Event('resize'));

                const replacement = Chart.init(node, { animation: { duration: 0 } });

                return {
                    same,
                    duplicateRejected,
                    disposed: chart.node === null,
                    replaced: replacement !== chart,
                    canvases: node.querySelectorAll('canvas').length,
                    hasUI: 'UI' in window,
                    hasQuery: 'fQuery' in window,
                };
            });

            expect(result).toEqual({
                same: true,
                duplicateRejected: true,
                disposed: true,
                replaced: true,
                canvases: 1,
                hasUI: false,
                hasQuery: false,
            });
        });
    });

    test.describe('#dispose', () => {
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
                    canvases: node.querySelectorAll('canvas').length,
                    children: node.innerHTML,
                };
            });

            expect(result).toEqual({
                node: null,
                options: null,
                canvases: 0,
                children: '<span id="original">Original content</span>',
            });
        });
    });

    test.describe('#resize', () => {
        test('hidden chart recovers when shown and supports manual resize', async ({ page }) => {
            await page.evaluate(() => {
                document.getElementById('chart').style.display = 'none';
                window.makeChart({ responsive: false });
                document.getElementById('chart').style.display = '';
                window.chart.resize();
            });

            await expect(page.locator('canvas')).toHaveAttribute('width', '600');
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
    });

    test.describe('high DPI', () => {
        test.use({ deviceScaleFactor: 2 });

        test('high DPI uses a larger backing canvas without changing hit coordinates', async ({ page }) => {
            await page.evaluate(() => {
                new Chart(document.getElementById('chart'), {
                    data: { labels: ['A'], datasets: [{ data: [1] }] },
                    legend: { display: false },
                    scales: { x: { display: false }, y: { display: false } },
                });
            });

            await expect(page.locator('canvas')).toHaveAttribute('width', '1200');
            const rect = await page.locator('canvas').boundingBox();
            await page.mouse.move(rect.x + 300, rect.y + 200);
            await expect(page.locator('canvas')).toHaveAttribute('aria-description', 'A. Dataset 1: 1');
        });
    });
});
