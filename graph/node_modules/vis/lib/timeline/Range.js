var util = require('../util');
var moment = require('../module/moment');
var Component = require('./component/Component');
var DateUtil = require('./DateUtil');

/**
 * A Range controls a numeric range with a start and end value.
 * The Range adjusts the range based on mouse events or programmatic changes,
 * and triggers events when the range is changing or has been changed.
 * @param {{dom: Object, domProps: Object, emitter: Emitter}} body
 * @param {Object} [options]    See description at Range.setOptions
 * @constructor Range
 * @extends Component
 */
function Range(body, options) {
  var now = moment().hours(0).minutes(0).seconds(0).milliseconds(0);
  var start = now.clone().add(-3, 'days').valueOf();
  var end = now.clone().add(3, 'days').valueOf(); 
  this.millisecondsPerPixelCache = undefined;
  
  if(options === undefined) {
    this.start = start;
    this.end = end;
  } else {
    this.start = options.start || start;
    this.end = options.end || end
  }

  this.rolling = false;

  this.body = body;
  this.deltaDifference = 0;
  this.scaleOffset = 0;
  this.startToFront = false;
  this.endToFront = true;

  // default options
  this.defaultOptions = {
    rtl: false,
    start: null,
    end: null,
    moment: moment,
    direction: 'horizontal', // 'horizontal' or 'vertical'
    moveable: true,
    zoomable: true,
    min: null,
    max: null,
    zoomMin: 10,                                // milliseconds
    zoomMax: 1000 * 60 * 60 * 24 * 365 * 10000,  // milliseconds
    rollingMode: {
      follow: false,
      offset: 0.5
    }
  };
  this.options = util.extend({}, this.defaultOptions);
  this.props = {
    touch: {}
  };
  this.animationTimer = null;

  // drag listeners for dragging
  this.body.emitter.on('panstart', this._onDragStart.bind(this));
  this.body.emitter.on('panmove',  this._onDrag.bind(this));
  this.body.emitter.on('panend',   this._onDragEnd.bind(this));

  // mouse wheel for zooming
  this.body.emitter.on('mousewheel', this._onMouseWheel.bind(this));

  // pinch to zoom
  this.body.emitter.on('touch', this._onTouch.bind(this));
  this.body.emitter.on('pinch', this._onPinch.bind(this));

  // on click of rolling mode button
  this.body.dom.rollingModeBtn.addEventListener('click', this.startRolling.bind(this));

  this.setOptions(options);
}

Range.prototype = new Component();

/**
 * Set options for the range controller
 * @param {Object} options      Available options:
 *                              {number | Date | String} start  Start date for the range
 *                              {number | Date | String} end    End date for the range
 *                              {number} min    Minimum value for start
 *                              {number} max    Maximum value for end
 *                              {number} zoomMin    Set a minimum value for
 *                                                  (end - start).
 *                              {number} zoomMax    Set a maximum value for
 *                                                  (end - start).
 *                              {boolean} moveable Enable moving of the range
 *                                                 by dragging. True by default
 *                              {boolean} zoomable Enable zooming of the range
 *                                                 by pinching/scrolling. True by default
 */
Range.prototype.setOptions = function (options) {
  if (options) {
    // copy the options that we know
    var fields = [
      'animation', 'direction', 'min', 'max', 'zoomMin', 'zoomMax', 'moveable', 'zoomable',
      'moment', 'activate', 'hiddenDates', 'zoomKey', 'rtl', 'showCurrentTime', 'rollingMode', 'horizontalScroll'
    ];
    util.selectiveExtend(fields, this.options, options);

    if (options.rollingMode && options.rollingMode.follow) {
      this.startRolling();
    }
    if ('start' in options || 'end' in options) {
      // apply a new range. both start and end are optional
      this.setRange(options.start, options.end);
    }
  }
};

/**
 * Test whether direction has a valid value
 * @param {string} direction    'horizontal' or 'vertical'
 */
function validateDirection (direction) {
  if (direction != 'horizontal' && direction != 'vertical') {
    throw new TypeError('Unknown direction "' + direction + '". ' +
        'Choose "horizontal" or "vertical".');
  }
}

/**
 * Start auto refreshing the current time bar
 */
Range.prototype.startRolling = function() {
  var me = this;

  /**
   *  Updates the current time.
   */
  function update () {
    me.stopRolling();
    me.rolling = true;


    var interval = me.end - me.start;
    var t = util.convert(new Date(), 'Date').valueOf();

    var start = t - interval * (me.options.rollingMode.offset);
    var end = t + interval * (1 - me.options.rollingMode.offset);

    var options = {
      animation: false
    };
    me.setRange(start, end, options);

    // determine interval to refresh
    var scale = me.conversion(me.body.domProps.center.width).scale;
    interval = 1 / scale / 10;
    if (interval < 30)   interval = 30;
    if (interval > 1000) interval = 1000;

    me.body.dom.rollingModeBtn.style.visibility = "hidden";
    // start a renderTimer to adjust for the new time
    me.currentTimeTimer = setTimeout(update, interval);
  }

  update();
};

/**
 * Stop auto refreshing the current time bar
 */
Range.prototype.stopRolling = function() {
  if (this.currentTimeTimer !== undefined) {
    clearTimeout(this.currentTimeTimer);
    this.rolling = false;
    this.body.dom.rollingModeBtn.style.visibility = "visible";
  }
};

/**
 * Set a new start and end range
 * @param {Date | number | string} [start]
 * @param {Date | number | string} [end]
 * @param {Object} options      Available options:
 *                              {boolean | {duration: number, easingFunction: string}} [animation=false]
 *                                    If true, the range is animated
 *                                    smoothly to the new window. An object can be
 *                                    provided to specify duration and easing function.
 *                                    Default duration is 500 ms, and default easing
 *                                    function is 'easeInOutQuad'.
 *                              {boolean} [byUser=false]
 *                              {Event}  event  Mouse event
 * @param {Function} callback     a callback function to be executed at the end of this function  
 * @param {Function} frameCallback    a callback function executed each frame of the range animation.
 *                                    The callback will be passed three parameters:
 *                                    {number} easeCoefficient    an easing coefficent
 *                                    {boolean} willDraw          If true the caller will redraw after the callback completes
 *                                    {boolean} done              If true then animation is ending after the current frame
 */

Range.prototype.setRange = function(start, end, options, callback, frameCallback) {
  if (!options) {
    options = {};
  }
  if (options.byUser !== true) {
    options.byUser = false;
  }
  var me = this;
  var finalStart = start != undefined ? util.convert(start, 'Date').valueOf() : null;
  var finalEnd   = end != undefined   ? util.convert(end, 'Date').valueOf()   : null;
  this._cancelAnimation();
  this.millisecondsPerPixelCache = undefined;

  if (options.animation) { // true or an Object
    var initStart = this.start;
    var initEnd = this.end;
    var duration = (typeof options.animation === 'object' && 'duration' in options.animation) ? options.animation.duration : 500;
    var easingName = (typeof options.animation === 'object' && 'easingFunction' in options.animation) ? options.animation.easingFunction : 'easeInOutQuad';
    var easingFunction = util.easingFunctions[easingName];
    if (!easingFunction) {
      throw new Error('Unknown easing function ' + JSON.stringify(easingName) + '. ' +
          'Choose from: ' + Object.keys(util.easingFunctions).join(', '));
    }

    var initTime = new Date().valueOf();
    var anyChanged = false;

    var next = function () {
      if (!me.props.touch.dragging) {
        var now = new Date().valueOf();
        var time = now - initTime;
        var ease = easingFunction(time / duration);
        var done = time > duration;
        var s = (done || finalStart === null) ? finalStart : initStart + (finalStart - initStart) * ease;
        var e = (done || finalEnd   === null) ? finalEnd   : initEnd   + (finalEnd   - initEnd)   * ease;

        changed = me._applyRange(s, e);
        DateUtil.updateHiddenDates(me.options.moment, me.body, me.options.hiddenDates);
        anyChanged = anyChanged || changed;

        var params = {
          start: new Date(me.start), 
          end: new Date(me.end), 
          byUser: options.byUser,
          event: options.event
        };

        if (frameCallback) { frameCallback(ease, changed, done); }

        if (changed) {          
          me.body.emitter.emit('rangechange', params);
        }

        if (done) {
          if (anyChanged) {
            me.body.emitter.emit('rangechanged', params);
            if (callback) { return callback() }
          }
        }
        else {
          // animate with as high as possible frame rate, leave 20 ms in between
          // each to prevent the browser from blocking
          me.animationTimer = setTimeout(next, 20);
        }
      }
    };

    return next();
  }
  else {
    var changed = this._applyRange(finalStart, finalEnd);
    DateUtil.updateHiddenDates(this.options.moment, this.body, this.options.hiddenDates);
    if (changed) {
      var params = {
        start: new Date(this.start), 
        end: new Date(this.end), 
        byUser: options.byUser, 
        event: options.event
      };

      this.body.emitter.emit('rangechange', params);
      clearTimeout( me.timeoutID );
      me.timeoutID = setTimeout( function () {
        me.body.emitter.emit('rangechanged', params);
      }, 200 );
      if (callback) { return callback() }
    }
  }
};

/**
 * Get the number of milliseconds per pixel.
 *
 * @returns {undefined|number}
 */
Range.prototype.getMillisecondsPerPixel = function() {
  if (this.millisecondsPerPixelCache === undefined) {
    this.millisecondsPerPixelCache = (this.end - this.start) / this.body.dom.center.clientWidth;
  }
  return this.millisecondsPerPixelCache;
};

/**
 * Stop an animation
 * @private
 */
Range.prototype._cancelAnimation = function () {
  if (this.animationTimer) {
    clearTimeout(this.animationTimer);
    this.animationTimer = null;
  }
};

/**
 * Set a new start and end range. This method is the same as setRange, but
 * does not trigger a range change and range changed event, and it returns
 * true when the range is changed
 * @param {number} [start]
 * @param {number} [end]
 * @return {boolean} changed
 * @private
 */
Range.prototype._applyRange = function(start, end) {
  var newStart = (start != null) ? util.convert(start, 'Date').valueOf() : this.start,
      newEnd   = (end != null)   ? util.convert(end, 'Date').valueOf()   : this.end,
      max = (this.options.max != null) ? util.convert(this.options.max, 'Date').valueOf() : null,
      min = (this.options.min != null) ? util.convert(this.options.min, 'Date').valueOf() : null,
      diff;

  // check for valid number
  if (isNaN(newStart) || newStart === null) {
    throw new Error('Invalid start "' + start + '"');
  }
  if (isNaN(newEnd) || newEnd === null) {
    throw new Error('Invalid end "' + end + '"');
  }

  // prevent end < start
  if (newEnd < newStart) {
    newEnd = newStart;
  }

  // prevent start < min
  if (min !== null) {
    if (newStart < min) {
      diff = (min - newStart);
      newStart += diff;
      newEnd += diff;

      // prevent end > max
      if (max != null) {
        if (newEnd > max) {
          newEnd = max;
        }
      }
    }
  }

  // prevent end > max
  if (max !== null) {
    if (newEnd > max) {
      diff = (newEnd - max);
      newStart -= diff;
      newEnd -= diff;

      // prevent start < min
      if (min != null) {
        if (newStart < min) {
          newStart = min;
        }
      }
    }
  }

  // prevent (end-start) < zoomMin
  if (this.options.zoomMin !== null) {
    var zoomMin = parseFloat(this.options.zoomMin);
    if (zoomMin < 0) {
      zoomMin = 0;
    }
    if ((newEnd - newStart) < zoomMin) {
      // compensate for a scale of 0.5 ms
      var compensation = 0.5;
      if ((this.end - this.start) === zoomMin && newStart >= this.start - compensation && newEnd <= this.end) {
        // ignore this action, we are already zoomed to the minimum
        newStart = this.start;
        newEnd = this.end;
      }
      else {
        // zoom to the minimum
        diff = (zoomMin - (newEnd - newStart));
        newStart -= diff / 2;
        newEnd += diff / 2;
      }
    }
  }

  // prevent (end-start) > zoomMax
  if (this.options.zoomMax !== null) {
    var zoomMax = parseFloat(this.options.zoomMax);
    if (zoomMax < 0) {
      zoomMax = 0;
    }

    if ((newEnd - newStart) > zoomMax) {
      if ((this.end - this.start) === zoomMax && newStart < this.start && newEnd > this.end) {
        // ignore this action, we are already zoomed to the maximum
        newStart = this.start;
        newEnd = this.end;
      }
      else {
        // zoom to the maximum
        diff = ((newEnd - newStart) - zoomMax);
        newStart += diff / 2;
        newEnd -= diff / 2;
      }
    }
  }

  var changed = (this.start != newStart || this.end != newEnd);

  // if the new range does NOT overlap with the old range, emit checkRangedItems to avoid not showing ranged items (ranged meaning has end time, not necessarily of type Range)
  if (!((newStart >= this.start && newStart   <= this.end) || (newEnd   >= this.start && newEnd   <= this.end)) &&
      !((this.start >= newStart && this.start <= newEnd)   || (this.end >= newStart   && this.end <= newEnd) )) {
    this.body.emitter.emit('checkRangedItems');
  }

  this.start = newStart;
  this.end = newEnd;
  return changed;
};

/**
 * Retrieve the current range.
 * @return {Object} An object with start and end properties
 */
Range.prototype.getRange = function() {
  return {
    start: this.start,
    end: this.end
  };
};

/**
 * Calculate the conversion offset and scale for current range, based on
 * the provided width
 * @param {number} width
 * @param {number} [totalHidden=0]
 * @returns {{offset: number, scale: number}} conversion
 */
Range.prototype.conversion = function (width, totalHidden) {
  return Range.conversion(this.start, this.end, width, totalHidden);
};

/**
 * Static method to calculate the conversion offset and scale for a range,
 * based on the provided start, end, and width
 * @param {number} start
 * @param {number} end
 * @param {number} width
 * @param {number} [totalHidden=0]
 * @returns {{offset: number, scale: number}} conversion
 */
Range.conversion = function (start, end, width, totalHidden) {
  if (totalHidden === undefined) {
    totalHidden = 0;
  }
  if (width != 0 && (end - start != 0)) {
    return {
      offset: start,
      scale: width / (end - start - totalHidden)
    }
  }
  else {
    return {
      offset: 0,
      scale: 1
    };
  }
};

/**
 * Start dragging horizontally or vertically
 * @param {Event} event
 * @private
 */
Range.prototype._onDragStart = function(event) {
  this.deltaDifference = 0;
  this.previousDelta = 0;

  // only allow dragging when configured as movable
  if (!this.options.moveable) return;

  // only start dragging when the mouse is inside the current range
  if (!this._isInsideRange(event)) return;

  // refuse to drag when we where pinching to prevent the timeline make a jump
  // when releasing the fingers in opposite order from the touch screen
  if (!this.props.touch.allowDragging) return;

  this.stopRolling();

  this.props.touch.start = this.start;
  this.props.touch.end = this.end;
  this.props.touch.dragging = true;

  if (this.body.dom.root) {
    this.body.dom.root.style.cursor = 'move';
  }
};

/**
 * Perform dragging operation
 * @param {Event} event
 * @private
 */
Range.prototype._onDrag = function (event) {
  if (!event) return;

  if (!this.props.touch.dragging) return;

  // only allow dragging when configured as movable
  if (!this.options.moveable) return;

  // TODO: this may be redundant in hammerjs2
  // refuse to drag when we where pinching to prevent the timeline make a jump
  // when releasing the fingers in opposite order from the touch screen
  if (!this.props.touch.allowDragging) return;

  var direction = this.options.direction;
  validateDirection(direction);
  var delta = (direction == 'horizontal') ? event.deltaX : event.deltaY;
  delta -= this.deltaDifference;
  var interval = (this.props.touch.end - this.props.touch.start);

  // normalize dragging speed if cutout is in between.
  var duration = DateUtil.getHiddenDurationBetween(this.body.hiddenDates, this.start, this.end);
  interval -= duration;

  var width = (direction == 'horizontal') ? this.body.domProps.center.width : this.body.domProps.center.height;
  var diffRange;
  if (this.options.rtl) {
    diffRange = delta / width * interval;
  } else {
    diffRange = -delta / width * interval;
  }

  var newStart = this.props.touch.start + diffRange;
  var newEnd = this.props.touch.end + diffRange;

  // snapping times away from hidden zones
  var safeStart = DateUtil.snapAwayFromHidden(this.body.hiddenDates, newStart, this.previousDelta-delta, true);
  var safeEnd = DateUtil.snapAwayFromHidden(this.body.hiddenDates, newEnd, this.previousDelta-delta, true);
  if (safeStart != newStart || safeEnd != newEnd) {
    this.deltaDifference += delta;
    this.props.touch.start = safeStart;
    this.props.touch.end = safeEnd;
    this._onDrag(event);
    return;
  }

  this.previousDelta = delta;
  this._applyRange(newStart, newEnd);


  var startDate = new Date(this.start);
  var endDate = new Date(this.end);

  // fire a rangechange event
  this.body.emitter.emit('rangechange', {
    start: startDate,
    end:   endDate,
    byUser: true,
    event: event
  });

  // fire a panmove event
  this.body.emitter.emit('panmove');
};

/**
 * Stop dragging operation
 * @param {event} event
 * @private
 */
Range.prototype._onDragEnd = function (event) {
  if (!this.props.touch.dragging) return;

  // only allow dragging when configured as movable
  if (!this.options.moveable) return;

  // TODO: this may be redundant in hammerjs2
  // refuse to drag when we where pinching to prevent the timeline make a jump
  // when releasing the fingers in opposite order from the touch screen
  if (!this.props.touch.allowDragging) return;

  this.props.touch.dragging = false;
  if (this.body.dom.root) {
    this.body.dom.root.style.cursor = 'auto';
  }

  // fire a rangechanged event
  this.body.emitter.emit('rangechanged', {
    start: new Date(this.start),
    end:   new Date(this.end),
    byUser: true,
    event: event
  });
};

/**
 * Event handler for mouse wheel event, used to zoom
 * Code from http://adomas.org/javascript-mouse-wheel/
 * @param {Event} event
 * @private
 */
Range.prototype._onMouseWheel = function(event) {
  // retrieve delta
  var delta = 0;
  if (event.wheelDelta) { /* IE/Opera. */
    delta = event.wheelDelta / 120;
  } else if (event.detail) { /* Mozilla case. */
    // In Mozilla, sign of delta is different than in IE.
    // Also, delta is multiple of 3.
    delta = -event.detail / 3;
  }

  // don't allow zoom when the according key is pressed and the zoomKey option or not zoomable but movable
  if ((this.options.zoomKey && !event[this.options.zoomKey] && this.options.zoomable) 
    || (!this.options.zoomable && this.options.moveable)) {
    return;
  }

  // only allow zooming when configured as zoomable and moveable
  if (!(this.options.zoomable && this.options.moveable)) return;
  
  // only zoom when the mouse is inside the current range
  if (!this._isInsideRange(event)) return;

  // If delta is nonzero, handle it.
  // Basically, delta is now positive if wheel was scrolled up,
  // and negative, if wheel was scrolled down.
  if (delta) {
    // perform the zoom action. Delta is normally 1 or -1

    // adjust a negative delta such that zooming in with delta 0.1
    // equals zooming out with a delta -0.1
    var scale;
    if (delta < 0) {
      scale = 1 - (delta / 5);
    }
    else {
      scale = 1 / (1 + (delta / 5)) ;
    }

    // calculate center, the date to zoom around
    var pointerDate;
    if (this.rolling) {
      pointerDate = this.start + ((this.end - this.start) * this.options.rollingMode.offset);
    } else {
      var pointer = this.getPointer({x: event.clientX, y: event.clientY}, this.body.dom.center);
      pointerDate = this._pointerToDate(pointer);
    }
    this.zoom(scale, pointerDate, delta, event);

    // Prevent default actions caused by mouse wheel
    // (else the page and timeline both scroll)
    event.preventDefault();
  }
};

/**
 * Start of a touch gesture
 * @param {Event} event
 * @private
 */
Range.prototype._onTouch = function (event) {  // eslint-disable-line no-unused-vars
  this.props.touch.start = this.start;
  this.props.touch.end = this.end;
  this.props.touch.allowDragging = true;
  this.props.touch.center = null;
  this.scaleOffset = 0;
  this.deltaDifference = 0;
  // Disable the browser default handling of this event.
  util.preventDefault(event);
};

/**
 * Handle pinch event
 * @param {Event} event
 * @private
 */
Range.prototype._onPinch = function (event) {
  // only allow zooming when configured as zoomable and moveable
  if (!(this.options.zoomable && this.options.moveable)) return;

  // Disable the browser default handling of this event.
  util.preventDefault(event);

  this.props.touch.allowDragging = false;

  if (!this.props.touch.center) {
    this.props.touch.center = this.getPointer(event.center, this.body.dom.center);
  }

  this.stopRolling();

  var scale = 1 / (event.scale + this.scaleOffset);
  var centerDate = this._pointerToDate(this.props.touch.center);

  var hiddenDuration = DateUtil.getHiddenDurationBetween(this.body.hiddenDates, this.start, this.end);
  var hiddenDurationBefore = DateUtil.getHiddenDurationBefore(this.options.moment, this.body.hiddenDates, this, centerDate);
  var hiddenDurationAfter = hiddenDuration - hiddenDurationBefore;

  // calculate new start and end
  var newStart = (centerDate - hiddenDurationBefore) + (this.props.touch.start - (centerDate - hiddenDurationBefore)) * scale;
  var newEnd = (centerDate + hiddenDurationAfter) + (this.props.touch.end - (centerDate + hiddenDurationAfter)) * scale;

  // snapping times away from hidden zones
  this.startToFront = 1 - scale <= 0; // used to do the right auto correction with periodic hidden times
  this.endToFront = scale - 1 <= 0;   // used to do the right auto correction with periodic hidden times

  var safeStart = DateUtil.snapAwayFromHidden(this.body.hiddenDates, newStart, 1 - scale, true);
  var safeEnd = DateUtil.snapAwayFromHidden(this.body.hiddenDates, newEnd, scale - 1, true);
  if (safeStart != newStart || safeEnd != newEnd) {
    this.props.touch.start = safeStart;
    this.props.touch.end = safeEnd;
    this.scaleOffset = 1 - event.scale;
    newStart = safeStart;
    newEnd = safeEnd;
  }

  var options = {
    animation: false,
    byUser: true,
    event: event
  };
  this.setRange(newStart, newEnd, options);

  this.startToFront = false; // revert to default
  this.endToFront = true; // revert to default
};

/**
 * Test whether the mouse from a mouse event is inside the visible window,
 * between the current start and end date
 * @param {Object} event
 * @return {boolean} Returns true when inside the visible window
 * @private
 */
Range.prototype._isInsideRange = function(event) {
  // calculate the time where the mouse is, check whether inside
  // and no scroll action should happen.
  var clientX = event.center ? event.center.x : event.clientX;
  var x;
  if (this.options.rtl) {
    x = clientX - util.getAbsoluteLeft(this.body.dom.centerContainer);
  } else {
    x = util.getAbsoluteRight(this.body.dom.centerContainer) - clientX;
  }
  var time = this.body.util.toTime(x);

  return time >= this.start && time <= this.end;
};

/**
 * Helper function to calculate the center date for zooming
 * @param {{x: number, y: number}} pointer
 * @return {number} date
 * @private
 */
Range.prototype._pointerToDate = function (pointer) {
  var conversion;
  var direction = this.options.direction;

  validateDirection(direction);

  if (direction == 'horizontal') {
    return this.body.util.toTime(pointer.x).valueOf();
  }
  else {
    var height = this.body.domProps.center.height;
    conversion = this.conversion(height);
    return pointer.y / conversion.scale + conversion.offset;
  }
};

/**
 * Get the pointer location relative to the location of the dom element
 * @param {{x: number, y: number}} touch
 * @param {Element} element   HTML DOM element
 * @return {{x: number, y: number}} pointer
 * @private
 */
Range.prototype.getPointer = function (touch, element) {
  if (this.options.rtl) {
    return {
      x: util.getAbsoluteRight(element) - touch.x,
      y: touch.y - util.getAbsoluteTop(element)
    };
  } else {
    return {
      x: touch.x - util.getAbsoluteLeft(element),
      y: touch.y - util.getAbsoluteTop(element)
    };
  }
};

/**
 * Zoom the range the given scale in or out. Start and end date will
 * be adjusted, and the timeline will be redrawn. You can optionally give a
 * date around which to zoom.
 * For example, try scale = 0.9 or 1.1
 * @param {number} scale      Scaling factor. Values above 1 will zoom out,
 *                            values below 1 will zoom in.
 * @param {number} [center]   Value representing a date around which will
 *                            be zoomed.
 * @param {number} delta
 * @param {Event} event
 */
Range.prototype.zoom = function(scale, center, delta, event) {
  // if centerDate is not provided, take it half between start Date and end Date
  if (center == null) {
    center = (this.start + this.end) / 2;
  }

  var hiddenDuration = DateUtil.getHiddenDurationBetween(this.body.hiddenDates, this.start, this.end);
  var hiddenDurationBefore = DateUtil.getHiddenDurationBefore(this.options.moment, this.body.hiddenDates, this, center);
  var hiddenDurationAfter = hiddenDuration - hiddenDurationBefore;

  // calculate new start and end
  var newStart = (center-hiddenDurationBefore) + (this.start - (center-hiddenDurationBefore)) * scale;
  var newEnd   = (center+hiddenDurationAfter) + (this.end - (center+hiddenDurationAfter)) * scale;

  // snapping times away from hidden zones
  this.startToFront = delta > 0 ? false : true; // used to do the right autocorrection with periodic hidden times
  this.endToFront = -delta  > 0 ? false : true; // used to do the right autocorrection with periodic hidden times
  var safeStart = DateUtil.snapAwayFromHidden(this.body.hiddenDates, newStart, delta, true);
  var safeEnd = DateUtil.snapAwayFromHidden(this.body.hiddenDates, newEnd, -delta, true);
  if (safeStart != newStart || safeEnd != newEnd) {
    newStart = safeStart;
    newEnd = safeEnd;
  }

  var options = {
    animation: false,
    byUser: true,
    event: event
  };
  this.setRange(newStart, newEnd, options);

  this.startToFront = false; // revert to default
  this.endToFront = true; // revert to default
};



/**
 * Move the range with a given delta to the left or right. Start and end
 * value will be adjusted. For example, try delta = 0.1 or -0.1
 * @param {number}  delta     Moving amount. Positive value will move right,
 *                            negative value will move left
 */
Range.prototype.move = function(delta) {
  // zoom start Date and end Date relative to the centerDate
  var diff = (this.end - this.start);

  // apply new values
  var newStart = this.start + diff * delta;
  var newEnd = this.end + diff * delta;

  // TODO: reckon with min and max range

  this.start = newStart;
  this.end = newEnd;
};

/**
 * Move the range to a new center point
 * @param {number} moveTo      New center point of the range
 */
Range.prototype.moveTo = function(moveTo) {
  var center = (this.start + this.end) / 2;

  var diff = center - moveTo;

  // calculate new start and end
  var newStart = this.start - diff;
  var newEnd = this.end - diff;

  var options = {
    animation: false,
    byUser: true,
    event: null
  };
  this.setRange(newStart, newEnd, options);
};

module.exports = Range;
