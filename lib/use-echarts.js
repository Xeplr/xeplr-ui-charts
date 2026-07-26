// useECharts — the imperative-lifecycle bridge. Takes an already-built ECharts
// `option`; the calling component is responsible for producing it (memoized).
// Init once, setOption on option change, ResizeObserver → resize, dispose on
// unmount. This is the ~30 lines written once so charts are declarative above.
//
//   const option = useMemo(() => buildOption(spec), [spec]);
//   const { containerRef } = useECharts(option, { theme, optimize });
//   return <div ref={containerRef} style={{ height: 320 }} />;
//
// The premium seam is `optimize`: a pure (option) => option applied right before
// setOption — so premium algos optimize the FINAL option and work for any chart.
// theme + renderer are fixed at init (ECharts can't swap them live) — change them
// by remounting (e.g. a React `key`).

var React = require('react');
var echarts = require('./register');

function useECharts(option, options) {
  options = options || {};
  var containerRef = React.useRef(null);
  var chartRef = React.useRef(null);

  // No default registered ECharts theme: styling is carried entirely by the
  // `option` (built from the ChartOptions theme). `theme` stays an optional
  // escape hatch for anyone who registers + names their own ECharts theme.
  var theme = options.theme;
  var renderer = options.renderer || 'canvas';

  React.useEffect(function () {
    var el = containerRef.current;
    if (!el) return undefined;

    var chart = echarts.init(el, theme, { renderer: renderer });
    chartRef.current = chart;

    if (options.onEvents) {
      Object.keys(options.onEvents).forEach(function (name) {
        chart.on(name, options.onEvents[name]);
      });
    }

    var ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(function () { if (chartRef.current) chartRef.current.resize(); });
      ro.observe(el);
    }

    return function () {
      if (ro) ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(function () {
    var chart = chartRef.current;
    if (!chart) return;
    var opt = option || {};
    if (typeof options.optimize === 'function') opt = options.optimize(opt);
    chart.setOption(opt, { notMerge: options.notMerge !== false, lazyUpdate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [option, options.optimize]);

  return {
    containerRef: containerRef,
    getInstance: function () { return chartRef.current; }
  };
}

module.exports = useECharts;
