var util = require('../../util');
var Bars = require('./graph2d_types/bar');
var Lines = require('./graph2d_types/line');
var Points = require('./graph2d_types/points');

/**
 * /**
 * @param {object} group            | the object of the group from the dataset
 * @param {string} groupId          | ID of the group
 * @param {object} options          | the default options
 * @param {array} groupsUsingDefaultStyles  | this array has one entree.
 *                                            It is passed as an array so it is passed by reference.
 *                                            It enumerates through the default styles
 * @constructor GraphGroup
 */
function GraphGroup(group, groupId, options, groupsUsingDefaultStyles) {
  this.id = groupId;
  var fields = ['sampling', 'style', 'sort', 'yAxisOrientation', 'barChart', 'drawPoints', 'shaded', 'interpolation', 'zIndex','excludeFromStacking', 'excludeFromLegend'];
  this.options = util.selectiveBridgeObject(fields, options);
  this.usingDefaultStyle = group.className === undefined;
  this.groupsUsingDefaultStyles = groupsUsingDefaultStyles;
  this.zeroPosition = 0;
  this.update(group);
  if (this.usingDefaultStyle == true) {
    this.groupsUsingDefaultStyles[0] += 1;
  }
  this.itemsData = [];
  this.visible = group.visible === undefined ? true : group.visible;
}

/**
 * this loads a reference to all items in this group into this group.
 * @param {array} items
 */
GraphGroup.prototype.setItems = function (items) {
  if (items != null) {
    this.itemsData = items;
    if (this.options.sort == true) {
      util.insertSort(this.itemsData,function (a, b) {
        return a.x > b.x ? 1 : -1;
      });
    }
  }
  else {
    this.itemsData = [];
  }
};

GraphGroup.prototype.getItems = function () {
  return this.itemsData;
};

/**
 * this is used for barcharts and shading, this way, we only have to calculate it once.
 * @param {number} pos
 */
GraphGroup.prototype.setZeroPosition = function (pos) {
  this.zeroPosition = pos;
};

/**
 * set the options of the graph group over the default options.
 * @param {Object} options
 */
GraphGroup.prototype.setOptions = function (options) {
  if (options !== undefined) {
    var fields = ['sampling', 'style', 'sort', 'yAxisOrientation', 'barChart', 'zIndex','excludeFromStacking', 'excludeFromLegend'];
    util.selectiveDeepExtend(fields, this.options, options);

    // if the group's drawPoints is a function delegate the callback to the onRender property
    if (typeof options.drawPoints == 'function') {
      options.drawPoints = {
        onRender: options.drawPoints
      }
    }

    util.mergeOptions(this.options, options, 'interpolation');
    util.mergeOptions(this.options, options, 'drawPoints');
    util.mergeOptions(this.options, options, 'shaded');

    if (options.interpolation) {
      if (typeof options.interpolation == 'object') {
        if (options.interpolation.parametrization) {
          if (options.interpolation.parametrization == 'uniform') {
            this.options.interpolation.alpha = 0;
          }
          else if (options.interpolation.parametrization == 'chordal') {
            this.options.interpolation.alpha = 1.0;
          }
          else {
            this.options.interpolation.parametrization = 'centripetal';
            this.options.interpolation.alpha = 0.5;
          }
        }
      }
    }
  }
};


/**
 * this updates the current group class with the latest group dataset entree, used in _updateGroup in linegraph
 * @param {vis.Group} group
 */
GraphGroup.prototype.update = function (group) {
  this.group = group;
  this.content = group.content || 'graph';
  this.className = group.className || this.className || 'vis-graph-group' + this.groupsUsingDefaultStyles[0] % 10;
  this.visible = group.visible === undefined ? true : group.visible;
  this.style = group.style;
  this.setOptions(group.options);
};

/**
 * return the legend entree for this group.
 *
 * @param {number} iconWidth
 * @param {number} iconHeight
 * @param {{svg: (*|Element), svgElements: Object, options: Object, groups: Array.<Object>}} framework
 * @param {number} x
 * @param {number} y
 * @returns {{icon: (*|Element), label: (*|string), orientation: *}}
 */
GraphGroup.prototype.getLegend = function (iconWidth, iconHeight, framework, x, y) {
  if (framework == undefined || framework == null) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', "svg");
    framework = {svg: svg, svgElements:{}, options: this.options, groups: [this]}
  }
  if (x == undefined || x == null){
    x = 0;
  }
  if (y == undefined || y == null){
    y = 0.5 * iconHeight;
  }
  switch (this.options.style){
    case "line":
      Lines.drawIcon(this, x, y, iconWidth, iconHeight, framework);
      break;
    case "points": //explicit no break
    case "point":
      Points.drawIcon(this, x, y, iconWidth, iconHeight, framework);
      break;
    case "bar":
      Bars.drawIcon(this, x, y, iconWidth, iconHeight, framework);
      break;
  }
  return {icon: framework.svg, label: this.content, orientation: this.options.yAxisOrientation};
};

GraphGroup.prototype.getYRange = function (groupData) {
  var yMin = groupData[0].y;
  var yMax = groupData[0].y;
  for (var j = 0; j < groupData.length; j++) {
    yMin = yMin > groupData[j].y ? groupData[j].y : yMin;
    yMax = yMax < groupData[j].y ? groupData[j].y : yMax;
  }
  return {min: yMin, max: yMax, yAxisOrientation: this.options.yAxisOrientation};
};

module.exports = GraphGroup;
