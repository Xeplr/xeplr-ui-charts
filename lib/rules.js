var R = require('@xeplr/rules');
var matches = R.matches;
var formatNumber = R.formatNumber;

// CONDITIONAL FORMATTING — "when this column is under zero, make THAT red".
//
// A rule has three parts, and the third depends on the second:
//
//   WHEN    field, op, value        which column to test, and against what
//   APPLY   target                  which object on the chart it styles
//   THEN    then: { … }             only what that object can actually take
//
// The point of naming a target is that a chart is not one thing. Colouring the
// bar, colouring the number printed above the bar, and colouring the category
// name under it are three different objects with three different vocabularies —
// a bar has an opacity and no font, an axis label has a font and no opacity.
// One rule list that cannot say which one it means can only ever style the one
// somebody guessed at.
//
// ── THE MECHANISM PER TARGET, and why they differ ────────────────────────
//
// Every one of these is ECharts' own API. They differ because ECharts itself
// supports different things in different places, which was established by
// rendering each and reading the output rather than by reading the docs:
//
//   mark        itemStyle callbacks.  itemStyle.color accepts a function and
//               is handed the whole row, so a rule can test any column and any
//               type — including a string. Verified on bar, line, scatter,
//               pie, funnel and treemap.
//
//   dataLabel   label.formatter + label.rich.  Label STYLE callbacks do not
//               work: `label: { color: fn }` puts the function's source text
//               into the SVG's fill attribute. So the styling has to travel as
//               rich-text markup, which is ECharts' mechanism for styling part
//               of a string.
//
//   axisX/Y     axisLabel.formatter + axisLabel.rich.  axisLabel.color DOES
//               take a callback — it is documented as (value, index) => color
//               and it works — but axisLabel.fontWeight does not. Rather than
//               support colour one way and weight another, both go through
//               rich, which is one code path and supports everything.
//
// THE CONDITION LIVES ELSEWHERE. `matches`, the operators and number
// formatting are in @xeplr/rules, because "when margin is under zero" is the
// same question whether the answer paints a bar, a table cell or an arrow —
// and a table asking it must not have to depend on a charting library. What
// stays here is the half that genuinely IS ECharts: turning a match into
// itemStyle callbacks and label formatters.
//
// A visualMap is deliberately NOT used, though it was the obvious candidate.
// It carries three restrictions that are the mechanism's rather than ECharts':
// it cannot test a string column at all, it paints an unmatched item black,
// and a second one on the same series replaces the first outright — silently,
// along with everything the first had coloured. itemStyle callbacks have none
// of those.

var TARGETS = { mark: 1, dataLabel: 1, axisX: 1, axisY: 1 };

// itemStyle keys a mark rule may set. ECharts accepts a callback for each.
var MARK_KEYS = [
  'color', 'opacity', 'borderColor', 'borderWidth', 'borderType',
  'borderRadius', 'shadowBlur', 'shadowColor', 'shadowOffsetX', 'shadowOffsetY'
];

// rich-text keys a text rule may set. A subset of what ECharts' rich accepts —
// the ones that mean something for a single run of text on a chart.
var TEXT_KEYS = [
  'color', 'fontStyle', 'fontWeight', 'fontSize', 'fontFamily',
  'backgroundColor', 'borderColor', 'borderWidth', 'borderRadius',
  'padding', 'textBorderColor', 'textBorderWidth', 'lineHeight'
];

// ── the THEN, for text: number formatting ────────────────────────────────

/**
 * Whether a run of text can carry rich-text styling.
 *
 * ECharts' rich markup is `{styleName|text}` and has no escape sequence, so a
 * value containing a brace or a pipe cannot be wrapped — a `}` inside would
 * end the run early and the remainder would print unstyled.
 *
 * Answered rather than worked around: the text is printed as it is and the
 * styling is dropped for that one label. Stripping the character would be
 * silent data corruption, and wrapping it anyway would truncate the value.
 */
function richSafe(text) {
  return String(text).indexOf('{') < 0 && String(text).indexOf('}') < 0 && String(text).indexOf('|') < 0;
}

// ── applying ─────────────────────────────────────────────────────────────

function pick(source, keys) {
  var out = null;
  for (var i = 0; i < keys.length; i++) {
    if (source[keys[i]] !== undefined) {
      if (!out) out = {};
      out[keys[i]] = source[keys[i]];
    }
  }
  return out;
}

/**
 * The rules, sorted into the buckets that each get their own mechanism.
 *
 * Reported as it goes: a rule that names a target nothing understands, or sets
 * a property its target cannot take, is dropped HERE with a reason rather than
 * emitted for ECharts to ignore. A control that appears to work is the failure
 * this whole module is arranged to avoid.
 */
function sortRules(co, option, ctx) {
  var yLabels = (co.axes && co.axes.y && co.axes.y.labels) || [];
  var series = option.series || [];
  var out = { mark: {}, dataLabel: {}, axisX: [], axisY: [] };

  (co.rules || []).forEach(function (rule, i) {
    var where = 'rules[' + i + ']';
    if (!rule || !rule.field) { ctx.warn(where + ' names no column to test (ignored)'); return; }
    if (!rule.op) { ctx.warn(where + ' has no comparison (ignored)'); return; }
    var target = rule.target || 'mark';
    if (!TARGETS[target]) { ctx.warn(where + ' applies to "' + target + '", which is not something on a chart (ignored)'); return; }

    var then = rule.then || {};
    var keys = target === 'mark' ? MARK_KEYS : TEXT_KEYS;
    var style = pick(then, keys);
    var changesText = target !== 'mark' && (then.hide || then.format);
    if (!style && !changesText) {
      ctx.warn(where + ' sets nothing its target can take, so it would do nothing (ignored)');
      return;
    }
    // Said, because the panel is generated per target and a rule that arrives
    // with the wrong vocabulary came from somewhere else — a hand-edited
    // config, or a target changed after the properties were chosen.
    var stray = Object.keys(then).filter(function (k) {
      return keys.indexOf(k) < 0 && k !== 'hide' && k !== 'format';
    });
    if (stray.length) ctx.warn(where + ' sets ' + stray.join(', ') + ', which "' + target + '" has no such thing (dropped)');

    var entry = { rule: rule, style: style, hide: Boolean(then.hide), format: then.format || null };

    if (target === 'axisX' || target === 'axisY') {
      // An axis-label formatter is handed the axis's own value and its index,
      // and nothing else — there is no row to look at. So a rule here can only
      // test the column that axis is showing.
      out[target].push(entry);
      return;
    }

    var targets = [];
    if (rule.series) {
      var idx = -1;
      for (var s = 0; s < yLabels.length; s++) if (labelFieldOf(yLabels[s]) === rule.series) idx = s;
      if (idx < 0 || !series[idx]) {
        ctx.warn(where + ' applies to "' + rule.series + '", which this chart does not plot (ignored)');
        return;
      }
      targets = [idx];
    } else {
      for (var t = 0; t < series.length; t++) targets.push(t);
    }
    targets.forEach(function (si) {
      (out[target][si] || (out[target][si] = [])).push(entry);
    });
  });
  return out;
}

function labelFieldOf(label) {
  return label && typeof label === 'object' ? label.field : label;
}

/** The row behind a datum, whatever binding put it there. */
function rowOf(params) {
  var d = params && params.data;
  if (d && typeof d === 'object' && !Array.isArray(d)) return d;
  return null;
}

/**
 * MARKS — one itemStyle callback per property any rule sets.
 *
 * The callback returns the FIRST matching rule's value, and the base value
 * otherwise. The base matters: returning undefined for `color` renders the
 * mark with no fill at all, so an unmatched bar would disappear rather than
 * keep its colour. Every other property tolerates undefined, but colour is
 * given the series' palette entry explicitly.
 */
function applyMarkRules(entriesBySeries, option, palette) {
  Object.keys(entriesBySeries).forEach(function (si) {
    var entries = entriesBySeries[si];
    var ser = option.series[si];
    if (!ser || !entries || !entries.length) return;

    var props = {};
    entries.forEach(function (e) {
      Object.keys(e.style || {}).forEach(function (k) { props[k] = 1; });
    });

    var base = ser.itemStyle || {};
    var next = {};
    for (var k in base) next[k] = base[k];

    Object.keys(props).forEach(function (key) {
      var fallback = base[key] !== undefined
        ? base[key]
        : (key === 'color' ? palette[Number(si) % palette.length] : undefined);
      next[key] = function (params) {
        var row = rowOf(params);
        for (var i = 0; i < entries.length; i++) {
          var e = entries[i];
          if (!e.style || e.style[key] === undefined) continue;
          if (matches(e.rule, row ? row[e.rule.field] : undefined)) return e.style[key];
        }
        return fallback;
      };
    });
    ser.itemStyle = next;
  });
}

/**
 * DATA LABELS — one formatter and one rich map per series.
 *
 * The formatter has to reproduce what the label would have said, because
 * setting one replaces ECharts' default entirely. `valueField` is what the
 * series plots; a non-cartesian series labels by name, which is what its
 * binding put in params.name.
 */
function applyLabelRules(entriesBySeries, option, co, ctx) {
  var yLabels = (co.axes && co.axes.y && co.axes.y.labels) || [];
  var byName = !(co.chartType === undefined) && isNameValue(co.chartType);

  Object.keys(entriesBySeries).forEach(function (si) {
    var entries = entriesBySeries[si];
    var ser = option.series[si];
    if (!ser || !entries || !entries.length) return;

    if (ser.label && ser.label.formatter) {
      // Composing with a caller's own formatter is not possible without
      // knowing what it means to produce. Said plainly, because a rule that
      // quietly lost to a template set three panels away is unfindable.
      ctx.warn('a data-label formatter is already set, so conditional formatting on the label is not applied — clear Data labels → Format to use rules');
      return;
    }

    var valueField = labelFieldOf(yLabels[Number(si)]);
    var rich = {};
    entries.forEach(function (e, n) {
      if (e.style) rich['r' + si + '_' + n] = e.style;
    });

    // A COPY. seriesLabel is one object shared by every series, so writing a
    // formatter into it would give every series this series' rules.
    var label = {};
    for (var k in (ser.label || {})) label[k] = ser.label[k];

    label.formatter = function (params) {
      var row = rowOf(params);
      var raw = byName ? params.name : (row && valueField != null ? row[valueField] : params.value);
      var text = raw === null || raw === undefined ? '' : String(raw);

      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        if (!matches(e.rule, row ? row[e.rule.field] : undefined)) continue;
        if (e.hide) return '';
        if (e.format) {
          var formatted = formatNumber(raw, e.format);
          if (formatted !== null) text = formatted;
        }
        var name = 'r' + si + '_' + i;
        if (rich[name] && richSafe(text)) return '{' + name + '|' + text + '}';
        return text;
      }
      return text;
    };
    if (Object.keys(rich).length) label.rich = rich;
    ser.label = label;
  });
}

function isNameValue(type) {
  return type === 'pie' || type === 'donut' || type === 'funnel' || type === 'gauge';
}

/**
 * AXIS LABELS — the same formatter/rich pair, on the axis.
 *
 * An axis-label formatter receives the tick's own value and its index. There
 * is no row, so a rule here tests what the axis is showing and nothing else —
 * which is exactly right for "make IPD red" and impossible for "make the IPD
 * tick red when its margin is negative".
 */
function applyAxisRules(entries, option, which, ctx) {
  if (!entries.length) return;
  var key = which === 'axisX' ? 'xAxis' : 'yAxis';
  var axis = option[key];
  if (!axis) {
    ctx.warn('a rule styles the ' + (which === 'axisX' ? 'X' : 'Y') + ' axis labels, but this chart has no such axis (ignored)');
    return;
  }
  if (axis.axisLabel && axis.axisLabel.formatter) {
    ctx.warn('an ' + (which === 'axisX' ? 'X' : 'Y') + ' axis label formatter is already set, so conditional formatting on it is not applied');
    return;
  }

  var rich = {};
  entries.forEach(function (e, n) {
    if (e.style) rich[which + '_' + n] = e.style;
  });

  var axisLabel = {};
  for (var k in (axis.axisLabel || {})) axisLabel[k] = axis.axisLabel[k];

  axisLabel.formatter = function (value) {
    var text = value === null || value === undefined ? '' : String(value);
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (!matches(e.rule, value)) continue;
      if (e.hide) return '';
      if (e.format) {
        var formatted = formatNumber(value, e.format);
        if (formatted !== null) text = formatted;
      }
      var name = which + '_' + i;
      if (rich[name] && richSafe(text)) return '{' + name + '|' + text + '}';
      return text;
    }
    return text;
  };
  if (Object.keys(rich).length) axisLabel.rich = rich;
  axis.axisLabel = axisLabel;
}

// ECharts' own default series colours, for the mark fallback when the caller
// carries no palette. Getting this wrong means marks with no fill.
var DEFAULT_PALETTE = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
  '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'
];

/**
 * Apply every rule on `co` to the option being built.
 *
 * Called after the series exist, because a rule is scoped to one of them and
 * needs its index, its palette colour and the field it plots.
 */
function applyRules(co, option, ctx) {
  if (!Array.isArray(co.rules) || !co.rules.length) return;
  if (!Array.isArray(option.series) || !option.series.length) return;

  var palette = (Array.isArray(co.palette) && co.palette.length) ? co.palette : DEFAULT_PALETTE;
  var sorted = sortRules(co, option, ctx);

  applyMarkRules(sorted.mark, option, palette);
  applyLabelRules(sorted.dataLabel, option, co, ctx);
  applyAxisRules(sorted.axisX, option, 'axisX', ctx);
  applyAxisRules(sorted.axisY, option, 'axisY', ctx);
}

module.exports = applyRules;
// Re-exported so an existing caller keeps working; the source of truth is
// @xeplr/rules.
module.exports.matches = matches;
module.exports.formatNumber = formatNumber;
module.exports.richSafe = richSafe;
module.exports.MARK_KEYS = MARK_KEYS;
module.exports.TEXT_KEYS = TEXT_KEYS;
