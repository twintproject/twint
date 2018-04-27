/**
 * This object contains all possible options. It will check if the types are correct, if required if the option is one
 * of the allowed values.
 *
 * __any__ means that the name of the property does not matter.
 * __type__ is a required field for all objects and contains the allowed types of all objects
 */
let string   = 'string';
let bool     = 'boolean';
let number   = 'number';
let object   = 'object';   // should only be in a __type__ property
// Following not used here, but useful for reference
//let array    = 'array';
//let dom      = 'dom';
//let any      = 'any';


let colorOptions = {
  fill       : { string },
  stroke     : { string },
  strokeWidth: { number },
  __type__   : { string, object, 'undefined': 'undefined' }
};


/**
 * Order attempted to be alphabetical.
 *   - x/y/z-prefixes ignored in sorting
 *   - __type__ always at end
 *   - globals at end
 */
let allOptions = {
  animationAutoStart: { boolean: bool, 'undefined': 'undefined' },
  animationInterval : { number },
  animationPreload  : { boolean: bool },
  axisColor         : { string },
  backgroundColor   : colorOptions,
  xBarWidth         : { number, 'undefined': 'undefined' },
  yBarWidth         : { number, 'undefined': 'undefined' },
  cameraPosition    : {
    distance  : { number },
    horizontal: { number },
    vertical  : { number },
    __type__  : { object }
  },
  xCenter           : { string },
  yCenter           : { string },
  dataColor         : colorOptions,
  dotSizeMinFraction: { number },
  dotSizeMaxFraction: { number },
  dotSizeRatio      : { number },
  filterLabel       : { string },
  gridColor         : { string },
  onclick           : { 'function': 'function' },
  keepAspectRatio   : { boolean: bool },
  xLabel            : { string },
  yLabel            : { string },
  zLabel            : { string },
  legendLabel       : { string },
  xMin              : { number, 'undefined': 'undefined' },
  yMin              : { number, 'undefined': 'undefined' },
  zMin              : { number, 'undefined': 'undefined' },
  xMax              : { number, 'undefined': 'undefined' },
  yMax              : { number, 'undefined': 'undefined' },
  zMax              : { number, 'undefined': 'undefined' },
  showAnimationControls: { boolean: bool, 'undefined': 'undefined' },
  showGrid          : { boolean: bool },
  showLegend        : { boolean: bool, 'undefined': 'undefined' },
  showPerspective   : { boolean: bool },
  showShadow        : { boolean: bool },
  showXAxis         : { boolean: bool },
  showYAxis         : { boolean: bool },
  showZAxis         : { boolean: bool },
  xStep             : { number, 'undefined': 'undefined' },
  yStep             : { number, 'undefined': 'undefined' },
  zStep             : { number, 'undefined': 'undefined' },
  style: {
    number,        // TODO: either Graph3d.DEFAULT has string, or number allowed in documentation
    string: [
      'bar',
      'bar-color',
      'bar-size',
      'dot',
      'dot-line',
      'dot-color',
      'dot-size',
      'line',
      'grid',
      'surface'
    ]
  },
  tooltip      : { boolean: bool, 'function': 'function' },
  tooltipStyle : {
    content: {
      color       : { string },
      background  : { string },
      border      : { string },
      borderRadius: { string },
      boxShadow   : { string },
      padding     : { string },
      __type__    : { object }
    },
    line: {
      borderLeft: { string },
      height    : { string },
      width     : { string },
      __type__  : { object }
    },
    dot: {
      border      : { string },
      borderRadius: { string },
      height      : { string },
      width       : { string },
      __type__    : { object},
    },
     __type__: { object}
  },
  xValueLabel   : { 'function': 'function' },
  yValueLabel   : { 'function': 'function' },
  zValueLabel   : { 'function': 'function' },
  valueMax      : { number, 'undefined': 'undefined' },
  valueMin      : { number, 'undefined': 'undefined' },
  verticalRatio : { number },

  //globals :
  height: { string },
  width: { string },
  __type__: { object }
};


export {allOptions};
