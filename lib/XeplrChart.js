// <XeplrChart /> — the primary React component. Takes the semantic ChartOptions
// object (see type.js), translates it to an ECharts option via
// chartOptionsToOption, and renders it. Plain React.createElement (no JSX).
//
//   const { XeplrChart } = require('@xeplr/ui-charts');
//   <XeplrChart chartOptions={chartOptions} height={360} />
//
// Container frame — width / height / top / left — is read from `chartOptions`
// (CSS values per the type; numbers → px). These size/position the container
// div, not the ECharts option, so the translator ignores them. `top`/`left`
// switch the container to absolute positioning. Matching React props override.
//
// Props:
//   chartOptions   the semantic ChartOptions object            (required)
//   height/width   number|string — override chartOptions.height/width
//   theme          optional registered ECharts theme name. Normally unset —
//                  styling comes from chartOptions (built from the theme).
//   renderer       'canvas' (default) | 'svg'
//   optimize       (EChartsOption) => EChartsOption — premium seam
//   onWarnings     (string[]) => void — receives the translator's warnings.
//                  If omitted, warnings are console.warn'd unless `silent`.
//   silent         suppress the default console.warn of warnings
//   onEvents       { click: fn, ... } ECharts events, bound at init
//   notMerge       default true (structural replace); false to merge/animate
//   style, className  passed to the container div

var React = require('react');
var useECharts = require('./use-echarts');
var chartOptionsToOption = require('./chart-options');
var containerStyle = require('./container-style');

function XeplrChart(props) {
  props = props || {};

  // Translate once per chartOptions change → { option, seriesLabel, chartType, warnings }.
  var result = React.useMemo(function () {
    return chartOptionsToOption(props.chartOptions || {});
  }, [props.chartOptions]);

  // Surface the translator's warnings (unmapped props) — never silently.
  React.useEffect(function () {
    var w = result.warnings;
    if (!w || !w.length) return;
    if (typeof props.onWarnings === 'function') { props.onWarnings(w); return; }
    if (!props.silent && typeof console !== 'undefined' && console.warn) {
      console.warn('[XeplrChart] ' + w.length + ' unmapped chart propert' + (w.length > 1 ? 'ies' : 'y') + ':\n  ' + w.join('\n  '));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  var api = useECharts(result.option, {
    theme: props.theme,
    renderer: props.renderer,
    optimize: props.optimize,
    onEvents: props.onEvents,
    notMerge: props.notMerge
  });

  return React.createElement('div', {
    ref: api.containerRef,
    className: props.className,
    style: containerStyle(props)
  });
}

module.exports = XeplrChart;
