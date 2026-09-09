# @xeplr/ui-charts

Direct **Apache ECharts** in React (no wrapper), driven by an **organized
ECharts-mirror spec**. A premium optimizer plugs in at the option level.

```
organized spec → buildOption → EChartsOption → [premium.optimize] → useECharts render
```

## Usage

Primary component — pass the semantic `ChartOptions` object:

```jsx
import { XeplrChart } from '@xeplr/ui-charts';

<XeplrChart
  chartOptions={{
    data: [{ month: 'Jan', revenue: 18700 }, /* … */],
    axes: {
      x: { labels: ['month'], title: { show: true, text: 'Monthly Revenue' } },
      y: { labels: ['revenue'] }
    },
    chartType: 'bar'
  }}
  height={360}
  theme="xeplr-dark"          // brand-neutral default; or "xeplr-light"
  onWarnings={(w) => console.warn(w)}   // optional; unmapped props reported here
/>
```

`XeplrChart` runs `chartOptionsToOption()` internally. Lower-level, the
ECharts-mirror `<Chart spec={…} />` (backed by `buildOption`) is also exported for
callers who'd rather author ECharts-shaped specs directly.

### `chartType`

An **ECharts series type** — `bar`, `line`, `pie`, `scatter`, or any other,
including one you registered yourself. ECharts is the vocabulary; anything it
accepts flows through untouched.

Three aliases cover the charts every UI offers that ECharts has no series type
for. Each resolves to a real type *before* anything reaches ECharts, so an
unrenderable series is never handed over:

| you say | ECharts gets |
|---|---|
| `area`  | `line` + `areaStyle` |
| `donut` | `pie` + `radius: ['45%','70%']` |
| `hbar`  | `bar` with the axis roles swapped — category on y, value on x |

Saying it in ECharts' own terms is the same chart: `chartType:'line'` with a
series `areaStyle` and `chartType:'area'` produce identical output.

A value axis gets `boundaryGap: [0, '10%']` by default — headroom, so the
tallest point doesn't sit on the top gridline and an area chart isn't clipped
flat against it. Nothing is added below, since a baseline belongs at zero. It
applies to whichever axis carries the value, so `hbar` gets it on x. Set
`axes.y.boundaryGap` (ECharts' own property, passed through verbatim) to
override.

Binding follows the type, and three types don't bind through `encode` at all —
handing them one draws nothing, silently:

| binding | types | shape |
|---|---|---|
| cartesian | bar, line, scatter, area… | `encode:{x,y}` + a pair of axes |
| name/value | pie, donut, funnel, sunburst | `encode:{itemName,value}`, **no axes** |
| radar | radar | `radar.indicator` from the categories; each measure is one shape over them, sharing one max |
| treemap | treemap | a flat `series.data` of `{name,value}` — treemap has no dataset support |
| heatmap | heatmap | **two** category axes + `[x,y,value]` cells + a `visualMap` |

A heatmap crosses two groupings, so it reads a second dimension from
`axes.x.labels[1]` — `x.labels` has always been the dimension list and other
charts simply use the first. Given only one it warns rather than drawing a
single stripe that would look like it worked.

Non-cartesian types are given **no axes at all**, including when the theme
carries axis styling, which would otherwise draw a bare cross behind the slices.

## The spec (organized ECharts mirror)

It **is** an ECharts `option`, just organized with sane defaults and two
conveniences. Anything ECharts accepts flows straight through — that's the escape
hatch.

- **`data: rows`** → `dataset: { source: rows }`.
- **`field`-binding** → ECharts `encode`:
  - `xAxis:{field:'month'}` + `series:[{type:'bar', field:'sales'}]` → `encode:{x:'month',y:'sales'}`
  - `yAxis:{field}` → horizontal; pie `series:{type:'pie', categoryField, field}` → `encode:{itemName,value}`
- **Defaults** (spec always wins): grid + `tooltip.trigger:'axis'` for cartesian /
  `'item'` otherwise, legend when multi-series, animation on.
- **Meta keys** `renderer` / `theme` are consumed by the renderer, stripped from the option.

`buildOption(spec)` is a pure function — the contract both the renderer and premium
optimizers operate on.

## Premium seam

`<Chart optimize={fn} />` (or `useECharts(spec, { optimize })`) — `optimize` is a
pure `(EChartsOption) => EChartsOption` applied right before `setOption`. Premium
algorithms live in the suite, import nothing from here beyond the option shape, and
optimize **any** chart (spec-built or raw).

## Theme

This is an **upstream, brand-neutral** package — it ships **no** consumer branding.
The defaults `xeplr-dark` / `xeplr-light` use the dataviz method's validated
*reference* palette (blue-led): dark worst-adjacent CVD ΔE 10.3 (floor band), light
ΔE 24.2. Mark specs (2px lines, ≥8px markers, 4px rounded bars, 2px pie gaps,
recessive axes) are baked in.

**Consumers supply their own brand theme downstream.** The theme *structure* lives
here in `makeTheme(palette)`; the brand *values* live in the app:

```js
import { echarts, makeTheme } from '@xeplr/ui-charts';
echarts.registerTheme('mybrand-dark', makeTheme({
  color: ['#c98500', '#3987e5', /* …validated brand hues… */],
  surface: '#1a1a19', primary: '#fff', secondary: '#c3c2b7',
  muted: '#898781', gridline: '#2c2c2a', baseline: '#383835'
}));
// <Chart theme="mybrand-dark" ... />
```

## Bundle / registration

`register.js` registers a default module set (bar/line/pie/scatter + grid/tooltip/
legend/title/dataset/toolbox/dataZoom + canvas & svg). Need more? Register on the
same instance:

```js
import { echarts } from '@xeplr/ui-charts';
import { RadarChart } from 'echarts/charts';
echarts.use([RadarChart]);
```

## API

`buildOption(spec)` · `<Chart>` · `useECharts(spec, opts)` · `echarts` (configured) ·
`themes` (`makeTheme`, `xeplrDark`, `xeplrLight`, `registerThemes`, `palettes`).

`react` and `echarts` are peer deps. `buildOption` + `themes` are pure (no peers) —
that's what the test suite (`npm test`, 21 tests) covers. Rendering you confirm in-app.
