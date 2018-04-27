var moment = require('../module/moment');
var util = require('../util');
var DataSet = require('../DataSet');
var DataView = require('../DataView');
var Range = require('./Range');
var Core = require('./Core');
var TimeAxis = require('./component/TimeAxis');
var CurrentTime = require('./component/CurrentTime');
var CustomTime = require('./component/CustomTime');
var ItemSet = require('./component/ItemSet');

var printStyle = require('../shared/Validator').printStyle;
var allOptions = require('./optionsTimeline').allOptions;
var configureOptions = require('./optionsTimeline').configureOptions;

var Configurator = require('../shared/Configurator').default;
var Validator = require('../shared/Validator').default;


/**
 * Create a timeline visualization
 * @param {HTMLElement} container
 * @param {vis.DataSet | vis.DataView | Array} [items]
 * @param {vis.DataSet | vis.DataView | Array} [groups]
 * @param {Object} [options]  See Timeline.setOptions for the available options.
 * @constructor Timeline
 * @extends Core
 */
function Timeline (container, items, groups, options) {

  if (!(this instanceof Timeline)) {
    throw new SyntaxError('Constructor must be called with the new operator');
  }

  // if the third element is options, the forth is groups (optionally);
  if (!(Array.isArray(groups) || groups instanceof DataSet || groups instanceof DataView) && groups instanceof Object) {
    var forthArgument = options;
    options = groups;
    groups = forthArgument;
  }

  // TODO: REMOVE THIS in the next MAJOR release
  // see https://github.com/almende/vis/issues/2511
  if (options && options.throttleRedraw) {
    console.warn("Timeline option \"throttleRedraw\" is DEPRICATED and no longer supported. It will be removed in the next MAJOR release.");
  }

  var me = this;
  this.defaultOptions = {
    start: null,
    end:   null,
    autoResize: true,
    orientation: {
      axis: 'bottom',   // axis orientation: 'bottom', 'top', or 'both'
      item: 'bottom'    // not relevant
    },
    moment: moment,
    width: null,
    height: null,
    maxHeight: null,
    minHeight: null,
  };
  this.options = util.deepExtend({}, this.defaultOptions);

  // Create the DOM, props, and emitter
  this._create(container);
  if (!options || (options && typeof options.rtl == "undefined")) {
    this.dom.root.style.visibility = 'hidden';
    var directionFromDom, domNode = this.dom.root;
    while (!directionFromDom && domNode) {
      directionFromDom = window.getComputedStyle(domNode, null).direction;
      domNode = domNode.parentElement;
    }
    this.options.rtl = (directionFromDom && (directionFromDom.toLowerCase() == "rtl"));
  } else {
    this.options.rtl = options.rtl;
  }

  this.options.rollingMode = options && options.rollingMode;
  this.options.onInitialDrawComplete = options && options.onInitialDrawComplete;

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
      getScale: function () {
        return me.timeAxis.step.scale;
      },
      getStep: function () {
        return me.timeAxis.step.step;
      },

      toScreen: me._toScreen.bind(me),
      toGlobalScreen: me._toGlobalScreen.bind(me), // this refers to the root.width
      toTime: me._toTime.bind(me),
      toGlobalTime : me._toGlobalTime.bind(me)
    }
  };

  // range
  this.range = new Range(this.body, this.options);
  this.components.push(this.range);
  this.body.range = this.range;

  // time axis
  this.timeAxis = new TimeAxis(this.body, this.options);
  this.timeAxis2 = null; // used in case of orientation option 'both'
  this.components.push(this.timeAxis);

  // current time bar
  this.currentTime = new CurrentTime(this.body, this.options);
  this.components.push(this.currentTime);

  // item set
  this.itemSet = new ItemSet(this.body, this.options);
  this.components.push(this.itemSet);

  this.itemsData = null;      // DataSet
  this.groupsData = null;     // DataSet

  this.dom.root.onclick = function (event) {
    me.emit('click', me.getEventProperties(event))
  };
  this.dom.root.ondblclick = function (event) {
    me.emit('doubleClick', me.getEventProperties(event))
  };
  this.dom.root.oncontextmenu = function (event) {
    me.emit('contextmenu', me.getEventProperties(event))
  };
  this.dom.root.onmouseover = function (event) {
    me.emit('mouseOver', me.getEventProperties(event))
  };
  if(window.PointerEvent) {
    this.dom.root.onpointerdown = function (event) {
      me.emit('mouseDown', me.getEventProperties(event))
    };
    this.dom.root.onpointermove = function (event) {
      me.emit('mouseMove', me.getEventProperties(event))
    };
    this.dom.root.onpointerup = function (event) {
      me.emit('mouseUp', me.getEventProperties(event))
    };
  } else {
    this.dom.root.onmousemove = function (event) {
      me.emit('mouseMove', me.getEventProperties(event))
    };
    this.dom.root.onmousedown = function (event) {
      me.emit('mouseDown', me.getEventProperties(event))
    };
    this.dom.root.onmouseup = function (event) {
      me.emit('mouseUp', me.getEventProperties(event))
    };
  }

  //Single time autoscale/fit
  this.initialFitDone = false;
  this.on('changed', function (){
    if (this.itemsData == null || this.options.rollingMode) return;
    if (!me.initialFitDone) {
      me.initialFitDone = true;
      if (me.options.start != undefined || me.options.end != undefined) {
        if (me.options.start == undefined || me.options.end == undefined) {
          var range = me.getItemRange();
        }

        var start = me.options.start != undefined ? me.options.start : range.min;
        var end   = me.options.end   != undefined ? me.options.end   : range.max;
        me.setWindow(start, end, {animation: false});
      } else {
        me.fit({animation: false});
      }
    }

    if (!me.initialDrawDone && me.initialRangeChangeDone) {
      me.initialDrawDone = true;
      me.dom.root.style.visibility = 'visible';
      if (me.options.onInitialDrawComplete) {
        setTimeout(() => {
          return me.options.onInitialDrawComplete();
        }, 0)
      }
    }
  });

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
Timeline.prototype = new Core();

/**
 * Load a configurator
 * @return {Object}
 * @private
 */
Timeline.prototype._createConfigurator = function () {
  return new Configurator(this, this.dom.container, configureOptions);
};

/**
 * Force a redraw. The size of all items will be recalculated.
 * Can be useful to manually redraw when option autoResize=false and the window
 * has been resized, or when the items CSS has been changed.
 *
 * Note: this function will be overridden on construction with a trottled version
 */
Timeline.prototype.redraw = function() {
  this.itemSet && this.itemSet.markDirty({refreshItems: true});
  this._redraw();
};

Timeline.prototype.setOptions = function (options) {
  // validate options
  let errorFound = Validator.validate(options, allOptions);

  if (errorFound === true) {
    console.log('%cErrors have been found in the supplied options object.', printStyle);
  }
  Core.prototype.setOptions.call(this, options);

  if ('type' in options) {
    if (options.type !== this.options.type) {
      this.options.type = options.type;

      // force recreation of all items
      var itemsData = this.itemsData;
      if (itemsData) {
        var selection = this.getSelection();
        this.setItems(null);          // remove all
        this.setItems(itemsData);     // add all
        this.setSelection(selection); // restore selection
      }
    }
  }
};

/**
 * Set items
 * @param {vis.DataSet | Array | null} items
 */
Timeline.prototype.setItems = function(items) {
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
  this.itemSet && this.itemSet.setItems(newDataSet);
};

/**
 * Set groups
 * @param {vis.DataSet | Array} groups
 */
Timeline.prototype.setGroups = function(groups) {
  // convert to type DataSet when needed
  var newDataSet;
  if (!groups) {
    newDataSet = null;
  }
  else {
    var filter = function(group) {
      return group.visible !== false;
    }
    if (groups instanceof DataSet || groups instanceof DataView) {
      newDataSet = new DataView(groups,{filter: filter});
    }
    else {
      // turn an array into a dataset
      newDataSet = new DataSet(groups.filter(filter));
    }
  }


  this.groupsData = newDataSet;
  this.itemSet.setGroups(newDataSet);
};

/**
 * Set both items and groups in one go
 * @param {{items: (Array | vis.DataSet), groups: (Array | vis.DataSet)}} data
 */
Timeline.prototype.setData = function (data) {
  if (data && data.groups) {
    this.setGroups(data.groups);
  }

  if (data && data.items) {
    this.setItems(data.items);
  }
};

/**
 * Set selected items by their id. Replaces the current selection
 * Unknown id's are silently ignored.
 * @param {string[] | string} [ids]  An array with zero or more id's of the items to be
 *                                selected. If ids is an empty array, all items will be
 *                                unselected.
 * @param {Object} [options]      Available options:
 *                                `focus: boolean`
 *                                    If true, focus will be set to the selected item(s)
 *                                `animation: boolean | {duration: number, easingFunction: string}`
 *                                    If true (default), the range is animated
 *                                    smoothly to the new window. An object can be
 *                                    provided to specify duration and easing function.
 *                                    Default duration is 500 ms, and default easing
 *                                    function is 'easeInOutQuad'.
 *                                    Only applicable when option focus is true.
 */
Timeline.prototype.setSelection = function(ids, options) {
  this.itemSet && this.itemSet.setSelection(ids);

  if (options && options.focus) {
    this.focus(ids, options);
  }
};

/**
 * Get the selected items by their id
 * @return {Array} ids  The ids of the selected items
 */
Timeline.prototype.getSelection = function() {
  return this.itemSet && this.itemSet.getSelection() || [];
};

/**
 * Adjust the visible window such that the selected item (or multiple items)
 * are centered on screen.
 * @param {string | String[]} id     An item id or array with item ids
 * @param {Object} [options]      Available options:
 *                                `animation: boolean | {duration: number, easingFunction: string}`
 *                                    If true (default), the range is animated
 *                                    smoothly to the new window. An object can be
 *                                    provided to specify duration and easing function.
 *                                    Default duration is 500 ms, and default easing
 *                                    function is 'easeInOutQuad'.
 */
Timeline.prototype.focus = function(id, options) {
  if (!this.itemsData || id == undefined) return;

  var ids = Array.isArray(id) ? id : [id];

  // get the specified item(s)
  var itemsData = this.itemsData.getDataSet().get(ids, {
    type: {
      start: 'Date',
      end: 'Date'
    }
  });

  // calculate minimum start and maximum end of specified items
  var start = null;
  var end = null;
  itemsData.forEach(function (itemData) {
    var s = itemData.start.valueOf();
    var e = 'end' in itemData ? itemData.end.valueOf() : itemData.start.valueOf();

    if (start === null || s < start) {
      start = s;
    }

    if (end === null || e > end) {
      end = e;
    }
  });


  if (start !== null && end !== null) {
    var me = this;
    // Use the first item for the vertical focus
    var item = this.itemSet.items[ids[0]];
    var startPos = this._getScrollTop() * -1;
    var initialVerticalScroll = null;

    // Setup a handler for each frame of the vertical scroll
    var verticalAnimationFrame = function(ease, willDraw, done) {
      var verticalScroll = getItemVerticalScroll(me, item);

      if(!initialVerticalScroll) {
        initialVerticalScroll = verticalScroll;
      }

      if(initialVerticalScroll.itemTop == verticalScroll.itemTop && !initialVerticalScroll.shouldScroll) {
        return; // We don't need to scroll, so do nothing
      }
      else if(initialVerticalScroll.itemTop != verticalScroll.itemTop && verticalScroll.shouldScroll) {
        // The redraw shifted elements, so reset the animation to correct
        initialVerticalScroll = verticalScroll;
        startPos = me._getScrollTop() * -1;
      }      

      var from = startPos;
      var to = initialVerticalScroll.scrollOffset;
      var scrollTop = done ? to : (from + (to - from) * ease);

      me._setScrollTop(-scrollTop);

      if(!willDraw) {
        me._redraw();
      }
    };
    
    // Enforces the final vertical scroll position
    var setFinalVerticalPosition = function() {
      var finalVerticalScroll = getItemVerticalScroll(me, item);

      if (finalVerticalScroll.shouldScroll && finalVerticalScroll.itemTop != initialVerticalScroll.itemTop) {
        me._setScrollTop(-finalVerticalScroll.scrollOffset);
        me._redraw();
      }
    };

    // Perform one last check at the end to make sure the final vertical
    // position is correct
    var finalVerticalCallback = function() {
      // Double check we ended at the proper scroll position
      setFinalVerticalPosition();

      // Let the redraw settle and finalize the position.      
      setTimeout(setFinalVerticalPosition, 100);
    };

    // calculate the new middle and interval for the window
    var middle = (start + end) / 2;
    var interval = Math.max(this.range.end - this.range.start, (end - start) * 1.1);

    var animation = options && options.animation !== undefined ? options.animation : true;

    if (!animation) {
      // We aren't animating so set a default so that the final callback forces the vertical location
      initialVerticalScroll = { shouldScroll: false, scrollOffset: -1, itemTop: -1 };
    }

    this.range.setRange(middle - interval / 2, middle + interval / 2, { animation: animation }, finalVerticalCallback, verticalAnimationFrame);  
  }
};

/**
 * Set Timeline window such that it fits all items
 * @param {Object} [options]  Available options:
 *                                `animation: boolean | {duration: number, easingFunction: string}`
 *                                    If true (default), the range is animated
 *                                    smoothly to the new window. An object can be
 *                                    provided to specify duration and easing function.
 *                                    Default duration is 500 ms, and default easing
 *                                    function is 'easeInOutQuad'.
 * @param {function} [callback]
 */
Timeline.prototype.fit = function (options, callback) {
  var animation = (options && options.animation !== undefined) ? options.animation : true;
  var range;

  var dataset = this.itemsData && this.itemsData.getDataSet();
  if (dataset.length === 1 && dataset.get()[0].end === undefined) {
    // a single item -> don't fit, just show a range around the item from -4 to +3 days
    range = this.getDataRange();
    this.moveTo(range.min.valueOf(), {animation}, callback);
  }
  else {
    // exactly fit the items (plus a small margin)
    range = this.getItemRange();
    this.range.setRange(range.min, range.max, { animation: animation }, callback);
  }
};

/**
 *
 * @param {vis.Item} item
 * @returns {number}
 */
function getStart(item) {
  return util.convert(item.data.start, 'Date').valueOf()
}

/**
 *
 * @param {vis.Item} item
 * @returns {number}
 */
function getEnd(item) {
  var end = item.data.end != undefined ? item.data.end : item.data.start;
  return util.convert(end, 'Date').valueOf();
}

/**
 * @param {vis.Timeline} timeline
 * @param {vis.Item} item
 * @return {{shouldScroll: bool, scrollOffset: number, itemTop: number}}
 */
function getItemVerticalScroll(timeline, item) {
  var leftHeight = timeline.props.leftContainer.height;
  var contentHeight = timeline.props.left.height;
  
  var group = item.parent;
  var offset = group.top;
  var shouldScroll = true;
  var orientation = timeline.timeAxis.options.orientation.axis;
  
  var itemTop = function () {
  if (orientation == "bottom") {
      return group.height - item.top - item.height;
    }
    else {
      return item.top;
    }
  };

  var currentScrollHeight = timeline._getScrollTop() * -1;
  var targetOffset = offset + itemTop();
  var height = item.height;

  if (targetOffset < currentScrollHeight) {
    if (offset + leftHeight <= offset + itemTop() + height) {
      offset += itemTop() - timeline.itemSet.options.margin.item.vertical;
    }
  }
  else if (targetOffset + height > currentScrollHeight + leftHeight) {
    offset += itemTop() + height - leftHeight + timeline.itemSet.options.margin.item.vertical;
  }
  else {
    shouldScroll = false;
  }

  offset = Math.min(offset, contentHeight - leftHeight);

  return { shouldScroll: shouldScroll, scrollOffset: offset, itemTop: targetOffset };
}

/**
 * Determine the range of the items, taking into account their actual width
 * and a margin of 10 pixels on both sides.
 *
 * @returns {{min: Date, max: Date}}
 */
Timeline.prototype.getItemRange = function () {
  // get a rough approximation for the range based on the items start and end dates
  var range = this.getDataRange();
  var min = range.min !== null ? range.min.valueOf() : null;
  var max = range.max !== null ? range.max.valueOf() : null;
  var minItem = null;
  var maxItem = null;

  if (min != null && max != null) {
    var interval = (max - min); // ms
    if (interval <= 0) {
      interval = 10;
    }
    var factor = interval / this.props.center.width;

    var redrawQueue = {};
    var redrawQueueLength = 0;

    // collect redraw functions
    util.forEach(this.itemSet.items, function (item, key) {
      if (item.groupShowing) {
        var returnQueue = true;
        redrawQueue[key] = item.redraw(returnQueue);
        redrawQueueLength = redrawQueue[key].length;
      }
    })

    var needRedraw = redrawQueueLength > 0;
    if (needRedraw) {
      // redraw all regular items
      for (var i = 0; i < redrawQueueLength; i++) {
        util.forEach(redrawQueue, function (fns) {
          fns[i]();
        });
      }
    }

     // calculate the date of the left side and right side of the items given
    util.forEach(this.itemSet.items, function (item) {
      var start = getStart(item);
      var end = getEnd(item);
      var startSide;
      var endSide;

      if (this.options.rtl) {
        startSide  = start - (item.getWidthRight()  + 10) * factor;
        endSide = end   + (item.getWidthLeft() + 10) * factor;
      } else {
        startSide  = start - (item.getWidthLeft()  + 10) * factor;
        endSide = end   + (item.getWidthRight() + 10) * factor;
      }

      if (startSide < min) {
        min = startSide;
        minItem = item;
      }
      if (endSide > max) {
        max = endSide;
        maxItem = item;
      }
    }.bind(this));

    if (minItem && maxItem) {
      var lhs = minItem.getWidthLeft() + 10;
      var rhs = maxItem.getWidthRight() + 10;
      var delta = this.props.center.width - lhs - rhs;  // px

      if (delta > 0) {
        if (this.options.rtl) {
          min = getStart(minItem) - rhs * interval / delta; // ms
          max = getEnd(maxItem)   + lhs * interval / delta; // ms
        } else {
          min = getStart(minItem) - lhs * interval / delta; // ms
          max = getEnd(maxItem)   + rhs * interval / delta; // ms
        }
      }
    }
  }

  return {
    min: min != null ? new Date(min) : null,
    max: max != null ? new Date(max) : null
  }
};

/**
 * Calculate the data range of the items start and end dates
 * @returns {{min: Date, max: Date}}
 */
Timeline.prototype.getDataRange = function() {
  var min = null;
  var max = null;

  var dataset = this.itemsData && this.itemsData.getDataSet();
  if (dataset) {
    dataset.forEach(function (item) {
      var start = util.convert(item.start, 'Date').valueOf();
      var end   = util.convert(item.end != undefined ? item.end : item.start, 'Date').valueOf();
      if (min === null || start < min) {
        min = start;
      }
      if (max === null || end > max) {
        max = end;
      }
    });
  }

  return {
    min: min != null ? new Date(min) : null,
    max: max != null ? new Date(max) : null
  }
};

/**
 * Generate Timeline related information from an event
 * @param {Event} event
 * @return {Object} An object with related information, like on which area
 *                  The event happened, whether clicked on an item, etc.
 */
Timeline.prototype.getEventProperties = function (event) {
  var clientX = event.center ? event.center.x : event.clientX;
  var clientY = event.center ? event.center.y : event.clientY;
  var x;
  if (this.options.rtl) {
    x = util.getAbsoluteRight(this.dom.centerContainer) - clientX;
  } else {
    x = clientX - util.getAbsoluteLeft(this.dom.centerContainer);
  }
  var y = clientY - util.getAbsoluteTop(this.dom.centerContainer);

  var item  = this.itemSet.itemFromTarget(event);
  var group = this.itemSet.groupFromTarget(event);
  var customTime = CustomTime.customTimeFromTarget(event);

  var snap = this.itemSet.options.snap || null;
  var scale = this.body.util.getScale();
  var step = this.body.util.getStep();
  var time = this._toTime(x);
  var snappedTime = snap ? snap(time, scale, step) : time;

  var element = util.getTarget(event);
  var what = null;
  if (item != null)                                                    {what = 'item';}
  else if (customTime != null)                                         {what = 'custom-time';}
  else if (util.hasParent(element, this.timeAxis.dom.foreground))      {what = 'axis';}
  else if (this.timeAxis2 && util.hasParent(element, this.timeAxis2.dom.foreground)) {what = 'axis';}
  else if (util.hasParent(element, this.itemSet.dom.labelSet))         {what = 'group-label';}
  else if (util.hasParent(element, this.currentTime.bar))              {what = 'current-time';}
  else if (util.hasParent(element, this.dom.center))                   {what = 'background';}

  return {
    event: event,
    item: item ? item.id : null,
    group: group ? group.groupId : null,
    what: what,
    pageX: event.srcEvent ? event.srcEvent.pageX : event.pageX,
    pageY: event.srcEvent ? event.srcEvent.pageY : event.pageY,
    x: x,
    y: y,
    time: time,
    snappedTime: snappedTime
  }
};

/**
 * Toggle Timeline rolling mode
 */

Timeline.prototype.toggleRollingMode = function () {
  if (this.range.rolling) {
    this.range.stopRolling();
  } else {
    if (this.options.rollingMode == undefined) {
      this.setOptions(this.options)
    }
    this.range.startRolling();
  }

}

module.exports = Timeline;
