var Emitter = require('emitter-component');
var Hammer = require('../module/hammer');
var hammerUtil = require('../hammerUtil');
var util = require('../util');
var TimeAxis = require('./component/TimeAxis');
var Activator = require('../shared/Activator');
var DateUtil = require('./DateUtil');
var CustomTime = require('./component/CustomTime');

/**
 * Create a timeline visualization
 * @constructor Core
 */
function Core () {}

// turn Core into an event emitter
Emitter(Core.prototype);

/**
 * Create the main DOM for the Core: a root panel containing left, right,
 * top, bottom, content, and background panel.
 * @param {Element} container  The container element where the Core will
 *                             be attached.
 * @protected
 */
Core.prototype._create = function (container) {
  this.dom = {};

  this.dom.container = container;

  this.dom.root                 = document.createElement('div');
  this.dom.background           = document.createElement('div');
  this.dom.backgroundVertical   = document.createElement('div');
  this.dom.backgroundHorizontal = document.createElement('div');
  this.dom.centerContainer      = document.createElement('div');
  this.dom.leftContainer        = document.createElement('div');
  this.dom.rightContainer       = document.createElement('div');
  this.dom.center               = document.createElement('div');
  this.dom.left                 = document.createElement('div');
  this.dom.right                = document.createElement('div');
  this.dom.top                  = document.createElement('div');
  this.dom.bottom               = document.createElement('div');
  this.dom.shadowTop            = document.createElement('div');
  this.dom.shadowBottom         = document.createElement('div');
  this.dom.shadowTopLeft        = document.createElement('div');
  this.dom.shadowBottomLeft     = document.createElement('div');
  this.dom.shadowTopRight       = document.createElement('div');
  this.dom.shadowBottomRight    = document.createElement('div');
  this.dom.rollingModeBtn       = document.createElement('div');

  this.dom.root.className                 = 'vis-timeline';
  this.dom.background.className           = 'vis-panel vis-background';
  this.dom.backgroundVertical.className   = 'vis-panel vis-background vis-vertical';
  this.dom.backgroundHorizontal.className = 'vis-panel vis-background vis-horizontal';
  this.dom.centerContainer.className      = 'vis-panel vis-center';
  this.dom.leftContainer.className        = 'vis-panel vis-left';
  this.dom.rightContainer.className       = 'vis-panel vis-right';
  this.dom.top.className                  = 'vis-panel vis-top';
  this.dom.bottom.className               = 'vis-panel vis-bottom';
  this.dom.left.className                 = 'vis-content';
  this.dom.center.className               = 'vis-content';
  this.dom.right.className                = 'vis-content';
  this.dom.shadowTop.className            = 'vis-shadow vis-top';
  this.dom.shadowBottom.className         = 'vis-shadow vis-bottom';
  this.dom.shadowTopLeft.className        = 'vis-shadow vis-top';
  this.dom.shadowBottomLeft.className     = 'vis-shadow vis-bottom';
  this.dom.shadowTopRight.className       = 'vis-shadow vis-top';
  this.dom.shadowBottomRight.className    = 'vis-shadow vis-bottom';
  this.dom.rollingModeBtn.className       = 'vis-rolling-mode-btn';

  this.dom.root.appendChild(this.dom.background);
  this.dom.root.appendChild(this.dom.backgroundVertical);
  this.dom.root.appendChild(this.dom.backgroundHorizontal);
  this.dom.root.appendChild(this.dom.centerContainer);
  this.dom.root.appendChild(this.dom.leftContainer);
  this.dom.root.appendChild(this.dom.rightContainer);
  this.dom.root.appendChild(this.dom.top);
  this.dom.root.appendChild(this.dom.bottom);
  this.dom.root.appendChild(this.dom.bottom);
  this.dom.root.appendChild(this.dom.rollingModeBtn);

  this.dom.centerContainer.appendChild(this.dom.center);
  this.dom.leftContainer.appendChild(this.dom.left);
  this.dom.rightContainer.appendChild(this.dom.right);
  this.dom.centerContainer.appendChild(this.dom.shadowTop);
  this.dom.centerContainer.appendChild(this.dom.shadowBottom);
  this.dom.leftContainer.appendChild(this.dom.shadowTopLeft);
  this.dom.leftContainer.appendChild(this.dom.shadowBottomLeft);
  this.dom.rightContainer.appendChild(this.dom.shadowTopRight);
  this.dom.rightContainer.appendChild(this.dom.shadowBottomRight);

  // size properties of each of the panels
  this.props = {
    root: {},
    background: {},
    centerContainer: {},
    leftContainer: {},
    rightContainer: {},
    center: {},
    left: {},
    right: {},
    top: {},
    bottom: {},
    border: {},
    scrollTop: 0,
    scrollTopMin: 0
  };

  this.on('rangechange', function () {
    if (this.initialDrawDone === true) {
      this._redraw();
    }
  }.bind(this));
  this.on('rangechanged', function () {
    if (!this.initialRangeChangeDone) {
      this.initialRangeChangeDone = true;
    }
  }.bind(this));
  this.on('touch',       this._onTouch.bind(this));
  this.on('panmove',         this._onDrag.bind(this));

  var me = this;
  this._origRedraw = this._redraw.bind(this);
  this._redraw = util.throttle(this._origRedraw);

  this.on('_change', function (properties) {
    if (me.itemSet && me.itemSet.initialItemSetDrawn && properties && properties.queue == true) {
      me._redraw()
    } else {
      me._origRedraw();
    }
  });

  // create event listeners for all interesting events, these events will be
  // emitted via emitter
  this.hammer = new Hammer(this.dom.root);
  var pinchRecognizer = this.hammer.get('pinch').set({enable: true});
  hammerUtil.disablePreventDefaultVertically(pinchRecognizer);
  this.hammer.get('pan').set({threshold:5, direction: Hammer.DIRECTION_HORIZONTAL});
  this.listeners = {};

  var events = [
    'tap', 'doubletap', 'press',
    'pinch',
    'pan', 'panstart', 'panmove', 'panend'
      // TODO: cleanup
    //'touch', 'pinch',
    //'tap', 'doubletap', 'hold',
    //'dragstart', 'drag', 'dragend',
    //'mousewheel', 'DOMMouseScroll' // DOMMouseScroll is needed for Firefox
  ];
  events.forEach(function (type) {
    var listener = function (event) {
      if (me.isActive()) {
        me.emit(type, event);
      }
    };
    me.hammer.on(type, listener);
    me.listeners[type] = listener;
  });

  // emulate a touch event (emitted before the start of a pan, pinch, tap, or press)
  hammerUtil.onTouch(this.hammer, function (event) {
    me.emit('touch', event);
  }.bind(this));

  // emulate a release event (emitted after a pan, pinch, tap, or press)
  hammerUtil.onRelease(this.hammer, function (event) {
    me.emit('release', event);
  }.bind(this));

  /**
   *
   * @param {WheelEvent} event
   */
  function onMouseWheel(event) {
    if (this.isActive()) {
      this.emit('mousewheel', event);
    }

    // deltaX and deltaY normalization from jquery.mousewheel.js
    var deltaX = 0;
    var deltaY = 0;

    // Old school scrollwheel delta
    if ( 'detail'      in event ) { deltaY = event.detail * -1;      }
    if ( 'wheelDelta'  in event ) { deltaY = event.wheelDelta;       }
    if ( 'wheelDeltaY' in event ) { deltaY = event.wheelDeltaY;      }
    if ( 'wheelDeltaX' in event ) { deltaX = event.wheelDeltaX * -1; }

    // Firefox < 17 horizontal scrolling related to DOMMouseScroll event
    if ( 'axis' in event && event.axis === event.HORIZONTAL_AXIS ) {
      deltaX = deltaY * -1;
      deltaY = 0;
    }

    // New school wheel delta (wheel event)
    if ( 'deltaY' in event ) {
      deltaY = event.deltaY * -1;
    }
    if ( 'deltaX' in event ) {
      deltaX = event.deltaX;
    }

    // prevent scrolling when zoomKey defined or activated
    if (!this.options.zoomKey || event[this.options.zoomKey]) return;

    // Prevent default actions caused by mouse wheel
    // (else the page and timeline both scroll)
    event.preventDefault();

    if (this.options.verticalScroll && Math.abs(deltaY) >= Math.abs(deltaX)) {
      var current = this.props.scrollTop;
      var adjusted = current + deltaY;

      if (this.isActive()) {
        this._setScrollTop(adjusted);
        this._redraw();
        this.emit('scroll', event);
      }
    } else if (this.options.horizontalScroll) {
      var delta = Math.abs(deltaX) >= Math.abs(deltaY) ? deltaX : deltaY;

      // calculate a single scroll jump relative to the range scale
      var diff = (delta / 120) * (this.range.end - this.range.start) / 20;
      // calculate new start and end
      var newStart = this.range.start + diff;
      var newEnd = this.range.end + diff;

      var options = {
        animation: false,
        byUser: true,
        event: event
      };
      this.range.setRange(newStart, newEnd, options);
    }
  }

  if (this.dom.centerContainer.addEventListener) {
    // IE9, Chrome, Safari, Opera
    this.dom.centerContainer.addEventListener("mousewheel", onMouseWheel.bind(this), false);
    // Firefox
    this.dom.centerContainer.addEventListener("DOMMouseScroll", onMouseWheel.bind(this), false);
  } else {
    // IE 6/7/8
    this.dom.centerContainer.attachEvent("onmousewheel", onMouseWheel.bind(this));
  }

  /**
   *
   * @param {scroll} event
   */
  function onMouseScrollSide(event) {
    if (!me.options.verticalScroll) return;
    event.preventDefault();
    if (me.isActive()) {
      var adjusted = -event.target.scrollTop;
      me._setScrollTop(adjusted);
      me._redraw();
      me.emit('scrollSide', event);
    }
  }

  this.dom.left.parentNode.addEventListener('scroll', onMouseScrollSide.bind(this));
  this.dom.right.parentNode.addEventListener('scroll', onMouseScrollSide.bind(this));

  var itemAddedToTimeline = false;

  /**
   *
   * @param {dragover} event
   * @returns {boolean}
   */
  function handleDragOver(event) {
    if (event.preventDefault) {
      event.preventDefault(); // Necessary. Allows us to drop.
    }

    // make sure your target is a vis element
    if (!event.target.className.indexOf("vis") > -1) return;

    // make sure only one item is added every time you're over the timeline
    if (itemAddedToTimeline) return;

    event.dataTransfer.dropEffect = 'move';  
    itemAddedToTimeline = true;
    return false;
  }

  /**
   *
   * @param {drop} event
   * @returns {boolean}
   */
  function handleDrop(event) {
    // prevent redirect to blank page - Firefox
    if(event.preventDefault) { event.preventDefault(); }
    if(event.stopPropagation) { event.stopPropagation(); }
    // return when dropping non-vis items
    try {
      var itemData = JSON.parse(event.dataTransfer.getData("text"))
      if (!itemData || !itemData.content) return
    } catch (err) {
      return false;
    }

    itemAddedToTimeline = false;
    event.center = {
      x: event.clientX,
      y: event.clientY
    };

    if (itemData.target !== 'item') {
      me.itemSet._onAddItem(event);
    } else {
      me.itemSet._onDropObjectOnItem(event);
    }
    me.emit('drop', me.getEventProperties(event))
    return false;
  }

  this.dom.center.addEventListener('dragover', handleDragOver.bind(this), false);
  this.dom.center.addEventListener('drop', handleDrop.bind(this), false);

  this.customTimes = [];

  // store state information needed for touch events
  this.touch = {};

  this.redrawCount = 0;
  this.initialDrawDone = false;
  this.initialRangeChangeDone = false;

  // attach the root panel to the provided container
  if (!container) throw new Error('No container provided');
  container.appendChild(this.dom.root);
};

/**
 * Set options. Options will be passed to all components loaded in the Timeline.
 * @param {Object} [options]
 *                           {String} orientation
 *                              Vertical orientation for the Timeline,
 *                              can be 'bottom' (default) or 'top'.
 *                           {string | number} width
 *                              Width for the timeline, a number in pixels or
 *                              a css string like '1000px' or '75%'. '100%' by default.
 *                           {string | number} height
 *                              Fixed height for the Timeline, a number in pixels or
 *                              a css string like '400px' or '75%'. If undefined,
 *                              The Timeline will automatically size such that
 *                              its contents fit.
 *                           {string | number} minHeight
 *                              Minimum height for the Timeline, a number in pixels or
 *                              a css string like '400px' or '75%'.
 *                           {string | number} maxHeight
 *                              Maximum height for the Timeline, a number in pixels or
 *                              a css string like '400px' or '75%'.
 *                           {number | Date | string} start
 *                              Start date for the visible window
 *                           {number | Date | string} end
 *                              End date for the visible window
 */
Core.prototype.setOptions = function (options) {
  if (options) {
    // copy the known options
    var fields = [
      'width', 'height', 'minHeight', 'maxHeight', 'autoResize',
      'start', 'end', 'clickToUse', 'dataAttributes', 'hiddenDates',
      'locale', 'locales', 'moment', 'rtl', 'zoomKey', 'horizontalScroll', 'verticalScroll'
    ];
    util.selectiveExtend(fields, this.options, options); 

    this.dom.rollingModeBtn.style.visibility = 'hidden';

    if (this.options.rtl) {
      this.dom.container.style.direction = "rtl";
      this.dom.backgroundVertical.className = 'vis-panel vis-background vis-vertical-rtl';    
    }

    if (this.options.verticalScroll) {
      if (this.options.rtl) {
        this.dom.rightContainer.className = 'vis-panel vis-right vis-vertical-scroll';
      } else {
        this.dom.leftContainer.className = 'vis-panel vis-left vis-vertical-scroll';
      }
    }

    if (typeof this.options.orientation !== 'object') {
      this.options.orientation = {item:undefined,axis:undefined};
    }
    if ('orientation' in options) {
      if (typeof options.orientation === 'string') {
        this.options.orientation = {
          item: options.orientation,
          axis: options.orientation
        };
      }
      else if (typeof options.orientation === 'object') {
        if ('item' in options.orientation) {
          this.options.orientation.item = options.orientation.item;
        }
        if ('axis' in options.orientation) {
          this.options.orientation.axis = options.orientation.axis;
        }
      }
    }

    if (this.options.orientation.axis === 'both') {
      if (!this.timeAxis2) {
        var timeAxis2 = this.timeAxis2 = new TimeAxis(this.body);
        timeAxis2.setOptions = function (options) {
          var _options = options ? util.extend({}, options) : {};
          _options.orientation = 'top'; // override the orientation option, always top
          TimeAxis.prototype.setOptions.call(timeAxis2, _options);
        };
        this.components.push(timeAxis2);
      }
    }
    else {
      if (this.timeAxis2) {
        var index = this.components.indexOf(this.timeAxis2);
        if (index !== -1) {
          this.components.splice(index, 1);
        }
        this.timeAxis2.destroy();
        this.timeAxis2 = null;
      }
    }

    // if the graph2d's drawPoints is a function delegate the callback to the onRender property
    if (typeof options.drawPoints == 'function') {
      options.drawPoints = {
          onRender: options.drawPoints
      };
    }

    if ('hiddenDates' in this.options) {
      DateUtil.convertHiddenOptions(this.options.moment, this.body, this.options.hiddenDates);
    }

    if ('clickToUse' in options) {
      if (options.clickToUse) {
        if (!this.activator) {
          this.activator = new Activator(this.dom.root);
        }
      }
      else {
        if (this.activator) {
          this.activator.destroy();
          delete this.activator;
        }
      }
    }

    if ('showCustomTime' in options) {
      throw new Error('Option `showCustomTime` is deprecated. Create a custom time bar via timeline.addCustomTime(time [, id])');
    }

    // enable/disable autoResize
    this._initAutoResize();
  }

  // propagate options to all components
  this.components.forEach(component => component.setOptions(options));

  // enable/disable configure
  if ('configure' in options) {
    if (!this.configurator) {
      this.configurator = this._createConfigurator();
    }

    this.configurator.setOptions(options.configure);

    // collect the settings of all components, and pass them to the configuration system
    var appliedOptions = util.deepExtend({}, this.options);
    this.components.forEach(function (component) {
      util.deepExtend(appliedOptions, component.options);
    });
    this.configurator.setModuleOptions({global: appliedOptions});
  }

  this._redraw();
};

/**
 * Returns true when the Timeline is active.
 * @returns {boolean}
 */
Core.prototype.isActive = function () {
  return !this.activator || this.activator.active;
};

/**
 * Destroy the Core, clean up all DOM elements and event listeners.
 */
Core.prototype.destroy = function () {
  // unbind datasets
  this.setItems(null);
  this.setGroups(null);

  // remove all event listeners
  this.off();

  // stop checking for changed size
  this._stopAutoResize();

  // remove from DOM
  if (this.dom.root.parentNode) {
    this.dom.root.parentNode.removeChild(this.dom.root);
  }
  this.dom = null;

  // remove Activator
  if (this.activator) {
    this.activator.destroy();
    delete this.activator;
  }

  // cleanup hammer touch events
  for (var event in this.listeners) {
    if (this.listeners.hasOwnProperty(event)) {
      delete this.listeners[event];
    }
  }
  this.listeners = null;
  this.hammer = null;

  // give all components the opportunity to cleanup
  this.components.forEach(component => component.destroy());

  this.body = null;
};


/**
 * Set a custom time bar
 * @param {Date} time
 * @param {number} [id=undefined] Optional id of the custom time bar to be adjusted.
 */
Core.prototype.setCustomTime = function (time, id) {
  var customTimes = this.customTimes.filter(function (component) {
    return id === component.options.id;
  });

  if (customTimes.length === 0) {
    throw new Error('No custom time bar found with id ' + JSON.stringify(id))
  }

  if (customTimes.length > 0) {
    customTimes[0].setCustomTime(time);
  }
};

/**
 * Retrieve the current custom time.
 * @param {number} [id=undefined]    Id of the custom time bar.
 * @return {Date | undefined} customTime
 */
Core.prototype.getCustomTime = function(id) {
  var customTimes = this.customTimes.filter(function (component) {
    return component.options.id === id;
  });

  if (customTimes.length === 0) {
    throw new Error('No custom time bar found with id ' + JSON.stringify(id))
  }
  return customTimes[0].getCustomTime();
};

/**
 * Set a custom title for the custom time bar.
 * @param {string} [title] Custom title
 * @param {number} [id=undefined]    Id of the custom time bar.
 * @returns {*}
 */
Core.prototype.setCustomTimeTitle = function(title, id) {
  var customTimes = this.customTimes.filter(function (component) {
    return component.options.id === id;
  });

  if (customTimes.length === 0) {
    throw new Error('No custom time bar found with id ' + JSON.stringify(id))
  }
  if (customTimes.length > 0) {
    return customTimes[0].setCustomTitle(title);
  }
};

/**
 * Retrieve meta information from an event.
 * Should be overridden by classes extending Core
 * @param {Event} event
 * @return {Object} An object with related information.
 */
Core.prototype.getEventProperties = function (event) {
  return { event: event };
};

/**
 * Add custom vertical bar
 * @param {Date | string | number} [time]  A Date, unix timestamp, or
 *                                         ISO date string. Time point where
 *                                         the new bar should be placed.
 *                                         If not provided, `new Date()` will
 *                                         be used.
 * @param {number | string} [id=undefined] Id of the new bar. Optional
 * @return {number | string}               Returns the id of the new bar
 */
Core.prototype.addCustomTime = function (time, id) {
  var timestamp = time !== undefined
      ? util.convert(time, 'Date').valueOf()
      : new Date();

  var exists = this.customTimes.some(function (customTime) {
    return customTime.options.id === id;
  });
  if (exists) {
    throw new Error('A custom time with id ' + JSON.stringify(id) + ' already exists');
  }

  var customTime = new CustomTime(this.body, util.extend({}, this.options, {
    time : timestamp,
    id : id
  }));

  this.customTimes.push(customTime);
  this.components.push(customTime);
  this._redraw();

  return id;
};

/**
 * Remove previously added custom bar
 * @param {int} id ID of the custom bar to be removed
 * [at]returns {boolean} True if the bar exists and is removed, false otherwise
 */
Core.prototype.removeCustomTime = function (id) {
  var customTimes = this.customTimes.filter(function (bar) {
    return (bar.options.id === id);
  });

  if (customTimes.length === 0) {
    throw new Error('No custom time bar found with id ' + JSON.stringify(id))
  }

  customTimes.forEach(function (customTime) {
    this.customTimes.splice(this.customTimes.indexOf(customTime), 1);
    this.components.splice(this.components.indexOf(customTime), 1);
    customTime.destroy();
  }.bind(this))
};


/**
 * Get the id's of the currently visible items.
 * @returns {Array} The ids of the visible items
 */
Core.prototype.getVisibleItems = function() {
  return this.itemSet && this.itemSet.getVisibleItems() || [];
};

/**
 * Set Core window such that it fits all items
 * @param {Object} [options]  Available options:
 *                                `animation: boolean | {duration: number, easingFunction: string}`
 *                                    If true (default), the range is animated
 *                                    smoothly to the new window. An object can be
 *                                    provided to specify duration and easing function.
 *                                    Default duration is 500 ms, and default easing
 *                                    function is 'easeInOutQuad'.
 * @param {function} [callback] a callback funtion to be executed at the end of this function
 */
Core.prototype.fit = function(options, callback) {
  var range = this.getDataRange();

  // skip range set if there is no min and max date
  if (range.min === null && range.max === null) {
    return;
  }

  // apply a margin of 1% left and right of the data
  var interval = range.max - range.min;
  var min = new Date(range.min.valueOf() - interval * 0.01);
  var max = new Date(range.max.valueOf() + interval * 0.01);
  var animation = (options && options.animation !== undefined) ? options.animation : true;
  this.range.setRange(min, max, { animation: animation }, callback);
};

/**
 * Calculate the data range of the items start and end dates
 * [at]returns {{min: [Date], max: [Date]}}
 * @protected
 */
Core.prototype.getDataRange = function() {
  // must be implemented by Timeline and Graph2d
  throw new Error('Cannot invoke abstract method getDataRange');
};

/**
 * Set the visible window. Both parameters are optional, you can change only
 * start or only end. Syntax:
 *
 *     TimeLine.setWindow(start, end)
 *     TimeLine.setWindow(start, end, options)
 *     TimeLine.setWindow(range)
 *
 * Where start and end can be a Date, number, or string, and range is an
 * object with properties start and end.
 *
 * @param {Date | number | string | Object} [start] Start date of visible window
 * @param {Date | number | string} [end]            End date of visible window
 * @param {Object} [options]  Available options:
 *                                `animation: boolean | {duration: number, easingFunction: string}`
 *                                    If true (default), the range is animated
 *                                    smoothly to the new window. An object can be
 *                                    provided to specify duration and easing function.
 *                                    Default duration is 500 ms, and default easing
 *                                    function is 'easeInOutQuad'.
 * @param {function} [callback] a callback funtion to be executed at the end of this function
 */
Core.prototype.setWindow = function(start, end, options, callback) {
  if (typeof arguments[2] == "function") {
    callback = arguments[2];
    options = {};
  }
  var animation;
  var range;
  if (arguments.length == 1) {
    range = arguments[0];
    animation = (range.animation !== undefined) ? range.animation : true;
    this.range.setRange(range.start, range.end, { animation: animation });
  }
  else if (arguments.length == 2 && typeof arguments[1] == "function") {
    range = arguments[0];
    callback = arguments[1];
    animation = (range.animation !== undefined) ? range.animation : true;
    this.range.setRange(range.start, range.end, { animation: animation }, callback);
  }
  else {
    animation = (options && options.animation !== undefined) ? options.animation : true;
    this.range.setRange(start, end, { animation: animation }, callback);
  }
};

/**
 * Move the window such that given time is centered on screen.
 * @param {Date | number | string} time
 * @param {Object} [options]  Available options:
 *                                `animation: boolean | {duration: number, easingFunction: string}`
 *                                    If true (default), the range is animated
 *                                    smoothly to the new window. An object can be
 *                                    provided to specify duration and easing function.
 *                                    Default duration is 500 ms, and default easing
 *                                    function is 'easeInOutQuad'.
 * @param {function} [callback] a callback funtion to be executed at the end of this function
 */
Core.prototype.moveTo = function(time, options, callback) {
  if (typeof arguments[1] == "function") {
    callback = arguments[1];
    options = {};
  }
  var interval = this.range.end - this.range.start;
  var t = util.convert(time, 'Date').valueOf();

  var start = t - interval / 2;
  var end = t + interval / 2;
  var animation = (options && options.animation !== undefined) ? options.animation : true;

  this.range.setRange(start, end, { animation: animation }, callback);
};

/**
 * Get the visible window
 * @return {{start: Date, end: Date}}   Visible range
 */
Core.prototype.getWindow = function() {
  var range = this.range.getRange();
  return {
    start: new Date(range.start),
    end: new Date(range.end)
  };
};

/**
 * Zoom in the window such that given time is centered on screen.
 * @param {number} percentage - must be between [0..1]
 * @param {Object} [options]  Available options:
 *                                `animation: boolean | {duration: number, easingFunction: string}`
 *                                    If true (default), the range is animated
 *                                    smoothly to the new window. An object can be
 *                                    provided to specify duration and easing function.
 *                                    Default duration is 500 ms, and default easing
 *                                    function is 'easeInOutQuad'.
 * @param {function} [callback] a callback funtion to be executed at the end of this function
 */
Core.prototype.zoomIn = function(percentage, options, callback) {
  if (!percentage || percentage < 0 || percentage > 1) return;
  if (typeof arguments[1] == "function") {
    callback = arguments[1];
    options = {};
  }
  var range = this.getWindow();
  var start = range.start.valueOf();
  var end = range.end.valueOf();
  var interval = end - start;
  var newInterval = interval / (1 + percentage);
  var distance = (interval - newInterval) / 2;
  var newStart = start + distance;
  var newEnd = end - distance;

  this.setWindow(newStart, newEnd, options, callback);
};

/**
 * Zoom out the window such that given time is centered on screen.
 * @param {number} percentage - must be between [0..1]
 * @param {Object} [options]  Available options:
 *                                `animation: boolean | {duration: number, easingFunction: string}`
 *                                    If true (default), the range is animated
 *                                    smoothly to the new window. An object can be
 *                                    provided to specify duration and easing function.
 *                                    Default duration is 500 ms, and default easing
 *                                    function is 'easeInOutQuad'.
 * @param {function} [callback] a callback funtion to be executed at the end of this function
 */
Core.prototype.zoomOut = function(percentage, options, callback) {
  if (!percentage || percentage < 0 || percentage > 1) return
  if (typeof arguments[1] == "function") {
    callback = arguments[1];
    options = {};
  }
  var range = this.getWindow();
  var start = range.start.valueOf();
  var end = range.end.valueOf();
  var interval = end - start;
  var newStart = start - interval * percentage / 2;
  var newEnd = end + interval * percentage / 2;

  this.setWindow(newStart, newEnd, options, callback);
};

/**
 * Force a redraw. Can be overridden by implementations of Core
 *
 * Note: this function will be overridden on construction with a trottled version
 */
Core.prototype.redraw = function() {
  this._redraw();
};

/**
 * Redraw for internal use. Redraws all components. See also the public
 * method redraw.
 * @protected
 */
Core.prototype._redraw = function() {
  this.redrawCount++;
  var resized = false;
  var options = this.options;
  var props = this.props;
  var dom = this.dom;

  if (!dom || !dom.container || dom.root.offsetWidth == 0) return; // when destroyed, or invisible

  DateUtil.updateHiddenDates(this.options.moment, this.body, this.options.hiddenDates);

  // update class names
  if (options.orientation == 'top') {
    util.addClassName(dom.root, 'vis-top');
    util.removeClassName(dom.root, 'vis-bottom');
  }
  else {
    util.removeClassName(dom.root, 'vis-top');
    util.addClassName(dom.root, 'vis-bottom');
  }

  // update root width and height options
  dom.root.style.maxHeight = util.option.asSize(options.maxHeight, '');
  dom.root.style.minHeight = util.option.asSize(options.minHeight, '');
  dom.root.style.width = util.option.asSize(options.width, '');

  // calculate border widths
  props.border.left   = (dom.centerContainer.offsetWidth - dom.centerContainer.clientWidth) / 2;
  props.border.right  = props.border.left;
  props.border.top    = (dom.centerContainer.offsetHeight - dom.centerContainer.clientHeight) / 2;
  props.border.bottom = props.border.top;
  props.borderRootHeight= dom.root.offsetHeight - dom.root.clientHeight;
  props.borderRootWidth = dom.root.offsetWidth - dom.root.clientWidth;

  // workaround for a bug in IE: the clientWidth of an element with
  // a height:0px and overflow:hidden is not calculated and always has value 0
  if (dom.centerContainer.clientHeight === 0) {
    props.border.left = props.border.top;
    props.border.right  = props.border.left;
  }
  if (dom.root.clientHeight === 0) {
    props.borderRootWidth = props.borderRootHeight;
  }

  // calculate the heights. If any of the side panels is empty, we set the height to
  // minus the border width, such that the border will be invisible
  props.center.height = dom.center.offsetHeight;
  props.left.height   = dom.left.offsetHeight;
  props.right.height  = dom.right.offsetHeight;
  props.top.height    = dom.top.clientHeight    || -props.border.top;
  props.bottom.height = dom.bottom.clientHeight || -props.border.bottom;

  // TODO: compensate borders when any of the panels is empty.

  // apply auto height
  // TODO: only calculate autoHeight when needed (else we cause an extra reflow/repaint of the DOM)
  var contentHeight = Math.max(props.left.height, props.center.height, props.right.height);
  var autoHeight = props.top.height + contentHeight + props.bottom.height +
    props.borderRootHeight + props.border.top + props.border.bottom;
  dom.root.style.height = util.option.asSize(options.height, autoHeight + 'px');

  // calculate heights of the content panels
  props.root.height = dom.root.offsetHeight;
  props.background.height = props.root.height - props.borderRootHeight;
  var containerHeight = props.root.height - props.top.height - props.bottom.height -
    props.borderRootHeight;
  props.centerContainer.height  = containerHeight;
  props.leftContainer.height    = containerHeight;
  props.rightContainer.height   = props.leftContainer.height;

  // calculate the widths of the panels
  props.root.width = dom.root.offsetWidth;
  props.background.width = props.root.width - props.borderRootWidth;

  if (!this.initialDrawDone) {
    props.scrollbarWidth = util.getScrollBarWidth();
  }

  if (options.verticalScroll) {
    if (options.rtl) {
      props.left.width = dom.leftContainer.clientWidth || -props.border.left;
      props.right.width = dom.rightContainer.clientWidth + props.scrollbarWidth || -props.border.right;
    } else {
      props.left.width = dom.leftContainer.clientWidth + props.scrollbarWidth || -props.border.left;
      props.right.width = dom.rightContainer.clientWidth || -props.border.right;
    }
  } else {
    props.left.width = dom.leftContainer.clientWidth  || -props.border.left;
    props.right.width = dom.rightContainer.clientWidth || -props.border.right;
  }

  this._setDOM();

  // update the scrollTop, feasible range for the offset can be changed
  // when the height of the Core or of the contents of the center changed
  var offset = this._updateScrollTop();

  // reposition the scrollable contents
  if (options.orientation.item != 'top') {
    offset += Math.max(props.centerContainer.height - props.center.height -
      props.border.top - props.border.bottom, 0);
  }
  dom.center.style.top  = offset + 'px';
  
  // show shadows when vertical scrolling is available
  var visibilityTop = props.scrollTop == 0 ? 'hidden' : '';
  var visibilityBottom = props.scrollTop == props.scrollTopMin ? 'hidden' : '';
  dom.shadowTop.style.visibility          = visibilityTop;
  dom.shadowBottom.style.visibility       = visibilityBottom;
  dom.shadowTopLeft.style.visibility      = visibilityTop;
  dom.shadowBottomLeft.style.visibility   = visibilityBottom;
  dom.shadowTopRight.style.visibility     = visibilityTop;
  dom.shadowBottomRight.style.visibility  = visibilityBottom;

  if (options.verticalScroll) {
    dom.rightContainer.className = 'vis-panel vis-right vis-vertical-scroll';
    dom.leftContainer.className = 'vis-panel vis-left vis-vertical-scroll';

    dom.shadowTopRight.style.visibility     = "hidden";
    dom.shadowBottomRight.style.visibility  = "hidden";
    dom.shadowTopLeft.style.visibility      = "hidden";
    dom.shadowBottomLeft.style.visibility   = "hidden";

    dom.left.style.top    = '0px';
    dom.right.style.top   = '0px';
  }

  if (!options.verticalScroll ||  props.center.height < props.centerContainer.height) {
    dom.left.style.top    = offset + 'px';
    dom.right.style.top   = offset + 'px';
    dom.rightContainer.className = dom.rightContainer.className.replace(new RegExp('(?:^|\\s)'+ 'vis-vertical-scroll' + '(?:\\s|$)'), ' ');
    dom.leftContainer.className = dom.leftContainer.className.replace(new RegExp('(?:^|\\s)'+ 'vis-vertical-scroll' + '(?:\\s|$)'), ' ');
    props.left.width = dom.leftContainer.clientWidth  || -props.border.left;
    props.right.width = dom.rightContainer.clientWidth || -props.border.right;
    this._setDOM();
  }

  // enable/disable vertical panning
  var contentsOverflow = props.center.height > props.centerContainer.height;
  this.hammer.get('pan').set({
    direction: contentsOverflow ? Hammer.DIRECTION_ALL : Hammer.DIRECTION_HORIZONTAL
  });

  // redraw all components
  this.components.forEach(function (component) {
    resized = component.redraw() || resized;
  });
  var MAX_REDRAW = 5;
  if (resized) {
    if (this.redrawCount < MAX_REDRAW) {
      this.body.emitter.emit('_change');
      return;
    }
    else {
      console.log('WARNING: infinite loop in redraw?');
    }
  } else {
    this.redrawCount = 0;
  }

  //Emit public 'changed' event for UI updates, see issue #1592
  this.body.emitter.emit("changed");
};

Core.prototype._setDOM = function () {
  var props = this.props;
  var dom = this.dom;

  props.leftContainer.width = props.left.width;
  props.rightContainer.width = props.right.width;
  var centerWidth = props.root.width - props.left.width - props.right.width - props.borderRootWidth;
  props.center.width          = centerWidth;
  props.centerContainer.width = centerWidth;
  props.top.width             = centerWidth;
  props.bottom.width          = centerWidth;

  // resize the panels
  dom.background.style.height           = props.background.height + 'px';
  dom.backgroundVertical.style.height   = props.background.height + 'px';
  dom.backgroundHorizontal.style.height = props.centerContainer.height + 'px';
  dom.centerContainer.style.height      = props.centerContainer.height + 'px';
  dom.leftContainer.style.height        = props.leftContainer.height + 'px';
  dom.rightContainer.style.height       = props.rightContainer.height + 'px';

  dom.background.style.width            = props.background.width + 'px';
  dom.backgroundVertical.style.width    = props.centerContainer.width + 'px';
  dom.backgroundHorizontal.style.width  = props.background.width + 'px';
  dom.centerContainer.style.width       = props.center.width + 'px';
  dom.top.style.width                   = props.top.width + 'px';
  dom.bottom.style.width                = props.bottom.width + 'px';

  // reposition the panels
  dom.background.style.left           = '0';
  dom.background.style.top            = '0';
  dom.backgroundVertical.style.left   = (props.left.width + props.border.left) + 'px';
  dom.backgroundVertical.style.top    = '0';
  dom.backgroundHorizontal.style.left = '0';
  dom.backgroundHorizontal.style.top  = props.top.height + 'px';
  dom.centerContainer.style.left      = props.left.width + 'px';
  dom.centerContainer.style.top       = props.top.height + 'px';
  dom.leftContainer.style.left        = '0';
  dom.leftContainer.style.top         = props.top.height + 'px';
  dom.rightContainer.style.left       = (props.left.width + props.center.width) + 'px';
  dom.rightContainer.style.top        = props.top.height + 'px';
  dom.top.style.left                  = props.left.width + 'px';
  dom.top.style.top                   = '0';
  dom.bottom.style.left               = props.left.width + 'px';
  dom.bottom.style.top                = (props.top.height + props.centerContainer.height) + 'px';
  dom.center.style.left               = '0';
  dom.left.style.left                 = '0';
  dom.right.style.left                = '0';
};

// TODO: deprecated since version 1.1.0, remove some day
Core.prototype.repaint = function () {
  throw new Error('Function repaint is deprecated. Use redraw instead.');
};

/**
 * Set a current time. This can be used for example to ensure that a client's
 * time is synchronized with a shared server time.
 * Only applicable when option `showCurrentTime` is true.
 * @param {Date | string | number} time     A Date, unix timestamp, or
 *                                          ISO date string.
 */
Core.prototype.setCurrentTime = function(time) {
  if (!this.currentTime) {
    throw new Error('Option showCurrentTime must be true');
  }

  this.currentTime.setCurrentTime(time);
};

/**
 * Get the current time.
 * Only applicable when option `showCurrentTime` is true.
 * @return {Date} Returns the current time.
 */
Core.prototype.getCurrentTime = function() {
  if (!this.currentTime) {
    throw new Error('Option showCurrentTime must be true');
  }

  return this.currentTime.getCurrentTime();
};

/**
 * Convert a position on screen (pixels) to a datetime
 * @param {int}     x    Position on the screen in pixels
 * @return {Date}   time The datetime the corresponds with given position x
 * @protected
 */
// TODO: move this function to Range
Core.prototype._toTime = function(x) {
  return DateUtil.toTime(this, x, this.props.center.width);
};

/**
 * Convert a position on the global screen (pixels) to a datetime
 * @param {int}     x    Position on the screen in pixels
 * @return {Date}   time The datetime the corresponds with given position x
 * @protected
 */
// TODO: move this function to Range
Core.prototype._toGlobalTime = function(x) {
  return DateUtil.toTime(this, x, this.props.root.width);
  //var conversion = this.range.conversion(this.props.root.width);
  //return new Date(x / conversion.scale + conversion.offset);
};

/**
 * Convert a datetime (Date object) into a position on the screen
 * @param {Date}   time A date
 * @return {int}   x    The position on the screen in pixels which corresponds
 *                      with the given date.
 * @protected
 */
// TODO: move this function to Range
Core.prototype._toScreen = function(time) {
  return DateUtil.toScreen(this, time, this.props.center.width);
};



/**
 * Convert a datetime (Date object) into a position on the root
 * This is used to get the pixel density estimate for the screen, not the center panel
 * @param {Date}   time A date
 * @return {int}   x    The position on root in pixels which corresponds
 *                      with the given date.
 * @protected
 */
// TODO: move this function to Range
Core.prototype._toGlobalScreen = function(time) {
  return DateUtil.toScreen(this, time, this.props.root.width);
  //var conversion = this.range.conversion(this.props.root.width);
  //return (time.valueOf() - conversion.offset) * conversion.scale;
};


/**
 * Initialize watching when option autoResize is true
 * @private
 */
Core.prototype._initAutoResize = function () {
  if (this.options.autoResize == true) {
    this._startAutoResize();
  }
  else {
    this._stopAutoResize();
  }
};

/**
 * Watch for changes in the size of the container. On resize, the Panel will
 * automatically redraw itself.
 * @private
 */
Core.prototype._startAutoResize = function () {
  var me = this;

  this._stopAutoResize();

  this._onResize = function() {
    if (me.options.autoResize != true) {
      // stop watching when the option autoResize is changed to false
      me._stopAutoResize();
      return;
    }

    if (me.dom.root) {
      // check whether the frame is resized
      // Note: we compare offsetWidth here, not clientWidth. For some reason,
      // IE does not restore the clientWidth from 0 to the actual width after
      // changing the timeline's container display style from none to visible
      if ((me.dom.root.offsetWidth != me.props.lastWidth) ||
        (me.dom.root.offsetHeight != me.props.lastHeight)) {
        me.props.lastWidth = me.dom.root.offsetWidth;
        me.props.lastHeight = me.dom.root.offsetHeight;
        me.props.scrollbarWidth = util.getScrollBarWidth();

        me.body.emitter.emit('_change');
      }
    }
  };

  // add event listener to window resize
  util.addEventListener(window, 'resize', this._onResize);

  //Prevent initial unnecessary redraw
  if (me.dom.root) {
      me.props.lastWidth = me.dom.root.offsetWidth;
      me.props.lastHeight = me.dom.root.offsetHeight;
  }

  this.watchTimer = setInterval(this._onResize, 1000);
};

/**
 * Stop watching for a resize of the frame.
 * @private
 */
Core.prototype._stopAutoResize = function () {
  if (this.watchTimer) {
    clearInterval(this.watchTimer);
    this.watchTimer = undefined;
  }

  // remove event listener on window.resize
  if (this._onResize) {
    util.removeEventListener(window, 'resize', this._onResize);
    this._onResize = null;
  }
};

/**
 * Start moving the timeline vertically
 * @param {Event} event
 * @private
 */
Core.prototype._onTouch = function (event) {  // eslint-disable-line no-unused-vars
  this.touch.allowDragging = true;
  this.touch.initialScrollTop = this.props.scrollTop;
};

/**
 * Start moving the timeline vertically
 * @param {Event} event
 * @private
 */
Core.prototype._onPinch = function (event) {  // eslint-disable-line no-unused-vars
  this.touch.allowDragging = false;
};

/**
 * Move the timeline vertically
 * @param {Event} event
 * @private
 */
Core.prototype._onDrag = function (event) {
  if (!event) return
  // refuse to drag when we where pinching to prevent the timeline make a jump
  // when releasing the fingers in opposite order from the touch screen
  if (!this.touch.allowDragging) return;

  var delta = event.deltaY;

  var oldScrollTop = this._getScrollTop();
  var newScrollTop = this._setScrollTop(this.touch.initialScrollTop + delta);

  if (this.options.verticalScroll) {
    this.dom.left.parentNode.scrollTop = -this.props.scrollTop;
    this.dom.right.parentNode.scrollTop = -this.props.scrollTop;
  }

  if (newScrollTop != oldScrollTop) {
    this.emit("verticalDrag");
  }
};

/**
 * Apply a scrollTop
 * @param {number} scrollTop
 * @returns {number} scrollTop  Returns the applied scrollTop
 * @private
 */
Core.prototype._setScrollTop = function (scrollTop) {
  this.props.scrollTop = scrollTop;
  this._updateScrollTop();
  return this.props.scrollTop;
};

/**
 * Update the current scrollTop when the height of  the containers has been changed
 * @returns {number} scrollTop  Returns the applied scrollTop
 * @private
 */
Core.prototype._updateScrollTop = function () {
  // recalculate the scrollTopMin
  var scrollTopMin = Math.min(this.props.centerContainer.height - this.props.center.height, 0); // is negative or zero
  if (scrollTopMin != this.props.scrollTopMin) {
    // in case of bottom orientation, change the scrollTop such that the contents
    // do not move relative to the time axis at the bottom
    if (this.options.orientation.item != 'top') {
      this.props.scrollTop += (scrollTopMin - this.props.scrollTopMin);
    }
    this.props.scrollTopMin = scrollTopMin;
  }

  // limit the scrollTop to the feasible scroll range
  if (this.props.scrollTop > 0) this.props.scrollTop = 0;
  if (this.props.scrollTop < scrollTopMin) this.props.scrollTop = scrollTopMin;

  if (this.options.verticalScroll) {
    this.dom.left.parentNode.scrollTop = -this.props.scrollTop;
    this.dom.right.parentNode.scrollTop = -this.props.scrollTop;
  }

  return this.props.scrollTop;
};

/**
 * Get the current scrollTop
 * @returns {number} scrollTop
 * @private
 */
Core.prototype._getScrollTop = function () {
  return this.props.scrollTop;
};

/**
 * Load a configurator
 * [at]returns {Object}
 * @private
 */
Core.prototype._createConfigurator = function () {
  throw new Error('Cannot invoke abstract method _createConfigurator');
};

module.exports = Core;
