////////////////////////////////////////////////////////////////////////////////
// This modules handles the options for Graph3d.
//
////////////////////////////////////////////////////////////////////////////////
var util = require('../util');
var Camera  = require('./Camera');
var Point3d = require('./Point3d');


// enumerate the available styles
var STYLE = {
  BAR     : 0,
  BARCOLOR: 1,
  BARSIZE : 2,
  DOT     : 3,
  DOTLINE : 4,
  DOTCOLOR: 5,
  DOTSIZE : 6,
  GRID    : 7,
  LINE    : 8,
  SURFACE : 9
};


// The string representations of the styles
var STYLENAME = {
  'dot'      : STYLE.DOT,
  'dot-line' : STYLE.DOTLINE,
  'dot-color': STYLE.DOTCOLOR,
  'dot-size' : STYLE.DOTSIZE,
  'line'     : STYLE.LINE,
  'grid'     : STYLE.GRID,
  'surface'  : STYLE.SURFACE,
  'bar'      : STYLE.BAR,
  'bar-color': STYLE.BARCOLOR,
  'bar-size' : STYLE.BARSIZE
};


/**
 * Field names in the options hash which are of relevance to the user.
 *
 * Specifically, these are the fields which require no special handling,
 * and can be directly copied over.
 */
var OPTIONKEYS = [
  'width',
  'height',
  'filterLabel',
  'legendLabel',
  'xLabel',
  'yLabel',
  'zLabel',
  'xValueLabel',
  'yValueLabel',
  'zValueLabel',
  'showXAxis',
  'showYAxis',
  'showZAxis',
  'showGrid',
  'showPerspective',
  'showShadow',
  'keepAspectRatio',
  'verticalRatio',
  'dotSizeRatio',
  'dotSizeMinFraction',
  'dotSizeMaxFraction',
  'showAnimationControls',
  'animationInterval',
  'animationPreload',
  'animationAutoStart',
  'axisColor',
  'gridColor',
  'xCenter',
  'yCenter',
];


/**
 * Field names in the options hash which are of relevance to the user.
 *
 * Same as OPTIONKEYS, but internally these fields are stored with 
 * prefix 'default' in the name.
 */
var PREFIXEDOPTIONKEYS = [
  'xBarWidth',
  'yBarWidth',
  'valueMin',
  'valueMax',
  'xMin',
  'xMax',
  'xStep',
  'yMin',
  'yMax',
  'yStep',
  'zMin',
  'zMax',
  'zStep'
];


// Placeholder for DEFAULTS reference
var DEFAULTS = undefined; 


/**
 * Check if given hash is empty.
 *
 * Source: http://stackoverflow.com/a/679937
 *
 * @param {object} obj
 * @returns {boolean}
 */
function isEmpty(obj) {
  for(var prop in obj) {
    if (obj.hasOwnProperty(prop))
      return false;
  }

  return true;
}


/**
 * Make first letter of parameter upper case.
 *
 * Source: http://stackoverflow.com/a/1026087
 *
 * @param {string} str
 * @returns {string}
 */
function capitalize(str) {
  if (str === undefined || str === "" || typeof str != "string") {
    return str;
  }

  return str.charAt(0).toUpperCase() + str.slice(1);
}


/**
 * Add a prefix to a field name, taking style guide into account
 *
 * @param {string} prefix
 * @param {string} fieldName
 * @returns {string}
 */
function prefixFieldName(prefix, fieldName) {
  if (prefix === undefined || prefix === "") {
    return fieldName;
  }

  return prefix + capitalize(fieldName);
}


/**
 * Forcibly copy fields from src to dst in a controlled manner.
 *
 * A given field in dst will always be overwitten. If this field
 * is undefined or not present in src, the field in dst will 
 * be explicitly set to undefined.
 * 
 * The intention here is to be able to reset all option fields.
 * 
 * Only the fields mentioned in array 'fields' will be handled.
 *
 * @param {object} src
 * @param {object} dst
 * @param {array<string>} fields array with names of fields to copy
 * @param {string} [prefix] prefix to use for the target fields.
 */
function forceCopy(src, dst, fields, prefix) {
  var srcKey;
  var dstKey;

  for (var i = 0; i < fields.length; ++i) {
    srcKey  = fields[i];
    dstKey  = prefixFieldName(prefix, srcKey);

    dst[dstKey] = src[srcKey];
  }
}


/**
 * Copy fields from src to dst in a safe and controlled manner.
 *
 * Only the fields mentioned in array 'fields' will be copied over,
 * and only if these are actually defined.
 *
 * @param {object} src
 * @param {object} dst
 * @param {array<string>} fields array with names of fields to copy
 * @param {string} [prefix] prefix to use for the target fields.
 */
function safeCopy(src, dst, fields, prefix) {
  var srcKey;
  var dstKey;

  for (var i = 0; i < fields.length; ++i) {
    srcKey  = fields[i];
    if (src[srcKey] === undefined) continue;

    dstKey  = prefixFieldName(prefix, srcKey);

    dst[dstKey] = src[srcKey];
  }
}


/**
 * Initialize dst with the values in src.
 *
 * src is the hash with the default values. 
 * A reference DEFAULTS to this hash is stored locally for 
 * further handling.
 *
 * For now, dst is assumed to be a Graph3d instance.
 * @param {object} src
 * @param {object} dst
 */
function setDefaults(src, dst) {
  if (src === undefined || isEmpty(src)) {
    throw new Error('No DEFAULTS passed');
  }
  if (dst === undefined) {
    throw new Error('No dst passed');
  }

  // Remember defaults for future reference
  DEFAULTS = src;

  // Handle the defaults which can be simply copied over
  forceCopy(src, dst, OPTIONKEYS);
  forceCopy(src, dst, PREFIXEDOPTIONKEYS, 'default');

  // Handle the more complex ('special') fields
  setSpecialSettings(src, dst);

  // Following are internal fields, not part of the user settings
  dst.margin = 10;                  // px
  dst.showGrayBottom = false;       // TODO: this does not work correctly
  dst.showTooltip = false;
  dst.onclick_callback = null;
  dst.eye = new Point3d(0, 0, -1);  // TODO: set eye.z about 3/4 of the width of the window?
}

/**
 *
 * @param {object} options
 * @param {object} dst
 */
function setOptions(options, dst) {
  if (options === undefined) {
    return;
  }
  if (dst === undefined) {
    throw new Error('No dst passed');
  }

  if (DEFAULTS === undefined || isEmpty(DEFAULTS)) {
    throw new Error('DEFAULTS not set for module Settings');
  }

  // Handle the parameters which can be simply copied over
  safeCopy(options, dst, OPTIONKEYS);
  safeCopy(options, dst, PREFIXEDOPTIONKEYS, 'default');

  // Handle the more complex ('special') fields
  setSpecialSettings(options, dst);
}

/**
 * Special handling for certain parameters
 *
 * 'Special' here means: setting requires more than a simple copy
 *
 * @param {object} src
 * @param {object} dst
 */
function setSpecialSettings(src, dst) {
  if (src.backgroundColor !== undefined) {
    setBackgroundColor(src.backgroundColor, dst);
  }

  setDataColor(src.dataColor, dst);
  setStyle(src.style, dst);
  setShowLegend(src.showLegend, dst);
  setCameraPosition(src.cameraPosition, dst);

  // As special fields go, this is an easy one; just a translation of the name.
  // Can't use this.tooltip directly, because that field exists internally
  if (src.tooltip !== undefined) {
    dst.showTooltip = src.tooltip;
  }
  if (src.onclick != undefined) {
    dst.onclick_callback = src.onclick;
  }

  if (src.tooltipStyle !== undefined) {
    util.selectiveDeepExtend(['tooltipStyle'], dst, src);
  }
}


/**
 * Set the value of setting 'showLegend'
 *
 * This depends on the value of the style fields, so it must be called
 * after the style field has been initialized.
 *
 * @param {boolean} showLegend
 * @param {object} dst
 */
function setShowLegend(showLegend, dst) {
  if (showLegend === undefined) {
    // If the default was auto, make a choice for this field
    var isAutoByDefault = (DEFAULTS.showLegend === undefined);

    if (isAutoByDefault) {
      // these styles default to having legends
      var isLegendGraphStyle = dst.style === STYLE.DOTCOLOR
                            || dst.style === STYLE.DOTSIZE;

      dst.showLegend = isLegendGraphStyle;
    } else {
       // Leave current value as is
    }
  } else {
    dst.showLegend = showLegend;
  }
}


/**
 * Retrieve the style index from given styleName
 * @param {string} styleName  Style name such as 'dot', 'grid', 'dot-line'
 * @return {number} styleNumber Enumeration value representing the style, or -1
 *                when not found
 */
function getStyleNumberByName(styleName) {
  var number = STYLENAME[styleName];

  if (number === undefined) {
    return -1;
  }

  return number;
}


/**
 * Check if given number is a valid style number.
 *
 * @param {string | number} style
 * @return {boolean} true if valid, false otherwise
 */
function checkStyleNumber(style) {
  var valid = false;

  for (var n in STYLE) {
    if (STYLE[n] === style) {
      valid = true;
      break;
    }
  }

  return valid;
}

/**
 *
 * @param {string | number} style
 * @param {Object} dst
 */
function setStyle(style, dst) {
  if (style === undefined) {
    return;   // Nothing to do
  }

  var styleNumber;

  if (typeof style === 'string') {
    styleNumber = getStyleNumberByName(style);

    if (styleNumber === -1 ) {
      throw new Error('Style \'' + style + '\' is invalid');
    }
  } else {
    // Do a pedantic check on style number value
    if (!checkStyleNumber(style)) {
      throw new Error('Style \'' + style + '\' is invalid');
    }

    styleNumber = style;
  }

  dst.style = styleNumber;
}


/**
 * Set the background styling for the graph
 * @param {string | {fill: string, stroke: string, strokeWidth: string}} backgroundColor
 * @param {Object} dst
 */
function setBackgroundColor(backgroundColor, dst) {
  var fill = 'white';
  var stroke = 'gray';
  var strokeWidth = 1;

  if (typeof(backgroundColor) === 'string') {
    fill = backgroundColor;
    stroke = 'none';
    strokeWidth = 0;
  }
  else if (typeof(backgroundColor) === 'object') {
    if (backgroundColor.fill !== undefined)    fill = backgroundColor.fill;
    if (backgroundColor.stroke !== undefined)    stroke = backgroundColor.stroke;
    if (backgroundColor.strokeWidth !== undefined) strokeWidth = backgroundColor.strokeWidth;
  }
  else {
    throw new Error('Unsupported type of backgroundColor');
  }

  dst.frame.style.backgroundColor = fill;
  dst.frame.style.borderColor = stroke;
  dst.frame.style.borderWidth = strokeWidth + 'px';
  dst.frame.style.borderStyle = 'solid';
}

/**
 *
 * @param {string | Object} dataColor
 * @param {Object} dst
 */
function setDataColor(dataColor, dst) {
  if (dataColor === undefined) {
    return;    // Nothing to do
  }

  if (dst.dataColor === undefined) {
    dst.dataColor = {};
  }

  if (typeof dataColor === 'string') {
    dst.dataColor.fill   = dataColor;
    dst.dataColor.stroke = dataColor;
  }
  else {
    if (dataColor.fill) {
      dst.dataColor.fill = dataColor.fill;
    }
    if (dataColor.stroke) {
      dst.dataColor.stroke = dataColor.stroke;
    }
    if (dataColor.strokeWidth !== undefined) {
      dst.dataColor.strokeWidth = dataColor.strokeWidth;
    }
  }
}

/**
 *
 * @param {Object} cameraPosition
 * @param {Object} dst
 */
function setCameraPosition(cameraPosition, dst) {
  var camPos = cameraPosition;
  if (camPos === undefined) {
    return;
  }

  if (dst.camera === undefined) {
    dst.camera = new Camera();
  }

  dst.camera.setArmRotation(camPos.horizontal, camPos.vertical);
  dst.camera.setArmLength(camPos.distance);
}


module.exports.STYLE             = STYLE;
module.exports.setDefaults       = setDefaults;
module.exports.setOptions        = setOptions;
module.exports.setCameraPosition = setCameraPosition;
