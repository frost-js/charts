# Frost Charts

[![CI](https://github.com/frost-js/charts/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/frost-js/charts/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/frost-js/charts/branch/master/graph/badge.svg)](https://codecov.io/gh/frost-js/charts)
[![npm version](https://img.shields.io/npm/v/%40fr0st%2Fcharts?style=flat-square)](https://www.npmjs.com/package/@fr0st/charts)
[![npm downloads](https://img.shields.io/npm/dm/%40fr0st%2Fcharts?style=flat-square)](https://www.npmjs.com/package/@fr0st/charts)
[![JS gzip size](https://img.badgesize.io/frost-js/charts/master/dist/frost-charts.min.js?compression=gzip&label=JS%20gzip%20size&style=flat-square)](https://github.com/frost-js/charts/blob/master/dist/frost-charts.min.js)
[![license](https://img.shields.io/github/license/frost-js/charts?style=flat-square)](./LICENSE)

Standalone canvas bar, line, area, pie, donut, scatter, polar area, and radar charts with no runtime dependencies. Charts support horizontal and stacked bars, titles, interactive legends, configurable axes, animated updates, pointer tooltips, responsive sizing, and high-DPI rendering.

## Installation

```sh
npm install @fr0st/charts
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
                borderWidth: 1,
            },
        ],
    },
});
```

A named `Chart` export is also available. The UMD bundles expose `window.Chart` and work without a module loader, Frost UI, or a stylesheet:

```html
<script src="node_modules/@fr0st/charts/dist/frost-charts.js"></script>
<script>
    const chart = new Chart(document.getElementById('chart'), {
        data: {
            labels: ['A', 'B'],
            datasets: [{ label: 'Values', data: [10, 20] }],
        },
    });
</script>
```

## Data

Bar, line, area, pie, donut, polar area, and radar datasets must have one finite numeric value per label. Bar, line, and area charts accept negative values. Pie, donut, polar area, and radar charts reject negative values. Pie, donut, and polar area datasets contribute slices to one combined circle. Empty datasets and zero-valued circular charts render without errors.

Scatter datasets accept finite `{ x, y }` points. Labels are optional, datasets may have different lengths, and both axes use numeric scales. Points are drawn without connecting lines.

| Dataset option | Description |
| --- | --- |
| `label` | Legend and tooltip label; defaults to `Dataset 1`, `Dataset 2`, and so on. |
| `data` | Numeric values corresponding to `data.labels`. |
| `backgroundColor` | One CSS color or a repeating array of colors. |
| `borderColor` | One CSS color or a repeating array of colors. |
| `borderWidth` | Nonnegative border width; defaults to `1`. Set `0` to omit borders. |
| `pointRadius` | Line/area/radar point radius; defaults to `2`, or `4` for scatter. |
| `fillOpacity` | Fill opacity from `0` to `1`: `.2` for area/radar polygons and `.75` for polar sectors. Area/radar fills use the first background color in the dataset. |

The default palette starts with indigo, teal, amber, and pink and contains twelve colors. Cartesian and radar series receive one color per dataset; pie, donut, and polar area slices cycle through the palette. Explicit dataset colors override the defaults. Grid lines use a soft gray, axis borders a slightly darker gray, and ticks inherit their grid color unless `tickColor` is supplied.

Inputs and data getter results are copied. Changing the original data object does not change a chart; call `setData` to apply an update. `chart.options` is a deeply frozen snapshot, reused until data or settings change. Invalid data and unsupported chart types are rejected before replacing the current state.

Numeric strings are accepted for values, coordinates, and numeric settings. Invalid numeric settings fall back to defaults; negative dimensions clamp to zero, and fill opacity clamps to the range 0–1. Invalid font sizes and donut cutouts use their defaults.

## Options

The original option groups remain available. Area and scatter reuse the line renderer; donut reuses the pie renderer. See `Chart.defaults` in [src/chart.js](src/chart.js) for the complete defaults.

| Option | Default | Description |
| --- | --- | --- |
| `type` | `'bar'` | `'bar'`, `'line'`, `'area'`, `'pie'`, `'donut'`, `'scatter'`, `'polarArea'`, or `'radar'`. |
| `orientation` | `'vertical'` | Bar direction: `'vertical'` or `'horizontal'`. |
| `stacked` | `false` | Stack bar datasets; positive and negative values accumulate separately. |
| `cutout` | `.6` | Donut inner radius as a fraction of the outer radius, from `0` up to but excluding `1`. |
| `title.display` | `true` | Displays the chart title. |
| `title.text` | `'Title'` | Title text, wrapped to the available space. |
| `title.position` | `'top'` | `'top'`, `'right'`, `'bottom'`, or `'left'`. |
| `title.align` | `'center'` | Alignment along the title edge. |
| `legend.display` | `true` | Displays dataset keys, or slice keys for pie, donut, and polar area charts. |
| `legend.interactive` | `true` | Click keys to hide/show datasets, or individual circular slices. Native buttons provide keyboard access. |
| `legend.labels.textAlign` | `'start'` | Aligns entries within rows or columns; side legends share a left edge by default. |
| `legend.position` | `'top'` | The edge containing the legend. |
| `legend.align` | `'center'` | `'start'`, `'center'`, or `'end'`. |
| `legend.maxWidth`, `legend.maxHeight` | `null` | Optional limits in CSS pixels. Items that cannot fit are omitted. |
| `font` | 12px Helvetica/Arial | Base font inherited by titles, legends, ticks, and tooltips. |
| `scales.x`, `scales.y` | Visible | Each axis has `display`, `grid`, and `ticks` settings. Used by Cartesian charts. Horizontal bars use numeric x ticks and category y labels. |
| `scales.r` | Visible | Radial `grid`, numeric `ticks`, and category `labels` for radar and polar area charts. |
| `layout.padding` | `20` | Outer padding in CSS pixels. |
| `animation.duration` | `300` | Animation duration for all chart types in milliseconds. Set `0` to disable; reduced-motion preferences disable it automatically. |
| `animation.easing` | `'easeOutQuad'` | `'linear'`, `'easeOutQuad'`, or `'easeInOutQuad'`. |
| `tooltip.position` | `'fixed'` | Anchor beside the hovered mark, or use `'cursor'` to follow the pointer. Placement flips near edges and stays stable while moving within a mark. |
| `tooltip.display` | `true` | Shows a canvas tooltip for the hovered mark. |
| `tooltip.padding` | `10` | Tooltip padding in CSS pixels. |
| `tooltip.borderRadius` | `6` | Tooltip corner radius in CSS pixels. |
| `tooltip.arrowSize` | `5` | Tooltip pointer size; set `0` to omit it. |
| `tooltip.backgroundColor` | `'rgba(24, 28, 36, .92)'` | Slightly translucent background; text remains opaque. |
| `responsive` | `true` | Observes container resizing. |
| `ariaLabel` | `'Chart'` | Prefix for the accessible description containing labels and values. |

Bars and Cartesian points animate from the zero baseline on first render. Pie and donut slices sweep into view; radar and polar area marks grow from the center. Data updates interpolate to the new geometry, and interrupted transitions continue from their visible positions. Set `animation.duration` to `0` to render immediately.

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

## Chart variants

An area chart uses the same labeled data as a line chart:

```js
chart.setSettings({ type: 'area' });
```

A donut uses the same nonnegative data as a pie:

```js
chart.setSettings({ type: 'donut', cutout: .65 });
```

Scatter accepts numeric coordinates instead of category values:

```js
const chart = new Chart(node, {
    type: 'scatter',
    data: {
        datasets: [
            {
                label: 'Observations',
                data: [{ x: 1, y: 3 }, { x: 4, y: 8 }, { x: 10, y: 6 }],
            },
        ],
    },
});
```

Horizontal and stacked bars use the same data as grouped bars:

```js
chart.setSettings({ type: 'bar', orientation: 'horizontal', stacked: true });
```

Set `orientation: 'vertical'` for vertical stacks, or `stacked: false` for grouped bars. Stack totals determine the value scale. Nonfinite totals are rejected before applying an update.

Radar charts connect each dataset across equally spaced category spokes. Polar area charts give each visible value an equal angle and a radius proportional to its value:

```js
chart.setSettings({ type: 'radar' });
chart.setSettings({ type: 'polarArea' });
```

Both use nonnegative labeled data and `scales.r` for their guides. Its `grid` settings control radial line color and width; `ticks` control centered scale numbers and formatting; `labels` control category text and padding. Set `scales.r.display: false` to hide all radial guides and labels. Polar sectors default to `fillOpacity: .75` so the underlying scale remains visible.

## Legend interaction

Click a legend key, or tab to its native button and press Space or Enter. Hidden keys are faded and struck through, and the scale is recalculated from visible data. Bar, line, area, scatter, and radar keys toggle datasets; pie, donut, and polar area keys toggle individual slices. Set `legend.interactive: false` for a display-only legend.

Visibility is preserved by dataset/item index across updates. Removing an index clears its hidden state. Data and colors remain available through `getData()` while hidden. You can also control visibility directly:

```js
chart.setDatasetVisibility(0, false);
chart.setDatasetVisibility(0, true);
chart.setDataVisibility(0, 2, false); // Hide the third circular slice in the first dataset.
```

## Methods

| Method | Behavior |
| --- | --- |
| `setData({ labels, datasets })` | Validates and replaces data, recalculates the scale, and redraws. |
| `setSettings(options)` | Merges settings, rebuilds the layers, and redraws. Can change chart type and data together. |
| `getData()` | Returns the normalized datasets. |
| `getLabels()` | Returns the category labels. |
| `getValues(axis = 'y')` | Returns values from visible datasets and items; scatter supports `'x'` or `'y'`. |
| `getScale(axis = 'y')`, `getScaleMin(axis = 'y')`, `getScaleMax(axis = 'y')` | Return the numeric scale or its boundaries. Use `'x'` for scatter or horizontal bars. The default returns the value scale for other chart types. |
| `isDatasetVisible(index)`, `setDatasetVisibility(index, visible)` | Read or change dataset visibility. |
| `isDataVisible(datasetIndex, index)`, `setDataVisibility(datasetIndex, index, visible)` | Read item visibility or toggle a circular slice. |
| `update()` | Recalculates layout and data and starts the configured animation. |
| `calculate()` | Recalculates layer bounds and data geometry. |
| `render()` | Renders all layers at their final positions immediately. |
| `draw()` | Composites the current layers. |
| `run()` | Starts the current chart transition. |
| `resize()` | Measures the container and redraws, including when `responsive` is disabled. |
| `dispose()` | Cancels animation, removes observers and listeners, and removes the generated canvas and legend controls. Safe to call more than once. |

`Chart.init(node, options)` returns the existing chart for a container or creates one. Calling the constructor twice on the same container throws; dispose the old chart before replacing it. Call `dispose()` before removing a container from the DOM to release its listeners and observer.

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

Open `demo/index.html` directly in a browser, or serve the repository with your preferred static server. The demos load the Frost UI 4 stylesheet from jsDelivr for presentation and the standalone chart bundle from `dist/`; no installed dependencies are needed to view them. Frost UI JavaScript and query are not used. The sidebar links to chart types, legend placements, and tooltip examples. The examples share the default palette and chart styling; the demos do not include theme synchronization. Generated ESM and UMD bundles, minified variants, and source maps are tracked in `dist/`, matching the sibling projects.

Chart renderers live in `src/charts/`; shared visual layers live in `src/layers/`. The public entry point and `Chart` class aliases remain unchanged.

## Migration from the unfinished prototype

Keep using `new Chart(...)` in browser scripts, and load `frost-charts.js` instead of `frost-chart.js`. FrostUI, Core, and dom are no longer required. The package entry point resolves to the ESM bundle.

If using the earlier completion baseline, replace `new UI.Chart(...)` or `fQuery(...).chart()` with `new Chart(...)` or `Chart.init(...)`. Charts no longer inherit from UI.BaseComponent or use UI data attributes; supply options directly and call `dispose()` before removing the container.

The additional `Chart.Area`, `Chart.Donut`, and `Chart.Scatter` aliases expose the shared variant renderers. `Chart.PolarArea` and `Chart.Radar` expose the radial renderers. The original layer responsibilities and `Chart.Bar`, `Chart.Line`, `Chart.Pie`, `Chart.Grid`, `Chart.Layer`, `Chart.Legend`, `Chart.Rect`, `Chart.Title`, and `Chart.Tooltip` class aliases remain. Internal underscore fields and methods are now private; direct access to prototype internals is unsupported.

The initial prototype is preserved in commit `a0b4404`.

## License

MIT. See [LICENSE](LICENSE).
