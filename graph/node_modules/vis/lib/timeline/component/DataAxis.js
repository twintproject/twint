var util = require('../../util');
var DOMutil = require('../../DOMutil');
var Component = require('./Component');
var DataScale = require('./DataScale');
/**
 * A horizontal time axis
 * @param {Object} body
 * @param {Object} [options]        See DataAxis.setOptions for the available
 *                                  options.
 * @param {SVGElement} svg
 * @param {vis.LineGraph.options} linegraphOptions
 * @constructor DataAxis
 * @extends Component
 */
function DataAxis(body, options, svg, linegraphOptions) {
  this.id = util.randomUUID();
  this.body = body;

  this.defaultOptions = {
    orientation: 'left',  // supported: 'left', 'right'
    showMinorLabels: true,
    showMajorLabels: true,
    icons: false,
    majorLinesOffset: 7,
    minorLinesOffset: 4,
    labelOffsetX: 10,
    labelOffsetY: 2,
    iconWidth: 20,
    width: '40px',
    visible: true,
    alignZeros: true,
    left: {
      range: {min: undefined, max: undefined},
      format: function (value) {
        return '' + parseFloat(value.toPrecision(3));
      },
      title: {text: undefined, style: undefined}
    },
    right: {
      range: {min: undefined, max: undefined},
      format: function (value) {
        return '' + parseFloat(value.toPrecision(3));
      },
      title: {text: undefined, style: undefined}
    }
  };

  this.linegraphOptions = linegraphOptions;
  this.linegraphSVG = svg;
  this.props = {};
  this.DOMelements = { // dynamic elements
    lines: {},
    labels: {},
    title: {}
  };

  this.dom = {};
  this.scale = undefined;
  this.range = {start: 0, end: 0};

  this.options = util.extend({}, this.defaultOptions);
  this.conversionFactor = 1;

  this.setOptions(options);
  this.width = Number(('' + this.options.width).replace("px", ""));
  this.minWidth = this.width;
  this.height = this.linegraphSVG.getBoundingClientRect().height;
  this.hidden = false;

  this.stepPixels = 25;
  this.zeroCrossing = -1;
  this.amountOfSteps = -1;

  this.lineOffset = 0;
  this.master = true;
  this.masterAxis = null;
  this.svgElements = {};
  this.iconsRemoved = false;

  this.groups = {};
  this.amountOfGroups = 0;

  // create the HTML DOM
  this._create();
  this.framework = {svg: this.svg, svgElements: this.svgElements, options: this.options, groups: this.groups};

  var me = this;
  this.body.emitter.on("verticalDrag", function () {
    me.dom.lineContainer.style.top = me.body.domProps.scrollTop + 'px';
  });
}

DataAxis.prototype = new Component();


DataAxis.prototype.addGroup = function (label, graphOptions) {
  if (!this.groups.hasOwnProperty(label)) {
    this.groups[label] = graphOptions;
  }
  this.amountOfGroups += 1;
};

DataAxis.prototype.updateGroup = function (label, graphOptions) {
  if (!this.groups.hasOwnProperty(label)) {
    this.amountOfGroups += 1;
  }
  this.groups[label] = graphOptions;
};

DataAxis.prototype.removeGroup = function (label) {
  if (this.groups.hasOwnProperty(label)) {
    delete this.groups[label];
    this.amountOfGroups -= 1;
  }
};


DataAxis.prototype.setOptions = function (options) {
  if (options) {
    var redraw = false;
    if (this.options.orientation != options.orientation && options.orientation !== undefined) {
      redraw = true;
    }
    var fields = [
      'orientation',
      'showMinorLabels',
      'showMajorLabels',
      'icons',
      'majorLinesOffset',
      'minorLinesOffset',
      'labelOffsetX',
      'labelOffsetY',
      'iconWidth',
      'width',
      'visible',
      'left',
      'right',
      'alignZeros'
    ];
    util.selectiveDeepExtend(fields, this.options, options);

    this.minWidth = Number(('' + this.options.width).replace("px", ""));
    if (redraw === true && this.dom.frame) {
      this.hide();
      this.show();
    }
  }
};


/**
 * Create the HTML DOM for the DataAxis
 */
DataAxis.prototype._create = function () {
  this.dom.frame = document.createElement('div');
  this.dom.frame.style.width = this.options.width;
  this.dom.frame.style.height = this.height;

  this.dom.lineContainer = document.createElement('div');
  this.dom.lineContainer.style.width = '100%';
  this.dom.lineContainer.style.height = this.height;
  this.dom.lineContainer.style.position = 'relative';

  // create svg element for graph drawing.
  this.svg = document.createElementNS('http://www.w3.org/2000/svg', "svg");
  this.svg.style.position = "absolute";
  this.svg.style.top = '0px';
  this.svg.style.height = '100%';
  this.svg.style.width = '100%';
  this.svg.style.display = "block";
  this.dom.frame.appendChild(this.svg);
};

DataAxis.prototype._redrawGroupIcons = function () {
  DOMutil.prepareElements(this.svgElements);

  var x;
  var iconWidth = this.options.iconWidth;
  var iconHeight = 15;
  var iconOffset = 4;
  var y = iconOffset + 0.5 * iconHeight;

  if (this.options.orientation === 'left') {
    x = iconOffset;
  }
  else {
    x = this.width - iconWidth - iconOffset;
  }

  var groupArray = Object.keys(this.groups);
  groupArray.sort(function (a, b) {
    return (a < b ? -1 : 1);
  })

  for (var i = 0; i < groupArray.length; i++) {
    var groupId = groupArray[i];
    if (this.groups[groupId].visible === true && (this.linegraphOptions.visibility[groupId] === undefined || this.linegraphOptions.visibility[groupId] === true)) {
      this.groups[groupId].getLegend(iconWidth, iconHeight, this.framework, x, y);
      y += iconHeight + iconOffset;
    }
  }

  DOMutil.cleanupElements(this.svgElements);
  this.iconsRemoved = false;
};

DataAxis.prototype._cleanupIcons = function () {
  if (this.iconsRemoved === false) {
    DOMutil.prepareElements(this.svgElements);
    DOMutil.cleanupElements(this.svgElements);
    this.iconsRemoved = true;
  }
}

/**
 * Create the HTML DOM for the DataAxis
 */
DataAxis.prototype.show = function () {
  this.hidden = false;
  if (!this.dom.frame.parentNode) {
    if (this.options.orientation === 'left') {
      this.body.dom.left.appendChild(this.dom.frame);
    }
    else {
      this.body.dom.right.appendChild(this.dom.frame);
    }
  }

  if (!this.dom.lineContainer.parentNode) {
    this.body.dom.backgroundHorizontal.appendChild(this.dom.lineContainer);
  }
};

/**
 * Create the HTML DOM for the DataAxis
 */
DataAxis.prototype.hide = function () {
  this.hidden = true;
  if (this.dom.frame.parentNode) {
    this.dom.frame.parentNode.removeChild(this.dom.frame);
  }

  if (this.dom.lineContainer.parentNode) {
    this.dom.lineContainer.parentNode.removeChild(this.dom.lineContainer);
  }
};

/**
 * Set a range (start and end)
 * @param {number} start
 * @param {number} end
 */
DataAxis.prototype.setRange = function (start, end) {
  this.range.start = start;
  this.range.end = end;
};

/**
 * Repaint the component
 * @return {boolean} Returns true if the component is resized
 */
DataAxis.prototype.redraw = function () {
  var resized = false;
  var activeGroups = 0;

  // Make sure the line container adheres to the vertical scrolling.
  this.dom.lineContainer.style.top = this.body.domProps.scrollTop + 'px';

  for (var groupId in this.groups) {
    if (this.groups.hasOwnProperty(groupId)) {
      if (this.groups[groupId].visible === true && (this.linegraphOptions.visibility[groupId] === undefined || this.linegraphOptions.visibility[groupId] === true)) {
        activeGroups++;
      }
    }
  }
  if (this.amountOfGroups === 0 || activeGroups === 0) {
    this.hide();
  }
  else {
    this.show();
    this.height = Number(this.linegraphSVG.style.height.replace("px", ""));

    // svg offsetheight did not work in firefox and explorer...
    this.dom.lineContainer.style.height = this.height + 'px';
    this.width = this.options.visible === true ? Number(('' + this.options.width).replace("px", "")) : 0;

    var props = this.props;
    var frame = this.dom.frame;

    // update classname
    frame.className = 'vis-data-axis';

    // calculate character width and height
    this._calculateCharSize();

    var orientation = this.options.orientation;
    var showMinorLabels = this.options.showMinorLabels;
    var showMajorLabels = this.options.showMajorLabels;

    // determine the width and height of the elements for the axis
    props.minorLabelHeight = showMinorLabels ? props.minorCharHeight : 0;
    props.majorLabelHeight = showMajorLabels ? props.majorCharHeight : 0;

    props.minorLineWidth = this.body.dom.backgroundHorizontal.offsetWidth - this.lineOffset - this.width + 2 * this.options.minorLinesOffset;
    props.minorLineHeight = 1;
    props.majorLineWidth = this.body.dom.backgroundHorizontal.offsetWidth - this.lineOffset - this.width + 2 * this.options.majorLinesOffset;
    props.majorLineHeight = 1;

    //  take frame offline while updating (is almost twice as fast)
    if (orientation === 'left') {
      frame.style.top = '0';
      frame.style.left = '0';
      frame.style.bottom = '';
      frame.style.width = this.width + 'px';
      frame.style.height = this.height + "px";
      this.props.width = this.body.domProps.left.width;
      this.props.height = this.body.domProps.left.height;
    }
    else { // right
      frame.style.top = '';
      frame.style.bottom = '0';
      frame.style.left = '0';
      frame.style.width = this.width + 'px';
      frame.style.height = this.height + "px";
      this.props.width = this.body.domProps.right.width;
      this.props.height = this.body.domProps.right.height;
    }

    resized = this._redrawLabels();
    resized = this._isResized() || resized;

    if (this.options.icons === true) {
      this._redrawGroupIcons();
    }
    else {
      this._cleanupIcons();
    }

    this._redrawTitle(orientation);
  }
  return resized;
};

/**
 * Repaint major and minor text labels and vertical grid lines
 *
 * @returns {boolean}
 * @private
 */
DataAxis.prototype._redrawLabels = function () {
  var resized = false;
  DOMutil.prepareElements(this.DOMelements.lines);
  DOMutil.prepareElements(this.DOMelements.labels);
  var orientation = this.options['orientation'];
  var customRange = this.options[orientation].range != undefined ? this.options[orientation].range : {};

  //Override range with manual options:
  var autoScaleEnd = true;
  if (customRange.max != undefined) {
    this.range.end = customRange.max;
    autoScaleEnd = false;
  }
  var autoScaleStart = true;
  if (customRange.min != undefined) {
    this.range.start = customRange.min;
    autoScaleStart = false;
  }

  this.scale = new DataScale(
    this.range.start,
    this.range.end,
    autoScaleStart,
    autoScaleEnd,
    this.dom.frame.offsetHeight,
    this.props.majorCharHeight,
    this.options.alignZeros,
    this.options[orientation].format
  );

  if (this.master === false && this.masterAxis != undefined) {
    this.scale.followScale(this.masterAxis.scale);
  }

  //Is updated in side-effect of _redrawLabel():
  this.maxLabelSize = 0;

  var lines = this.scale.getLines();
  lines.forEach(
    line=> {
      var y = line.y;
      var isMajor = line.major;
      if (this.options['showMinorLabels'] && isMajor === false) {
        this._redrawLabel(y - 2, line.val, orientation, 'vis-y-axis vis-minor', this.props.minorCharHeight);
      }
      if (isMajor) {
        if (y >= 0) {
          this._redrawLabel(y - 2, line.val, orientation, 'vis-y-axis vis-major', this.props.majorCharHeight);
        }
      }
      if (this.master === true) {
        if (isMajor) {
          this._redrawLine(y, orientation, 'vis-grid vis-horizontal vis-major', this.options.majorLinesOffset, this.props.majorLineWidth);
        }
        else {
          this._redrawLine(y, orientation, 'vis-grid vis-horizontal vis-minor', this.options.minorLinesOffset, this.props.minorLineWidth);
        }
      }
    });

  // Note that title is rotated, so we're using the height, not width!
  var titleWidth = 0;
  if (this.options[orientation].title !== undefined && this.options[orientation].title.text !== undefined) {
    titleWidth = this.props.titleCharHeight;
  }
  var offset = this.options.icons === true ? Math.max(this.options.iconWidth, titleWidth) + this.options.labelOffsetX + 15 : titleWidth + this.options.labelOffsetX + 15;

  // this will resize the yAxis to accommodate the labels.
  if (this.maxLabelSize > (this.width - offset) && this.options.visible === true) {
    this.width = this.maxLabelSize + offset;
    this.options.width = this.width + "px";
    DOMutil.cleanupElements(this.DOMelements.lines);
    DOMutil.cleanupElements(this.DOMelements.labels);
    this.redraw();
    resized = true;
  }
  // this will resize the yAxis if it is too big for the labels.
  else if (this.maxLabelSize < (this.width - offset) && this.options.visible === true && this.width > this.minWidth) {
    this.width = Math.max(this.minWidth, this.maxLabelSize + offset);
    this.options.width = this.width + "px";
    DOMutil.cleanupElements(this.DOMelements.lines);
    DOMutil.cleanupElements(this.DOMelements.labels);
    this.redraw();
    resized = true;
  }
  else {
    DOMutil.cleanupElements(this.DOMelements.lines);
    DOMutil.cleanupElements(this.DOMelements.labels);
    resized = false;
  }

  return resized;
};

DataAxis.prototype.convertValue = function (value) {
  return this.scale.convertValue(value);
};

DataAxis.prototype.screenToValue = function (x) {
  return this.scale.screenToValue(x);
};

/**
 * Create a label for the axis at position x
 *
 * @param {number} y
 * @param {string} text
 * @param {'top'|'right'|'bottom'|'left'} orientation
 * @param {string} className
 * @param {number} characterHeight
 * @private
 */
DataAxis.prototype._redrawLabel = function (y, text, orientation, className, characterHeight) {
  // reuse redundant label
  var label = DOMutil.getDOMElement('div', this.DOMelements.labels, this.dom.frame); //this.dom.redundant.labels.shift();
  label.className = className;
  label.innerHTML = text;
  if (orientation === 'left') {
    label.style.left = '-' + this.options.labelOffsetX + 'px';
    label.style.textAlign = "right";
  }
  else {
    label.style.right = '-' + this.options.labelOffsetX + 'px';
    label.style.textAlign = "left";
  }

  label.style.top = y - 0.5 * characterHeight + this.options.labelOffsetY + 'px';

  text += '';

  var largestWidth = Math.max(this.props.majorCharWidth, this.props.minorCharWidth);
  if (this.maxLabelSize < text.length * largestWidth) {
    this.maxLabelSize = text.length * largestWidth;
  }
};

/**
 * Create a minor line for the axis at position y
 * @param {number} y
 * @param {'top'|'right'|'bottom'|'left'} orientation
 * @param {string} className
 * @param {number} offset
 * @param {number} width
 */
DataAxis.prototype._redrawLine = function (y, orientation, className, offset, width) {
  if (this.master === true) {
    var line = DOMutil.getDOMElement('div', this.DOMelements.lines, this.dom.lineContainer);//this.dom.redundant.lines.shift();
    line.className = className;
    line.innerHTML = '';

    if (orientation === 'left') {
      line.style.left = (this.width - offset) + 'px';
    }
    else {
      line.style.right = (this.width - offset) + 'px';
    }

    line.style.width = width + 'px';
    line.style.top = y + 'px';
  }
};

/**
 * Create a title for the axis
 * @private
 * @param {'top'|'right'|'bottom'|'left'} orientation
 */
DataAxis.prototype._redrawTitle = function (orientation) {
  DOMutil.prepareElements(this.DOMelements.title);

  // Check if the title is defined for this axes
  if (this.options[orientation].title !== undefined && this.options[orientation].title.text !== undefined) {
    var title = DOMutil.getDOMElement('div', this.DOMelements.title, this.dom.frame);
    title.className = 'vis-y-axis vis-title vis-' + orientation;
    title.innerHTML = this.options[orientation].title.text;

    // Add style - if provided
    if (this.options[orientation].title.style !== undefined) {
      util.addCssText(title, this.options[orientation].title.style);
    }

    if (orientation === 'left') {
      title.style.left = this.props.titleCharHeight + 'px';
    }
    else {
      title.style.right = this.props.titleCharHeight + 'px';
    }

    title.style.width = this.height + 'px';
  }

  // we need to clean up in case we did not use all elements.
  DOMutil.cleanupElements(this.DOMelements.title);
};


/**
 * Determine the size of text on the axis (both major and minor axis).
 * The size is calculated only once and then cached in this.props.
 * @private
 */
DataAxis.prototype._calculateCharSize = function () {
  // determine the char width and height on the minor axis
  if (!('minorCharHeight' in this.props)) {
    var textMinor = document.createTextNode('0');
    var measureCharMinor = document.createElement('div');
    measureCharMinor.className = 'vis-y-axis vis-minor vis-measure';
    measureCharMinor.appendChild(textMinor);
    this.dom.frame.appendChild(measureCharMinor);

    this.props.minorCharHeight = measureCharMinor.clientHeight;
    this.props.minorCharWidth = measureCharMinor.clientWidth;

    this.dom.frame.removeChild(measureCharMinor);
  }

  if (!('majorCharHeight' in this.props)) {
    var textMajor = document.createTextNode('0');
    var measureCharMajor = document.createElement('div');
    measureCharMajor.className = 'vis-y-axis vis-major vis-measure';
    measureCharMajor.appendChild(textMajor);
    this.dom.frame.appendChild(measureCharMajor);

    this.props.majorCharHeight = measureCharMajor.clientHeight;
    this.props.majorCharWidth = measureCharMajor.clientWidth;

    this.dom.frame.removeChild(measureCharMajor);
  }

  if (!('titleCharHeight' in this.props)) {
    var textTitle = document.createTextNode('0');
    var measureCharTitle = document.createElement('div');
    measureCharTitle.className = 'vis-y-axis vis-title vis-measure';
    measureCharTitle.appendChild(textTitle);
    this.dom.frame.appendChild(measureCharTitle);

    this.props.titleCharHeight = measureCharTitle.clientHeight;
    this.props.titleCharWidth = measureCharTitle.clientWidth;

    this.dom.frame.removeChild(measureCharTitle);
  }
};

module.exports = DataAxis;
