# @xeplr/ui-charts

**Apache ECharts in React, driven by a semantic, CSS-like `ChartOptions` object.** `XeplrChart` translates the options — data, axes, legend, labels, chart type, theme values and conditional-formatting rules — into an ECharts `option` and renders it with ECharts directly, no wrapper library.

```jsx
import { XeplrChart } from '@xeplr/ui-charts'

<XeplrChart
  height={360}
  chartOptions={{
    chartType: 'bar',
    data: [{ dept: 'IPD', revenue: 180, margin: -4 }, { dept: 'OPD', revenue: 240, margin: 12 }],
    axes: { x: { labels: ['dept'] }, y: { labels: [{ field: 'revenue', name: 'Revenue (£k)' }] } },
    rules: [{ field: 'margin', op: 'lt', value: 0, target: 'mark', then: { color: '#c2372e' } }]
  }}
/>
```

## How the pieces fit

| what | where |
|---|---|
| The component | `XeplrChart` — `chartOptions` in, a sized `<div>` with a chart out |
| `ChartOptions` → ECharts `option` | `chartOptionsToOption` — pure, no React or ECharts |
| Conditions ("margin under zero") | [`@xeplr/rules`](https://www.npmjs.com/package/@xeplr/rules) — `matches`, operators, number formatting |
| What a match does on a chart | `lib/rules.js` — ECharts `itemStyle` callbacks and label formatters |
| Theme values (palette, fonts, per-type marks) | arrive **on** `ChartOptions` — typically from `@xeplr/ui-utils`' `resolveTheme`; nothing is registered here |
| Raw ECharts-shaped specs | `Chart` + `buildOption` |
| Init, resize, dispose | `useECharts` |
| The ECharts instance and its registered modules | `echarts` |

## Install

```sh
npm i @xeplr/ui-charts echarts
```

Peers: `echarts` (`^5.4.0`), `react` (17+). Dependency: `@xeplr/rules`. CommonJS, no JSX and no build step.

## Exports

| export | |
|---|---|
| `XeplrChart` | React component for `ChartOptions` |
| `chartOptionsToOption(chartOptions, { rootFontSize? })` | → `{ option, seriesLabel, chartType, warnings }`. `rootFontSize` (16) converts `rem` / `em` |
| `Chart` | React component for an ECharts-shaped `spec` |
| `buildOption(spec)` | → an ECharts `option` |
| `useECharts(option, { theme, renderer, optimize, onEvents, notMerge })` | → `{ containerRef, getInstance }` |
| `echarts` | the `echarts/core` instance with the default modules registered |

## XeplrChart props

| prop | default | |
|---|---|---|
| `chartOptions` | — | required |
| `width`, `height` | `chartOptions.width` / `height`, else `'100%'` / `320` | numbers are px |
| `top`, `left` | `chartOptions.top` / `left` | either one makes the container `position: absolute` |
| `renderer` | `'canvas'` | or `'svg'` |
| `theme` | — | a registered ECharts theme name — normally unset, since styling travels in `chartOptions` |
| `optimize` | — | `(option) => option`, applied just before `setOption` |
| `onWarnings` | — | `(string[])`; without it warnings go to `console.warn` |
| `silent` | `false` | suppress that `console.warn` |
| `onEvents` | — | `{ click: fn, … }`, bound when the chart is created |
| `notMerge` | `true` | `false` merges into the previous option (animates changes) |
| `style`, `className` | — | container |

`theme`, `renderer` and `onEvents` are fixed when the chart is created — ECharts cannot swap a theme or renderer live — so change them by remounting (a React `key`). The chart resizes with its container (`ResizeObserver`) and is disposed on unmount.

## ChartOptions

The full typedefs are in `type.js`. Sizes are CSS-like strings (`'12px'`, `'1rem'`, `'10pt'`, `'50%'`) or numbers.

| key | |
|---|---|
| `chartType` | an ECharts series type, or an alias — see Chart types |
| `data` | rows → `dataset.source` |
| `axes.x.labels` | the category field (`[0]`); a heatmap's second dimension is `[1]` |
| `axes.y.labels` | one series per entry: `'revenue'` or `{ field: 'revenue', name: 'Revenue (£k)' }` — the field is the data key, the name is what the legend shows |
| `axes.x` / `axes.y` | `show`, `line`, `grid`, `ticks` (`font`, `angle`, `margin`, `length`, `color`, `formatter`), `title` (`text`, `font`, `margin`), `boundaryGap`, `scale` |
| `title` | `show`, `text`, `font`, `positioning`, `style` |
| `legend` | `show`, `font`, `positioning`, `itemGap`, `style` |
| `tooltip` | `show`, `font`, `style`, `formatter` |
| `dataLabel` | `show`, `positioning`, `font`, `style`, `formatter`, `distance`, `rotate`, `offsetX` / `offsetY`, `minMargin`, `maxWidth`, `overflow`, `layout` (`hideOverlap`, `moveOverlap`), `labelLine` (pie / donut / funnel callouts) |
| `chartArea` | `margin`, `padding` (added together into `grid`), `style.background` |
| `rules` | conditional formatting — see below |
| `palette` | series colour cycle → `option.color` |
| `fontFamily` | → `option.textStyle.fontFamily`, which ECharts cascades to all text |
| `marks` | per chart type: line `width` / `symbol` / `symbolSize` / `smooth`; bar `border.radius` and `gap` (stacked bars only); scatter `symbolSize`; pie `border`, `label.font.color`. Looked up under the alias first (`donut`), then the resolved type (`pie`) |
| `width`, `height`, `top`, `left` | the container, not the option |

`positioning.position` is `top`, `bottom`, `left`, `right` or `center` (a `left` / `right` legend is vertical); `align` is `start` / `center` / `end`; `margin` offsets.

**Nothing unmappable is dropped silently.** Properties ECharts cannot express — `font.letterSpacing`, `transform`, `decoration`, `variant`; `background.image`; `shadow.spread`; container `opacity`; `legend.iconGap`; a `double` border (drawn solid) — are reported in `warnings`.

## Chart types

`chartType` is an ECharts series type — `bar`, `line`, `pie`, `scatter`, or any type you register. Aliases resolve to a real type before anything reaches ECharts, because a series type ECharts does not know renders nothing and says nothing:

| alias | ECharts gets |
|---|---|
| `area` | `line` + `areaStyle` |
| `donut` | `pie` + `radius: ['45%', '70%']` |
| `hbar` | `bar`, category on y and value on x |
| `stackedBar` | `bar` + `stack: 'total'` |
| `stackedHbar` | horizontal `bar` + `stack: 'total'` |
| `stackedArea` | `line` + `areaStyle` + `stack: 'total'` |

Binding follows the type:

| binding | types | shape |
|---|---|---|
| cartesian | everything not below | `encode: { x, y }` (swapped for horizontal) + axes |
| name / value | `pie`, `funnel`, `gauge`, `sunburst`, `sankey`, `graph`, `tree`, `themeRiver` | `encode: { itemName, value }`, **axes removed** |
| radar | `radar` | categories become `radar.indicator`; each measure is one shape; **one shared max** so shapes are comparable |
| treemap | `treemap` | `series.data` of `{ name, value }` (treemap has no dataset support); first measure only |
| heatmap | `heatmap` | two category axes from `x.labels[0]` and `[1]`, `[x, y, value]` cells, and a `visualMap` over the value range (with a `palette` of two or more colours, low → high runs from the last colour to the first). With one dimension it warns and draws nothing, rather than a stripe that looks like it worked |

Non-cartesian types get **no axes at all** — left in place, theme axis styling draws a bare cross behind the slices. Categories keep the order the rows give them.

### Value axis defaults

- `boundaryGap: [0, '10%']` — headroom above the tallest value, on whichever axis carries the value.
- `scale` (fit the data rather than include zero): **`false` for bars, stacked series and filled areas** — a bar's length is the quantity, stacked segments sum from a baseline, a fill reads as volume — and **`true` otherwise**, since a line or scatter shows change and zero flattens it. Without `scale`, ECharts ignores the headroom.

Set `axes.y.boundaryGap` or `axes.y.scale` (`axes.x` for `hbar`) to override either.

## Conditional formatting

```js
rules: [
  { field: 'margin', op: 'lt', value: 0, target: 'mark', then: { color: '#c2372e', opacity: 0.5 } },
  { field: 'margin', op: 'lt', value: 0, series: 'revenue', target: 'dataLabel',
    then: { color: '#c2372e', fontWeight: 'bold', format: { style: 'currency', currency: 'GBP', decimals: 0 } } },
  { field: 'revenue', op: 'lt', value: 100, target: 'dataLabel', then: { hide: true } },
  { field: 'dept', op: 'eq', value: 'IPD', target: 'axisX', then: { color: '#c2372e' } }
]
```

| key | |
|---|---|
| `field` | the column to test — any column in `data`, plotted or not; text or number |
| `op`, `value`, `value2` | `@xeplr/rules` operators: `lt`, `lte`, `gt`, `gte`, `between`, `eq`, `neq`, `contains`, `startsWith`, `endsWith`, `isEmpty`, `notEmpty` |
| `target` | `mark` (default), `dataLabel`, `axisX`, `axisY` |
| `series` | a `y.labels` field; omitted = every series (not used by axis targets) |
| `then` | what the target can take — below |

| target | `then` keys | mechanism |
|---|---|---|
| `mark` | `color`, `opacity`, `borderColor`, `borderWidth`, `borderType`, `borderRadius`, `shadowBlur`, `shadowColor`, `shadowOffsetX`, `shadowOffsetY` | an `itemStyle` callback per property, given the whole row |
| `dataLabel` | `color`, `fontStyle`, `fontWeight`, `fontSize`, `fontFamily`, `backgroundColor`, `borderColor`, `borderWidth`, `borderRadius`, `padding`, `textBorderColor`, `textBorderWidth`, `lineHeight`, plus `hide`, `format` | `label.formatter` + `label.rich` |
| `axisX`, `axisY` | same as `dataLabel` | `axisLabel.formatter` + `axisLabel.rich` |

- **The first matching rule wins** — for marks, per property; for a label, the first match decides its style, format or `hide`.
- An unmatched mark keeps its colour: the callback falls back to the series' palette colour (ECharts' default palette without `palette`), because `undefined` would render the mark with no fill.
- **An axis rule can only test the axis's own value** — ECharts hands an axis formatter the tick value and index, no row.
- Label styles go through rich text because ECharts' label style callbacks do not work (the function's source ends up in the SVG). A value containing `{`, `}` or `|` cannot be wrapped in rich markup, so that one label is printed unstyled rather than altered.
- A series or axis that already has a `formatter` is left alone, with a warning — a rule cannot compose with a formatter whose output it does not know.
- A `visualMap` is deliberately not used: it cannot test a string column, paints unmatched items black, and a second one on a series silently replaces the first.
- Rules that cannot do anything are dropped and reported: no `field`, no `op`, an unknown `target`, a `series` the chart does not plot, a `then` with nothing its target accepts, and stray keys.

## Chart and buildOption

For callers who would rather write ECharts-shaped specs:

```jsx
<Chart height={360} spec={{
  data: rows,
  xAxis: { field: 'month' }, yAxis: { name: 'Sales' },
  series: [{ type: 'bar', field: 'sales', name: 'Sales' }]
}} />
```

`buildOption(spec)`:

- `data` → `dataset: { source }`.
- `field` binding → `encode`: `xAxis.field` gives `{ x, y }`; `yAxis.field` gives horizontal `{ y, x }`; `categoryField` / `nameField` with `field` gives `{ itemName, value }`. An explicit `encode` wins.
- Axis `type` defaults: `category` on x, `value` on y.
- Defaults where the spec is silent: `animation: true`; with axes, `grid` and `tooltip.trigger: 'axis'`, else `'item'`; a `legend` when there is more than one series.
- Merged deeply — objects merge key by key, arrays are replaced. `renderer` and `theme` keys are removed.

`Chart` takes `spec`, `height` (320), `theme`, `renderer`, `optimize`, `onEvents`, `notMerge`, `style`, `className`. No theme or colours are applied on this path.

## Registered ECharts modules

Charts: bar, line, pie, scatter, funnel, radar, treemap, heatmap. Components: grid, tooltip, legend, title, dataset, toolbox, dataZoom, markLine, markPoint, radar, visualMap. Renderers: canvas, SVG.

Radar, treemap, heatmap and funnel are registered by default because a type the translator understands but the runtime cannot draw shows as an empty box. Anything else, on the same instance:

```js
import { echarts } from '@xeplr/ui-charts'
import { SunburstChart } from 'echarts/charts'
echarts.use([SunburstChart])
```

## Tests

```sh
npm test
```

Pure, no browser: the `ChartOptions` translator (types, aliases, bindings, axis defaults, rules, warnings), `buildOption`, and the container frame. Rendering is checked in an app. (`demo.html` still loads `lib/theme.js`, which has been removed, so it does not run.)

## License

MIT
