var util = require('../../util');
var DOMutil = require('../../DOMutil');
var Component = require('./Component');

/**
 * Legend for Graph2d
 *
 * @param {vis.Graph2d.body} body
 * @param {vis.Graph2d.options} options
 * @param {number} side
 * @param {vis.LineGraph.options} linegraphOptions
 * @constructor Legend
 * @extends Component
 */
function Legend(body, options, side, linegraphOptions) {
  this.body = body;
  this.defaultOptions = {
    enabled: false,
    icons: true,
    iconSize: 20,
    iconSpacing: 6,
    left: {
      visible: true,
      position: 'top-left' // top/bottom - left,center,right
    },
    right: {
      visible: true,
      position: 'top-right' // top/bottom - left,center,right
    }
  };

  this.side = side;
  this.options = util.extend({}, this.defaultOptions);
  this.linegraphOptions = linegraphOptions;

  this.svgElements = {};
  this.dom = {};
  this.groups = {};
  this.amountOfGroups = 0;
  this._create();
  this.framework = {svg: this.svg, svgElements: this.svgElements, options: this.options, groups: this.groups};

  this.setOptions(options);
}

Legend.prototype = new Component();

Legend.prototype.clear = function() {
  this.groups = {};
  this.amountOfGroups = 0;
};

Legend.prototype.addGroup = function(label, graphOptions) {

  // Include a group only if the group option 'excludeFromLegend: false' is not set.
  if (graphOptions.options.excludeFromLegend != true) {
    if (!this.groups.hasOwnProperty(label)) {
      this.groups[label] = graphOptions;
    }
    this.amountOfGroups += 1;
  }
};

Legend.prototype.updateGroup = function(label, graphOptions) {
  this.groups[label] = graphOptions;
};

Legend.prototype.removeGroup = function(label) {
  if (this.groups.hasOwnProperty(label)) {
    delete this.groups[label];
    this.amountOfGroups -= 1;
  }
};

Legend.prototype._create = function() {
  this.dom.frame = document.createElement('div');
  this.dom.frame.className = 'vis-legend';
  this.dom.frame.style.position = "absolute";
  this.dom.frame.style.top = "10px";
  this.dom.frame.style.display = "block";

  this.dom.textArea = document.createElement('div');
  this.dom.textArea.className = 'vis-legend-text';
  this.dom.textArea.style.position = "relative";
  this.dom.textArea.style.top = "0px";

  this.svg = document.createElementNS('http://www.w3.org/2000/svg',"svg");
  this.svg.style.position = 'absolute';
  this.svg.style.top = 0 +'px';
  this.svg.style.width = this.options.iconSize + 5 + 'px';
  this.svg.style.height = '100%';

  this.dom.frame.appendChild(this.svg);
  this.dom.frame.appendChild(this.dom.textArea);
};

/**
 * Hide the component from the DOM
 */
Legend.prototype.hide = function() {
  // remove the frame containing the items
  if (this.dom.frame.parentNode) {
    this.dom.frame.parentNode.removeChild(this.dom.frame);
  }
};

/**
 * Show the component in the DOM (when not already visible).
 */
Legend.prototype.show = function() {
  // show frame containing the items
  if (!this.dom.frame.parentNode) {
    this.body.dom.center.appendChild(this.dom.frame);
  }
};

Legend.prototype.setOptions = function(options) {
  var fields = ['enabled','orientation','icons','left','right'];
  util.selectiveDeepExtend(fields, this.options, options);
};

Legend.prototype.redraw = function() {
  var activeGroups = 0;
  var groupArray = Object.keys(this.groups);
  groupArray.sort(function (a,b) {
    return (a < b ? -1 : 1);
  })

  for (var i = 0; i < groupArray.length; i++) {
    var groupId = groupArray[i];
    if (this.groups[groupId].visible == true && (this.linegraphOptions.visibility[groupId] === undefined || this.linegraphOptions.visibility[groupId] == true)) {
      activeGroups++;
    }
  }

  if (this.options[this.side].visible == false || this.amountOfGroups == 0 || this.options.enabled == false || activeGroups == 0) {
    this.hide();
  }
  else {
    this.show();
    if (this.options[this.side].position == 'top-left' || this.options[this.side].position == 'bottom-left') {
      this.dom.frame.style.left = '4px';
      this.dom.frame.style.textAlign = "left";
      this.dom.textArea.style.textAlign = "left";
      this.dom.textArea.style.left = (this.options.iconSize + 15) + 'px';
      this.dom.textArea.style.right = '';
      this.svg.style.left = 0 +'px';
      this.svg.style.right = '';
    }
    else {
      this.dom.frame.style.right = '4px';
      this.dom.frame.style.textAlign = "right";
      this.dom.textArea.style.textAlign = "right";
      this.dom.textArea.style.right = (this.options.iconSize + 15) + 'px';
      this.dom.textArea.style.left = '';
      this.svg.style.right = 0 +'px';
      this.svg.style.left = '';
    }

    if (this.options[this.side].position == 'top-left' || this.options[this.side].position == 'top-right') {
      this.dom.frame.style.top = 4 - Number(this.body.dom.center.style.top.replace("px","")) + 'px';
      this.dom.frame.style.bottom = '';
    }
    else {
      var scrollableHeight = this.body.domProps.center.height - this.body.domProps.centerContainer.height;
      this.dom.frame.style.bottom = 4 + scrollableHeight + Number(this.body.dom.center.style.top.replace("px","")) + 'px';
      this.dom.frame.style.top = '';
    }

    if (this.options.icons == false) {
      this.dom.frame.style.width = this.dom.textArea.offsetWidth + 10 + 'px';
      this.dom.textArea.style.right = '';
      this.dom.textArea.style.left = '';
      this.svg.style.width = '0px';
    }
    else {
      this.dom.frame.style.width = this.options.iconSize + 15 + this.dom.textArea.offsetWidth + 10 + 'px'
      this.drawLegendIcons();
    }

    var content = '';
    for (i = 0; i < groupArray.length; i++) {
      groupId = groupArray[i];
      if (this.groups[groupId].visible == true && (this.linegraphOptions.visibility[groupId] === undefined || this.linegraphOptions.visibility[groupId] == true)) {
        content += this.groups[groupId].content + '<br />';
      }
    }
    this.dom.textArea.innerHTML = content;
    this.dom.textArea.style.lineHeight = ((0.75 * this.options.iconSize) + this.options.iconSpacing) + 'px';
  }
};

Legend.prototype.drawLegendIcons = function() {
  if (this.dom.frame.parentNode) {
    var groupArray = Object.keys(this.groups);
    groupArray.sort(function (a,b) {
      return (a < b ? -1 : 1);
    });

    // this resets the elements so the order is maintained
    DOMutil.resetElements(this.svgElements);

    var padding = window.getComputedStyle(this.dom.frame).paddingTop;
    var iconOffset = Number(padding.replace('px',''));
    var x = iconOffset;
    var iconWidth = this.options.iconSize;
    var iconHeight = 0.75 * this.options.iconSize;
    var y = iconOffset + 0.5 * iconHeight + 3;

    this.svg.style.width = iconWidth + 5 + iconOffset + 'px';

    for (var i = 0; i < groupArray.length; i++) {
      var groupId = groupArray[i];
      if (this.groups[groupId].visible == true && (this.linegraphOptions.visibility[groupId] === undefined || this.linegraphOptions.visibility[groupId] == true)) {
        this.groups[groupId].getLegend(iconWidth, iconHeight, this.framework, x, y);
        y += iconHeight + this.options.iconSpacing;
      }
    }
  }
};

module.exports = Legend;
