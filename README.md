# Frost Charts

Canvas bar, line, and pie charts for Frost UI. Charts support titles, legends, configurable axes, animated bar updates, pointer tooltips, responsive sizing, and high-DPI rendering.

## Installation

```sh
npm install @fr0st/charts @fr0st/query @fr0st/ui
```

The build tooling requires Node.js `^20.19.0 || ^22.13.0 || >=24`. The library targets browsers supported by the sibling Frost UI packages.

## Usage

Give the container a height; containers without an intrinsic height use 300 pixels.

```html
<div id="chart" style="height: 400px;"></div>
```

```js
import Chart from '@fr0st/charts';

const chart = new Chart(document.getElementById('chart'), {
    type: 'bar',
    title: {
        text: 'Quarterly sales',
    },
    data: {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [
            {
                label: 'Sales',
                data: [12, 18, -4, 24],
                backgroundColor: '#2563eb',
                borderColor: '#1d4ed8',
                borderWidth: 1,
            },
        ],
    },
});
```

A named `Chart` export is also available. The UMD bundles extend `UI.Chart` and register the `fQuery(...).chart()` component method:

```html
<script src="node_modules/@fr0st/ui/dist/frost-ui-bundle.js"></script>
<script src="node_modules/@fr0st/charts/dist/frost-charts.js"></script>
<script>
    const chart = new UI.Chart(document.getElementById('chart'), {
        data: {
            labels: ['A', 'B'],
            datasets: [{ label: 'Values', data: [10, 20] }],
        },
    });
</script>
```

## Data

Every dataset must have one finite numeric value per label. Bar and line charts accept negative values. Pie charts reject negative values; all datasets contribute slices to one combined pie, as in the original implementation. Empty datasets and zero-valued pies render without errors.

| Dataset option | Description |
| --- | --- |
| `label` | Legend and tooltip label; defaults to `Dataset 1`, `Dataset 2`, and so on. |
| `data` | Numeric values corresponding to `data.labels`. |
| `backgroundColor` | One CSS color or a repeating array of colors. |
| `borderColor` | One CSS color or a repeating array of colors. |
| `borderWidth` | Nonnegative border width; defaults to `1`. Set `0` to omit borders. |
| `pointRadius` | Line point radius; defaults to `2`. |

Inputs and getter results are copied. Changing the original data object does not change a chart; call `setData` to apply an update. Invalid data or settings are rejected before replacing the current state.

## Options

The original option groups remain available. See `Chart.defaults` in [src/chart.js](src/chart.js) for the complete defaults.

| Option | Default | Description |
| --- | --- | --- |
| `type` | `'bar'` | `'bar'`, `'line'`, or `'pie'`. |
| `title.display` | `true` | Displays the chart title. |
| `title.text` | `'Title'` | Title text, wrapped to the available space. |
| `title.position` | `'top'` | `'top'`, `'right'`, `'bottom'`, or `'left'`. |
| `title.align` | `'center'` | Alignment along the title edge. |
| `legend.display` | `true` | Displays dataset keys, or category keys for a pie. |
| `legend.position` | `'top'` | The edge containing the legend. |
| `legend.align` | `'center'` | `'start'`, `'center'`, or `'end'`. |
| `legend.maxWidth`, `legend.maxHeight` | `null` | Optional limits in CSS pixels. Items that cannot fit are omitted. |
| `font` | 12px Helvetica/Arial | Base font inherited by titles, legends, ticks, and tooltips. |
| `scales.x`, `scales.y` | Visible | Each axis has `display`, `grid`, and `ticks` settings. Ignored for pies. |
| `layout.padding` | `20` | Outer padding in CSS pixels. |
| `animation.duration` | `500` | Bar animation duration in milliseconds. Set `0` to disable; reduced-motion preferences disable it automatically. |
| `tooltip.display` | `true` | Shows a canvas tooltip for the hovered mark. |
| `tooltip.padding` | `8` | Tooltip padding in CSS pixels. |
| `responsive` | `true` | Observes container resizing. |
| `ariaLabel` | `'Chart'` | Prefix for the accessible description containing labels and values. |

Each `font` object accepts `family`, `size`, `weight`, `style`, and `lineHeight`. Layer fonts inherit from the base font. Grid options include `display`, `drawBorder`, `borderColor`, `borderWidth`, `lineColor`, `lineWidth`, and `tickLength`. Tick options include `display`, `drawTicks`, `padding`, `font`, `color`, and `callback(value, index)`.

```js
chart.setSettings({
    scales: {
        y: {
            ticks: {
                callback: (value) => `$${value}`,
            },
        },
    },
});
```

## Methods

| Method | Behavior |
| --- | --- |
| `setData({ labels, datasets })` | Validates and replaces data, recalculates the scale, and redraws. |
| `setSettings(options)` | Merges settings, rebuilds the layers, and redraws. Can change chart type and data together. |
| `getData()` | Returns the normalized datasets. |
| `getLabels()` | Returns the category labels. |
| `getValues()` | Returns values from all datasets. |
| `getScale()`, `getScaleMin()`, `getScaleMax()` | Return the current numeric scale or its boundaries. |
| `update()` | Recalculates layout and data and starts the configured animation. |
| `calculate()` | Recalculates layer bounds and data geometry. |
| `render()` | Renders all layers at their final positions immediately. |
| `draw()` | Composites the current layers. |
| `run()` | Starts the current bar transition. |
| `resize()` | Measures the container and redraws, including when `responsive` is disabled. |
| `dispose()` | Cancels animation, removes observers and listeners, and removes the generated canvas. Safe to call more than once. |

`Chart.init(node, options)` reuses an existing component. Removal through fQuery disposes it automatically; call `dispose()` before removing a container through native DOM methods.

## Development

```sh
npm ci
npx playwright install --with-deps
npm run lint
npm test
npm run test:coverage
npm pack --dry-run
```

`npm test` builds and tests Chromium, Firefox, and WebKit. `npm run test:browser -- --project=chromium` runs one browser against existing bundles. Coverage uses Chromium and reports source coverage in `coverage/`.

`npm run dev` serves the project; open `/demo/index.html`. The demos use locally installed dependencies. Generated ESM and UMD bundles, minified variants, and source maps are tracked in `dist/`, matching the sibling projects.

## Migration from the unfinished prototype

Use `UI.Chart` instead of the old standalone `window.Chart`, and load `frost-charts.js` instead of `frost-chart.js`. Replace FrostUI 1.x with the current `@fr0st/ui` and `@fr0st/query` peers. The package entry point now resolves to the ESM bundle.

The original layer responsibilities and `Chart.Bar`, `Chart.Line`, `Chart.Pie`, `Chart.Grid`, `Chart.Layer`, `Chart.Legend`, `Chart.Rect`, `Chart.Title`, and `Chart.Tooltip` class aliases remain. Internal underscore fields and methods are now private; direct access to prototype internals is unsupported.

The initial prototype is preserved in commit `a0b4404`. The completion scope is recorded in [PROPOSAL.md](PROPOSAL.md).

## License

MIT. See [LICENSE](LICENSE).
