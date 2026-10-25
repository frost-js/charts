import { expect, test } from '#test';

for (const file of ['frost-charts.esm.js', 'frost-charts.esm.min.js']) {
    test(`${file} exports and registers Chart with its peer dependencies`, async ({ page }) => {
        const state = await page.evaluate(async (file) => {
            const { default: Chart, Chart: NamedChart } = await import(`/assets/${file}`);
            const { default: $ } = await import('@fr0st/query');
            const { BaseComponent } = await import('@fr0st/ui');
            const node = document.getElementById('chart');
            const chart = new Chart(node, {
                animation: { duration: 0 },
                data: {
                    labels: ['A'],
                    datasets: [{ data: [1] }],
                },
            });

            const result = {
                namedExport: Chart === NamedChart,
                component: chart instanceof BaseComponent,
                registered: $(node).chart() === chart,
                privateState: Object.keys(chart),
                optionsFrozen: Object.isFrozen(chart.options),
                values: chart.getValues(),
            };

            chart.dispose();

            return result;
        }, file);

        expect(state).toEqual({
            namedExport: true,
            component: true,
            registered: true,
            privateState: [],
            optionsFrozen: true,
            values: [1],
        });
    });
}

test('minified UMD extends the existing UI namespace', async ({ page }) => {
    await page.addScriptTag({ url: '/assets/frost-charts.min.js' });

    const state = await page.evaluate(() => {
        window.makeChart({ type: 'line' });

        return {
            component: window.chart instanceof UI.BaseComponent,
            registered: window.fQuery('#chart').chart() === window.chart,
            layer: typeof UI.Chart.Layer,
            values: window.chart.getValues(),
        };
    });

    expect(state).toEqual({
        component: true,
        registered: true,
        layer: 'function',
        values: [10, 20],
    });
});
