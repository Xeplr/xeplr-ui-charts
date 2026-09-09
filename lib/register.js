// Configured ECharts core — à-la-carte registration keeps bundles tree-shaken
// (this is the whole point of using ECharts directly). We register a sensible
// DEFAULT set so the common charts work out of the box; consumers who need more
// import the extra modules and call `.use([...])` on this same instance.
//
//   const { echarts } = require('@xeplr/ui-charts');
//   import { RadarChart } from 'echarts/charts';
//   echarts.use([RadarChart]);   // extend when needed

var echarts = require('echarts/core');

var {
  BarChart, LineChart, PieChart, ScatterChart,
  // The four that need their own coordinate system or their own data shape.
  // Registered by default rather than left to the consumer: a chart type the
  // translator understands but the runtime cannot draw fails as an empty box
  // with "Unknown series" in the console, which is a worse default than the
  // few kB these cost.
  FunnelChart, RadarChart, TreemapChart, HeatmapChart
} = require('echarts/charts');
var {
  GridComponent, TooltipComponent, LegendComponent, TitleComponent,
  DatasetComponent, ToolboxComponent, DataZoomComponent, MarkLineComponent, MarkPointComponent,
  // RadarComponent is the radar's AXES — the series alone draws nothing.
  // VisualMapComponent is what turns a heatmap's numbers into colours; without
  // it every cell renders the same shade.
  RadarComponent, VisualMapComponent
} = require('echarts/components');
var { CanvasRenderer, SVGRenderer } = require('echarts/renderers');

echarts.use([
  BarChart, LineChart, PieChart, ScatterChart,
  FunnelChart, RadarChart, TreemapChart, HeatmapChart,
  GridComponent, TooltipComponent, LegendComponent, TitleComponent,
  DatasetComponent, ToolboxComponent, DataZoomComponent, MarkLineComponent, MarkPointComponent,
  RadarComponent, VisualMapComponent,
  CanvasRenderer, SVGRenderer
]);

// No theme registration: styling flows through the ECharts `option` built from
// the ChartOptions theme (see @xeplr/ui-utils default.theme.json → chartOptionsToOption),
// so there's a single source of styling. Register your own theme on this
// instance only if you specifically want ECharts' theme layer.

module.exports = echarts;
