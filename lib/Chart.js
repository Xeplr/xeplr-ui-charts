// <Chart /> — declarative wrapper over useECharts for the organized
// ECharts-mirror spec (see buildOption). For the semantic ChartOptions object,
// use <XeplrChart>. Plain React.createElement (no JSX) → no build step.
//
//   const { Chart } = require('@xeplr/ui-charts');
//   <Chart spec={spec} height={360} optimize={premium.optimize} />

var React = require('react');
var useECharts = require('./use-echarts');
var buildOption = require('./build-option');

function Chart(props) {
  props = props || {};
  var option = React.useMemo(function () { return buildOption(props.spec); }, [props.spec]);

  var api = useECharts(option, {
    theme: props.theme,
    renderer: props.renderer,
    optimize: props.optimize,
    onEvents: props.onEvents,
    notMerge: props.notMerge
  });

  var style = Object.assign(
    { width: '100%', height: props.height != null ? props.height : 320 },
    props.style
  );

  return React.createElement('div', { ref: api.containerRef, className: props.className, style: style });
}

module.exports = Chart;
