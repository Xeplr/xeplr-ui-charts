// @xeplr/ui-charts — organized ECharts spec → option + React <Chart>, using
// Apache ECharts DIRECTLY (no wrapper), with a premium optimize() seam.
//
//   const { Chart, buildOption } = require('@xeplr/ui-charts');
//
//   <Chart spec={{
//     data: rows,
//     xAxis: { field: 'month' }, yAxis: { name: 'Sales' },
//     series: [{ type: 'bar', field: 'sales', name: 'Sales' }]
//   }} height={360} />
//
// Layers:
//   buildOption(spec) → EChartsOption   (pure; the contract premium optimizes)
//   useECharts / <Chart>                (React lifecycle bridge)
//   echarts                             (configured core — register more modules on it)
//
// Styling is theme-agnostic here: the resolved theme (@xeplr/ui-utils) arrives as
// a ChartOptions object and is translated by chartOptionsToOption. No themes here.

module.exports = {
  // Primary component — pass the semantic ChartOptions object (type.js):
  //   <XeplrChart chartOptions={chartOptions} />
  XeplrChart: require('./lib/XeplrChart'),

  // Semantic ChartOptions → ECharts option. Returns
  // { option, seriesLabel, chartType, warnings }.
  chartOptionsToOption: require('./lib/chart-options'),

  // Lower-level: organized ECharts-mirror spec path.
  Chart: require('./lib/Chart'),
  buildOption: require('./lib/build-option'),

  useECharts: require('./lib/use-echarts'),
  echarts: require('./lib/register')
  // Styling is not a ui-charts concern anymore — the resolved theme arrives as a
  // ChartOptions object (from @xeplr/ui-utils resolveTheme) and is translated by
  // chartOptionsToOption. No registered ECharts themes / makeTheme here.
};
