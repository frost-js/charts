# Frost Charts completion proposal

Complete this canvas library as a standalone FrostJS package with bar, line, and pie chart features and no runtime dependencies. Preserve the original work in the initial Git commit, then replace the concatenated global scripts with explicit ES modules and test the resulting public API in real browsers.

## Package conventions

Use `@fr0st/charts`, matching this repository name and the scoped naming in `../color` and `../ui-slider`. Keep version `1.0.0` until a release is explicitly requested. Follow `../color` for standalone ESM and UMD entry points, and `../ui-slider` for Vite builds with source maps, shared ESLint configuration, Playwright browser tests, coverage, and CI. Include an MIT license, package exports, README, local demos, and a reproducible lockfile. Track generated bundles as the siblings do.

The module entry point exports `Chart`; the UMD build exposes `window.Chart`. Replace the old `Core`, `dom`, and UI component integration with native DOM APIs, explicitly owned listeners and observers, and a private instance registry for `Chart.init`. Use lowercase module filenames and direct imports. Keep renderers in `src/charts/` and shared visual layers in `src/layers/`. Document migration from the earlier UI-based baseline and the prototype's `frost-chart.js` bundle name.

## Source conventions

Retain the original `Chart`, `Layer`, title, legend, axis-label, grid, bar, line, pie, tooltip, and rectangle responsibilities. Use `../ui-editor/src/js/editor.js` as the style reference: static defaults in the component class, private fields and methods, multiline JSDoc, explicit control flow, and blank lines between logical statement groups. Keep normalization, option validation, and scale calculations readable in focused modules. Move existing code to lowercase module filenames without retaining empty legacy directories.

## Functional scope

- Complete grouped bars, line series with points, and colored pie slices. Preserve the original combined pie when multiple datasets are supplied.
- Retain the existing `{ labels, datasets }` input and title, legend, font, layout, and scale option groups. Validate data before changing a live chart; copy inputs and returned data to avoid accidental mutation.
- Make empty, zero, constant, negative Cartesian, single-label, and narrow-container data safe. Reject negative pie values and nonfinite values with useful errors. Recalculate scales after every update and resize.
- Finish title wrapping and placement, legend placement and wrapping, tick formatting, grid visibility, dataset colors, and borders.
- Replace accumulating hover callbacks with current-frame geometry. Support canvas-local pointer coordinates, hover highlighting, the unfinished canvas tooltip layer, and accessible canvas descriptions.
- Animate bars, line points, and pie angles using elapsed time, respect reduced motion, and cancel superseded frames. Resize with the container and device pixel ratio. Dispose observers, events, animation frames, generated DOM, and registered chart state.
- Support `setData`, `setSettings`, `getData`, `getLabels`, `getValues`, scale getters, `update`, `render`, `draw`, `resize`, and `dispose`; retain `calculate` and `run` as compatibility methods. Keep the original layer classes and static class aliases, with private internal fields and explicit shared layer interfaces.

## Existing defects to resolve

The current line and pie paths call a missing `data` method. `setData` ignores its parameter and mutates caller datasets. Scales remain cached after changes, fail for empty or zero ranges, and depend on browser-specific font metrics. Single-point lines divide by zero. Bars can have negative widths; their animation accumulates elapsed time incorrectly and creates hover callbacks on every frame. Pointer coordinates are in viewport space while paths are local to layers. Pie slices ignore dataset colors. Tooltip drawing is unreachable. Visibility options are inconsistently honored, and there is no resize or disposal lifecycle. The package entry point does not exist and its test command always fails.

## Acceptance checks

Run shared lint, build all four bundles, and validate package contents. Exercise actual canvas rendering, public data/settings updates, invalid-input rollback, scale boundaries, colors, layout, tooltip hit testing after scroll and CSS scaling, animation cancellation, high-DPI sizing, resize, and disposal in Chromium, Firefox, and WebKit. Add coverage reporting and CI using the sibling workflows as references. Use the Frost UI stylesheet from the CDN for demo presentation, following the sibling projects. Run chart behavior tests without UI or query, and omit separate demo and bundle test suites.

Publishing, remote repository changes, new chart families, stacking, zooming, and a general plugin API are outside this completion pass.
