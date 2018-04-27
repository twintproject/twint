var moment = require('../module/moment');
var util = require('../util');
var DataSet = require('../DataSet');
var DataView = require('../DataView');
var Range = require('./Range');
var Core = require('./Core');
var TimeAxis = require('./component/TimeAxis');
var CurrentTime = require('./component/CurrentTime');
var CustomTime = require('./component/CustomTime');
var LineGraph = require('./component/LineGraph');

var printStyle = require('../shared/Validator').printStyle;
var allOptions = require('./optionsGraph2d').allOptions;
var configureOptions = require('./optionsGraph2d').configureOptions;

var Configurator = require('../shared/Configurator').default;
var Validator = require('../shared/Validator').default;

/**
 * Create a timeline visualization
 * @param {HTMLElement} container
 * @param {vis.DataSet | Array} [items]
 * @param {vis.DataSet | Array | vis.DataView | Object} [groups]
 * @param {Object} [options]  See Graph2d.setOptions for the available options.
 * @constructor Graph2d
 * @extends Core
 */
function Graph2d (container, items, groups, options) {
  // if the third element is options, the forth is groups (optionally);
  if (!(Array.isArray(groups) || groups instanceof DataSet || groups instanceof DataView) && groups instanceof Object) {
    var forthArgument = options;
    options = groups;
    groups = forthArgument;
  }

  // TODO: REMOVE THIS in the next MAJOR release
  // see https://github.com/almende/vis/issues/2511
  if (options && options.throttleRedraw) {
    console.warn("Graph2d option \"throttleRedraw\" is DEPRICATED and no longer supported. It will be removed in the next MAJOR release.");
  }

  var me = this;
  this.defaultOptions = {
    start: null,
    end:   null,

    autoResize: true,

    orientation: {
      axis: 'bottom',   // axis orientation: 'bottom', 'top', or 'both'
      item: 'bottom'    // not relevant for Graph2d
    },

    moment: moment,

    width: null,
    height: null,
    maxHeight: null,
    minHeight: null
  };
  this.options = util.deepExtend({}, this.defaultOptions);

  // Create the DOM, props, and emitter
  this._create(container);

  // all components listed here will be repainted automatically
  this.components = [];

  this.body = {
    dom: this.dom,
    domProps: this.props,
    emitter: {
      on: this.on.bind(this),
      off: this.off.bind(this),
      emit: this.emit.bind(this)
    },
    hiddenDates: [],
    util: {
      toScreen: me._toScreen.bind(me),
      toGlobalScreen: me._toGlobalScreen.bind(me), // this refers to the root.width
      toTime: me._toTime.bind(me),
      toGlobalTime : me._toGlobalTime.bind(me)
    }
  };

  // range
  this.range = new Range(this.body);
  this.components.push(this.range);
  this.body.range = this.range;

  // time axis
  this.timeAxis = new TimeAxis(this.body);
  this.components.push(this.timeAxis);
  //this.body.util.snap = this.timeAxis.snap.bind(this.timeAxis);

  // current time bar
  this.currentTime = new CurrentTime(this.body);
  this.components.push(this.currentTime);

  // item set
  this.linegraph = new LineGraph(this.body);

  this.components.push(this.linegraph);

  this.itemsData = null;      // DataSet
  this.groupsData = null;     // DataSet


  this.on('tap', function (event) {
    me.emit('click', me.getEventProperties(event))
  });
  this.on('doubletap', function (event) {
    me.emit('doubleClick', me.getEventProperties(event))
  });
  this.dom.root.oncontextmenu = function (event) {
    me.emit('contextmenu', me.getEventProperties(event))
  };

  // apply options
  if (options) {
    this.setOptions(options);
  }

  // IMPORTANT: THIS HAPPENS BEFORE SET ITEMS!
  if (groups) {
    this.setGroups(groups);
  }

  // create itemset
  if (items) {
    this.setItems(items);
  }

  // draw for the first time
  this._redraw();
}

// Extend the functionality from Core
Graph2d.prototype = new Core();

Graph2d.prototype.setOptions = function (options) {
  // validate options
  let errorFound = Validator.validate(options, allOptions);
  if (errorFound === true) {
    console.log('%cErrors have been found in the supplied options object.', printStyle);
  }

  Core.prototype.setOptions.call(this, options);
};

/**
 * Set items
 * @param {vis.DataSet | Array | null} items
 */
Graph2d.prototype.setItems = function(items) {
  var initialLoad = (this.itemsData == null);

  // convert to type DataSet when needed
  var newDataSet;
  if (!items) {
    newDataSet = null;
  }
  else if (items instanceof DataSet || items instanceof DataView) {
    newDataSet = items;
  }
  else {
    // turn an array into a dataset
    newDataSet = new DataSet(items, {
      type: {
        start: 'Date',
        end: 'Date'
      }
    });
  }

  // set items
  this.itemsData = newDataSet;
  this.linegraph && this.linegraph.setItems(newDataSet);

  if (initialLoad) {
    if (this.options.start != undefined || this.options.end != undefined) {
      var start = this.options.start != undefined ? this.options.start : null;
      var end   = this.options.end != undefined   ? this.options.end : null;
      this.setWindow(start, end, {animation: false});
    }
    else {
      this.fit({animation: false});
    }
  }
};

/**
 * Set groups
 * @param {vis.DataSet | Array} groups
 */
Graph2d.prototype.setGroups = function(groups) {
  // convert to type DataSet when needed
  var newDataSet;
  if (!groups) {
    newDataSet = null;
  }
  else if (groups instanceof DataSet || groups instanceof DataView) {
    newDataSet = groups;
  }
  else {
    // turn an array into a dataset
    newDataSet = new DataSet(groups);
  }

  this.groupsData = newDataSet;
  this.linegraph.setGroups(newDataSet);
};

/**
 * Returns an object containing an SVG element with the icon of the group (size determined by iconWidth and iconHeight), the label of the group (content) and the yAxisOrientation of the group (left or right).
 * @param {vis.GraphGroup.id} groupId
 * @param {number} width
 * @param {number} height
 * @returns {{icon: SVGElement, label: string, orientation: string}|string}
 */
Graph2d.prototype.getLegend = function(groupId, width, height) {
  if (width  === undefined) {width  = 15;}
  if (height === undefined) {height = 15;}
  if (this.linegraph.groups[groupId] !== undefined) {
    return this.linegraph.groups[groupId].getLegend(width,height);
  }
  else {
    return "cannot find group:'" +  groupId + "'";
  }
};

/**
 * This checks if the visible option of the supplied group (by ID) is true or false.
 * @param {vis.GraphGroup.id} groupId
 * @returns {boolean}
 */
Graph2d.prototype.isGroupVisible = function(groupId) {
  if (this.linegraph.groups[groupId] !== undefined) {
    return (this.linegraph.groups[groupId].visible && (this.linegraph.options.groups.visibility[groupId] === undefined || this.linegraph.options.groups.visibility[groupId] == true));
  }
  else {
    return false;
  }
};


/**
 * Get the data range of the item set.
 * @returns {{min: Date, max: Date}} range  A range with a start and end Date.
 *                                          When no minimum is found, min==null
 *                                          When no maximum is found, max==null
 */
Graph2d.prototype.getDataRange = function() {
  var min = null;
  var max = null;

  // calculate min from start filed
  for (var groupId in this.linegraph.groups) {
    if (this.linegraph.groups.hasOwnProperty(groupId)) {
      if (this.linegraph.groups[groupId].visible == true) {
        for (var i = 0; i < this.linegraph.groups[groupId].itemsData.length; i++) {
          var item = this.linegraph.groups[groupId].itemsData[i];
          var value = util.convert(item.x, 'Date').valueOf();
          min = min == null ? value : min > value ? value : min;
          max = max == null ? value : max < value ? value : max;
        }
      }
    }
  }

  return {
    min: (min != null) ? new Date(min) : null,
    max: (max != null) ? new Date(max) : null
  };
};


/**
 * Generate Timeline related information from an event
 * @param {Event} event
 * @return {Object} An object with related information, like on which area
 *                  The event happened, whether clicked on an item, etc.
 */
Graph2d.prototype.getEventProperties = function (event) {
  var clientX = event.center ? event.center.x : event.clientX;
  var clientY = event.center ? event.center.y : event.clientY;
  var x = clientX - util.getAbsoluteLeft(this.dom.centerContainer);
  var y = clientY - util.getAbsoluteTop(this.dom.centerContainer);
  var time = this._toTime(x);

  var customTime = CustomTime.customTimeFromTarget(event);

  var element = util.getTarget(event);
  var what = null;
  if (util.hasParent(element, this.timeAxis.dom.foreground))              {what = 'axis';}
  else if (this.timeAxis2 && util.hasParent(element, this.timeAxis2.dom.foreground)) {what = 'axis';}
  else if (util.hasParent(element, this.linegraph.yAxisLeft.dom.frame))   {what = 'data-axis';}
  else if (util.hasParent(element, this.linegraph.yAxisRight.dom.frame))  {what = 'data-axis';}
  else if (util.hasParent(element, this.linegraph.legendLeft.dom.frame))  {what = 'legend';}
  else if (util.hasParent(element, this.linegraph.legendRight.dom.frame)) {what = 'legend';}
  else if (customTime != null)                {what = 'custom-time';}
  else if (util.hasParent(element, this.currentTime.bar))                 {what = 'current-time';}
  else if (util.hasParent(element, this.dom.center))                      {what = 'background';}

  var value = [];
  var yAxisLeft = this.linegraph.yAxisLeft;
  var yAxisRight = this.linegraph.yAxisRight;
  if (!yAxisLeft.hidden && this.itemsData.length > 0) {
    value.push(yAxisLeft.screenToValue(y));
  }
  if (!yAxisRight.hidden && this.itemsData.length > 0) {
    value.push(yAxisRight.screenToValue(y));
  }

  return {
    event: event,
    what: what,
    pageX: event.srcEvent ? event.srcEvent.pageX : event.pageX,
    pageY: event.srcEvent ? event.srcEvent.pageY : event.pageY,
    x: x,
    y: y,
    time: time,
    value: value
  }
};

/**
 * Load a configurator
 * @return {Object}
 * @private
 */
Graph2d.prototype._createConfigurator = function () {
  return new Configurator(this, this.dom.container, configureOptions);
};


module.exports = Graph2d;
