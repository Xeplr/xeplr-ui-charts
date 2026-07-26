// Resolve the chart container's CSS frame from chartOptions.{width,height,top,left},
// overridable by matching React props. These size/position the container div —
// they are NOT ECharts option properties. `top`/`left` switch to absolute
// positioning. Pure (no react) → unit-testable.
//
//   containerStyle({ chartOptions, width?, height?, top?, left?, style? }) → CSSObject

function containerStyle(props) {
  props = props || {};
  var co = props.chartOptions || {};

  var width  = firstDefined(props.width,  co.width,  '100%');
  var height = firstDefined(props.height, co.height, 320);
  var top    = firstDefined(props.top,  co.top);
  var left   = firstDefined(props.left, co.left);

  var style = { width: width, height: height };
  if (top !== undefined || left !== undefined) {
    style.position = 'absolute';
    if (top !== undefined)  style.top = top;
    if (left !== undefined) style.left = left;
  }
  return Object.assign(style, props.style);
}

function firstDefined() {
  for (var i = 0; i < arguments.length; i++) {
    if (arguments[i] !== undefined && arguments[i] !== null) return arguments[i];
  }
  return undefined;
}

module.exports = containerStyle;
