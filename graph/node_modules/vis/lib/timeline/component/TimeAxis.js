var util = require('../../util');
var Component = require('./Component');
var TimeStep = require('../TimeStep');
var DateUtil = require('../DateUtil');
var moment = require('../../module/moment');

/**
 * A horizontal time axis
 * @param {{dom: Object, domProps: Object, emitter: Emitter, range: Range}} body
 * @param {Object} [options]        See TimeAxis.setOptions for the available
 *                                  options.
 * @constructor TimeAxis
 * @extends Component
 */
function TimeAxis (body, options) {
  this.dom = {
    foreground: null,
    lines: [],
    majorTexts: [],
    minorTexts: [],
    redundant: {
      lines: [],
      majorTexts: [],
      minorTexts: []
    }
  };
  this.props = {
    range: {
      start: 0,
      end: 0,
      minimumStep: 0
    },
    lineTop: 0
  };

  this.defaultOptions = {
    orientation: {
      axis: 'bottom'
    },  // axis orientation: 'top' or 'bottom'
    showMinorLabels: true,
    showMajorLabels: true,
    maxMinorChars: 7,
    format: TimeStep.FORMAT,
    moment: moment,
    timeAxis: null
  };
  this.options = util.extend({}, this.defaultOptions);

  this.body = body;

  // create the HTML DOM
  this._create();

  this.setOptions(options);
}

TimeAxis.prototype = new Component();

/**
 * Set options for the TimeAxis.
 * Parameters will be merged in current options.
 * @param {Object} options  Available options:
 *                          {string} [orientation.axis]
 *                          {boolean} [showMinorLabels]
 *                          {boolean} [showMajorLabels]
 */
TimeAxis.prototype.setOptions = function(options) {
  if (options) {
    // copy all options that we know
    util.selectiveExtend([
      'showMinorLabels',
      'showMajorLabels',
      'maxMinorChars',
      'hiddenDates',
      'timeAxis',
      'moment',
      'rtl'
    ], this.options, options);

    // deep copy the format options
    util.selectiveDeepExtend(['format'], this.options, options);

    if ('orientation' in options) {
      if (typeof options.orientation === 'string') {
        this.options.orientation.axis = options.orientation;
      }
      else if (typeof options.orientation === 'object' && 'axis' in options.orientation) {
        this.options.orientation.axis = options.orientation.axis;
      }
    }

    // apply locale to moment.js
    // TODO: not so nice, this is applied globally to moment.js
    if ('locale' in options) {
      if (typeof moment.locale === 'function') {
        // moment.js 2.8.1+
        moment.locale(options.locale);
      }
      else {
        moment.lang(options.locale);
      }
    }
  }
};

/**
 * Create the HTML DOM for the TimeAxis
 */
TimeAxis.prototype._create = function() {
  this.dom.foreground = document.createElement('div');
  this.dom.background = document.createElement('div');

  this.dom.foreground.className = 'vis-time-axis vis-foreground';
  this.dom.background.className = 'vis-time-axis vis-background';
};

/**
 * Destroy the TimeAxis
 */
TimeAxis.prototype.destroy = function() {
  // remove from DOM
  if (this.dom.foreground.parentNode) {
    this.dom.foreground.parentNode.removeChild(this.dom.foreground);
  }
  if (this.dom.background.parentNode) {
    this.dom.background.parentNode.removeChild(this.dom.background);
  }

  this.body = null;
};

/**
 * Repaint the component
 * @return {boolean} Returns true if the component is resized
 */
TimeAxis.prototype.redraw = function () {
  var props = this.props;
  var foreground = this.dom.foreground;
  var background = this.dom.background;

  // determine the correct parent DOM element (depending on option orientation)
  var parent = (this.options.orientation.axis == 'top') ? this.body.dom.top : this.body.dom.bottom;
  var parentChanged = (foreground.parentNode !== parent);

  // calculate character width and height
  this._calculateCharSize();

  // TODO: recalculate sizes only needed when parent is resized or options is changed
  var showMinorLabels = this.options.showMinorLabels && this.options.orientation.axis !== 'none';
  var showMajorLabels = this.options.showMajorLabels && this.options.orientation.axis !== 'none';

  // determine the width and height of the elemens for the axis
  props.minorLabelHeight = showMinorLabels ? props.minorCharHeight : 0;
  props.majorLabelHeight = showMajorLabels ? props.majorCharHeight : 0;
  props.height = props.minorLabelHeight + props.majorLabelHeight;
  props.width = foreground.offsetWidth;

  props.minorLineHeight = this.body.domProps.root.height - props.majorLabelHeight -
      (this.options.orientation.axis == 'top' ? this.body.domProps.bottom.height : this.body.domProps.top.height);
  props.minorLineWidth = 1; // TODO: really calculate width
  props.majorLineHeight = props.minorLineHeight + props.majorLabelHeight;
  props.majorLineWidth = 1; // TODO: really calculate width

  //  take foreground and background offline while updating (is almost twice as fast)
  var foregroundNextSibling = foreground.nextSibling;
  var backgroundNextSibling = background.nextSibling;
  foreground.parentNode && foreground.parentNode.removeChild(foreground);
  background.parentNode && background.parentNode.removeChild(background);

  foreground.style.height = this.props.height + 'px';

  this._repaintLabels();

  // put DOM online again (at the same place)
  if (foregroundNextSibling) {
    parent.insertBefore(foreground, foregroundNextSibling);
  }
  else {
    parent.appendChild(foreground)
  }
  if (backgroundNextSibling) {
    this.body.dom.backgroundVertical.insertBefore(background, backgroundNextSibling);
  }
  else {
    this.body.dom.backgroundVertical.appendChild(background)
  }
  return this._isResized() || parentChanged;
};

/**
 * Repaint major and minor text labels and vertical grid lines
 * @private
 */
TimeAxis.prototype._repaintLabels = function () {
  var orientation = this.options.orientation.axis;

  // calculate range and step (step such that we have space for 7 characters per label)
  var start = util.convert(this.body.range.start, 'Number');
  var end = util.convert(this.body.range.end, 'Number');
  var timeLabelsize = this.body.util.toTime((this.props.minorCharWidth || 10) * this.options.maxMinorChars).valueOf();
  var minimumStep = timeLabelsize - DateUtil.getHiddenDurationBefore(this.options.moment, this.body.hiddenDates, this.body.range, timeLabelsize);
  minimumStep -= this.body.util.toTime(0).valueOf();

  var step = new TimeStep(new Date(start), new Date(end), minimumStep, this.body.hiddenDates, this.options);
  step.setMoment(this.options.moment);
  if (this.options.format) {
    step.setFormat(this.options.format);
  }
  if (this.options.timeAxis) {
    step.setScale(this.options.timeAxis);
  }
  this.step = step;

  // Move all DOM elements to a "redundant" list, where they
  // can be picked for re-use, and clear the lists with lines and texts.
  // At the end of the function _repaintLabels, left over elements will be cleaned up
  var dom = this.dom;
  dom.redundant.lines = dom.lines;
  dom.redundant.majorTexts = dom.majorTexts;
  dom.redundant.minorTexts = dom.minorTexts;
  dom.lines = [];
  dom.majorTexts = [];
  dom.minorTexts = [];

  var current;  // eslint-disable-line no-unused-vars
  var next;
  var x;
  var xNext;
  var isMajor;
  var nextIsMajor;  // eslint-disable-line no-unused-vars
  var showMinorGrid;
  var width = 0, prevWidth;
  var line;
  var labelMinor;
  var xFirstMajorLabel = undefined;
  var count = 0;
  const MAX = 1000;
  var className;

  step.start();
  next = step.getCurrent();
  xNext = this.body.util.toScreen(next);
  while (step.hasNext() && count < MAX) {
    count++;

    isMajor = step.isMajor();
    className = step.getClassName();
    labelMinor = step.getLabelMinor();

    current = next;
    x = xNext;

    step.next();
    next = step.getCurrent();
    nextIsMajor = step.isMajor();
    xNext = this.body.util.toScreen(next);

    prevWidth = width;
    width = xNext - x;
    switch (step.scale) {
      case 'week':         showMinorGrid = true; break;
      default:             showMinorGrid = (width >= prevWidth * 0.4); break; // prevent displaying of the 31th of the month on a scale of 5 days
    }

    if (this.options.showMinorLabels && showMinorGrid) {
      var label = this._repaintMinorText(x, labelMinor, orientation, className);
      label.style.width = width + 'px'; // set width to prevent overflow
    }

    if (isMajor && this.options.showMajorLabels) {
      if (x > 0) {
        if (xFirstMajorLabel == undefined) {
          xFirstMajorLabel = x;
        }
        label = this._repaintMajorText(x, step.getLabelMajor(), orientation, className);
      }
      line = this._repaintMajorLine(x, width, orientation, className);
    }
    else { // minor line
      if (showMinorGrid) {
        line = this._repaintMinorLine(x, width, orientation, className);
      }
      else {
        if (line) {
          // adjust the width of the previous grid
          line.style.width = (parseInt (line.style.width) + width) + 'px';
        }
      }
    }
  }

  if (count === MAX && !warnedForOverflow) {
      console.warn(`Something is wrong with the Timeline scale. Limited drawing of grid lines to ${MAX} lines.`);
      warnedForOverflow = true;
  }

  // create a major label on the left when needed
  if (this.options.showMajorLabels) {
    var leftTime = this.body.util.toTime(0),
        leftText = step.getLabelMajor(leftTime),
        widthText = leftText.length * (this.props.majorCharWidth || 10) + 10; // upper bound estimation

    if (xFirstMajorLabel == undefined || widthText < xFirstMajorLabel) {
      this._repaintMajorText(0, leftText, orientation, className);
    }
  }

  // Cleanup leftover DOM elements from the redundant list
  util.forEach(this.dom.redundant, function (arr) {
    while (arr.length) {
      var elem = arr.pop();
      if (elem && elem.parentNode) {
        elem.parentNode.removeChild(elem);
      }
    }
  });
};

/**
 * Create a minor label for the axis at position x
 * @param {number} x
 * @param {string} text
 * @param {string} orientation   "top" or "bottom" (default)
 * @param {string} className
 * @return {Element} Returns the HTML element of the created label
 * @private
 */
TimeAxis.prototype._repaintMinorText = function (x, text, orientation, className) {
  // reuse redundant label
  var label = this.dom.redundant.minorTexts.shift();

  if (!label) {
    // create new label
    var content = document.createTextNode('');
    label = document.createElement('div');
    label.appendChild(content);
    this.dom.foreground.appendChild(label);
  }
  this.dom.minorTexts.push(label);
  label.innerHTML = text;

  label.style.top = (orientation == 'top') ? (this.props.majorLabelHeight + 'px') : '0';

  if (this.options.rtl) {
    label.style.left = "";
    label.style.right = x + 'px';
  } else {
    label.style.left = x + 'px';
  }
  label.className = 'vis-text vis-minor ' + className;
  //label.title = title;  // TODO: this is a heavy operation

  return label;
};

/**
 * Create a Major label for the axis at position x
 * @param {number} x
 * @param {string} text
 * @param {string} orientation   "top" or "bottom" (default)
 * @param {string} className
 * @return {Element} Returns the HTML element of the created label
 * @private
 */
TimeAxis.prototype._repaintMajorText = function (x, text, orientation, className) {
  // reuse redundant label
  var label = this.dom.redundant.majorTexts.shift();

  if (!label) {
    // create label
    var content = document.createElement('div');
    label = document.createElement('div');
    label.appendChild(content);
    this.dom.foreground.appendChild(label);
  }

  label.childNodes[0].innerHTML = text;
  label.className = 'vis-text vis-major ' + className;
  //label.title = title; // TODO: this is a heavy operation

  label.style.top = (orientation == 'top') ? '0' : (this.props.minorLabelHeight  + 'px');
  if (this.options.rtl) {
    label.style.left = "";
    label.style.right = x + 'px';
  } else {
    label.style.left = x + 'px';
  }

  this.dom.majorTexts.push(label);
  return label;
};

/**
 * Create a minor line for the axis at position x
 * @param {number} x
 * @param {number} width
 * @param {string} orientation   "top" or "bottom" (default)
 * @param {string} className
 * @return {Element} Returns the created line
 * @private
 */
TimeAxis.prototype._repaintMinorLine = function (x, width, orientation, className) {
  // reuse redundant line
  var line = this.dom.redundant.lines.shift();
  if (!line) {
    // create vertical line
    line = document.createElement('div');
    this.dom.background.appendChild(line);
  }
  this.dom.lines.push(line);

  var props = this.props;
  if (orientation == 'top') {
    line.style.top = props.majorLabelHeight + 'px';
  }
  else {
    line.style.top = this.body.domProps.top.height + 'px';
  }
  line.style.height = props.minorLineHeight + 'px';
  if (this.options.rtl) {
    line.style.left = "";
    line.style.right = (x - props.minorLineWidth / 2) + 'px';
    line.className = 'vis-grid vis-vertical-rtl vis-minor ' + className;
  } else {
    line.style.left = (x - props.minorLineWidth / 2) + 'px';
    line.className = 'vis-grid vis-vertical vis-minor ' + className;
  }
  line.style.width = width + 'px';

  

  return line;
};

/**
 * Create a Major line for the axis at position x
 * @param {number} x
 * @param {number} width
 * @param {string} orientation   "top" or "bottom" (default)
 * @param {string} className
 * @return {Element} Returns the created line
 * @private
 */
TimeAxis.prototype._repaintMajorLine = function (x, width, orientation, className) {
  // reuse redundant line
  var line = this.dom.redundant.lines.shift();
  if (!line) {
    // create vertical line
    line = document.createElement('div');
    this.dom.background.appendChild(line);
  }
  this.dom.lines.push(line);

  var props = this.props;
  if (orientation == 'top') {
    line.style.top = '0';
  }
  else {
    line.style.top = this.body.domProps.top.height + 'px';
  }

  if (this.options.rtl) {
    line.style.left = "";
    line.style.right = (x - props.majorLineWidth / 2) + 'px';
    line.className = 'vis-grid vis-vertical-rtl vis-major ' + className;
  } else {
    line.style.left = (x - props.majorLineWidth / 2) + 'px';
    line.className = 'vis-grid vis-vertical vis-major ' + className;
  }

  line.style.height = props.majorLineHeight + 'px';
  line.style.width = width  + 'px';

  return line;
};

/**
 * Determine the size of text on the axis (both major and minor axis).
 * The size is calculated only once and then cached in this.props.
 * @private
 */
TimeAxis.prototype._calculateCharSize = function () {
  // Note: We calculate char size with every redraw. Size may change, for
  // example when any of the timelines parents had display:none for example.

  // determine the char width and height on the minor axis
  if (!this.dom.measureCharMinor) {
    this.dom.measureCharMinor = document.createElement('DIV');
    this.dom.measureCharMinor.className = 'vis-text vis-minor vis-measure';
    this.dom.measureCharMinor.style.position = 'absolute';

    this.dom.measureCharMinor.appendChild(document.createTextNode('0'));
    this.dom.foreground.appendChild(this.dom.measureCharMinor);
  }
  this.props.minorCharHeight = this.dom.measureCharMinor.clientHeight;
  this.props.minorCharWidth = this.dom.measureCharMinor.clientWidth;

  // determine the char width and height on the major axis
  if (!this.dom.measureCharMajor) {
    this.dom.measureCharMajor = document.createElement('DIV');
    this.dom.measureCharMajor.className = 'vis-text vis-major vis-measure';
    this.dom.measureCharMajor.style.position = 'absolute';

    this.dom.measureCharMajor.appendChild(document.createTextNode('0'));
    this.dom.foreground.appendChild(this.dom.measureCharMajor);
  }
  this.props.majorCharHeight = this.dom.measureCharMajor.clientHeight;
  this.props.majorCharWidth = this.dom.measureCharMajor.clientWidth;
};


var warnedForOverflow = false;

module.exports = TimeAxis;
