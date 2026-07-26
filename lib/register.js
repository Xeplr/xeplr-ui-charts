// Configured ECharts core — à-la-carte registration keeps bundles tree-shaken
// (this is the whole point of using ECharts directly). We register a sensible
// DEFAULT set so the common charts work out of the box; consumers who need more
// import the extra modules and call `.use([...])` on this same instance.
//
//   const { echarts } = require('@xeplr/ui-charts');
//   import { RadarChart } from 'echarts/charts';
//   echarts.use([RadarChart]);   // extend when needed

var echarts = require('echarts/core');

var { BarChart, LineChart, PieChart, ScatterChart } = require('echarts/charts');
var {
  GridComponent, TooltipComponent, LegendComponent, TitleComponent,
  DatasetComponent, ToolboxComponent, DataZoomComponent, MarkLineComponent, MarkPointComponent
} = require('echarts/components');
var { CanvasRenderer, SVGRenderer } = require('echarts/renderers');

echarts.use([
  BarChart, LineChart, PieChart, ScatterChart,
  GridComponent, TooltipComponent, LegendComponent, TitleComponent,
  DatasetComponent, ToolboxComponent, DataZoomComponent, MarkLineComponent, MarkPointComponent,
  CanvasRenderer, SVGRenderer
]);

// No theme registration: styling flows through the ECharts `option` built from
// the ChartOptions theme (see @xeplr/ui-utils default.theme.json → chartOptionsToOption),
// so there's a single source of styling. Register your own theme on this
// instance only if you specifically want ECharts' theme layer.

module.exports = echarts;
