var util = require('../util');

/**
 * An html slider control with start/stop/prev/next buttons
 *
 * @constructor Slider
 * @param {Element} container  The element where the slider will be created
 * @param {Object} options   Available options:
 *                 {boolean} visible   If true (default) the
 *                           slider is visible.
 */
function Slider(container, options) {
  if (container === undefined) {
    throw new Error('No container element defined');
  }
  this.container = container;
  this.visible = (options && options.visible != undefined) ? options.visible : true;

  if (this.visible) {
    this.frame = document.createElement('DIV');
    //this.frame.style.backgroundColor = '#E5E5E5';
    this.frame.style.width = '100%';
    this.frame.style.position = 'relative';
    this.container.appendChild(this.frame);

    this.frame.prev = document.createElement('INPUT');
    this.frame.prev.type = 'BUTTON';
    this.frame.prev.value = 'Prev';
    this.frame.appendChild(this.frame.prev);

    this.frame.play = document.createElement('INPUT');
    this.frame.play.type = 'BUTTON';
    this.frame.play.value = 'Play';
    this.frame.appendChild(this.frame.play);

    this.frame.next = document.createElement('INPUT');
    this.frame.next.type = 'BUTTON';
    this.frame.next.value = 'Next';
    this.frame.appendChild(this.frame.next);

    this.frame.bar = document.createElement('INPUT');
    this.frame.bar.type = 'BUTTON';
    this.frame.bar.style.position = 'absolute';
    this.frame.bar.style.border = '1px solid red';
    this.frame.bar.style.width = '100px';
    this.frame.bar.style.height = '6px';
    this.frame.bar.style.borderRadius = '2px';
    this.frame.bar.style.MozBorderRadius = '2px';
    this.frame.bar.style.border = '1px solid #7F7F7F';
    this.frame.bar.style.backgroundColor = '#E5E5E5';
    this.frame.appendChild(this.frame.bar);

    this.frame.slide = document.createElement('INPUT');
    this.frame.slide.type = 'BUTTON';
    this.frame.slide.style.margin = '0px';
    this.frame.slide.value = ' ';
    this.frame.slide.style.position = 'relative';
    this.frame.slide.style.left = '-100px';
    this.frame.appendChild(this.frame.slide);

    // create events
    var me = this;
    this.frame.slide.onmousedown = function (event) {me._onMouseDown(event);};
    this.frame.prev.onclick = function (event) {me.prev(event);};
    this.frame.play.onclick = function (event) {me.togglePlay(event);};
    this.frame.next.onclick = function (event) {me.next(event);};
  }

  this.onChangeCallback = undefined;

  this.values = [];
  this.index = undefined;

  this.playTimeout = undefined;
  this.playInterval = 1000; // milliseconds
  this.playLoop = true;
}

/**
 * Select the previous index
 */
Slider.prototype.prev = function() {
  var index = this.getIndex();
  if (index > 0) {
    index--;
    this.setIndex(index);
  }
};

/**
 * Select the next index
 */
Slider.prototype.next = function() {
  var index = this.getIndex();
  if (index < this.values.length - 1) {
    index++;
    this.setIndex(index);
  }
};

/**
 * Select the next index
 */
Slider.prototype.playNext = function() {
  var start = new Date();

  var index = this.getIndex();
  if (index < this.values.length - 1) {
    index++;
    this.setIndex(index);
  }
  else if (this.playLoop) {
    // jump to the start
    index = 0;
    this.setIndex(index);
  }

  var end = new Date();
  var diff = (end - start);

  // calculate how much time it to to set the index and to execute the callback
  // function.
  var interval = Math.max(this.playInterval - diff, 0);
  // document.title = diff // TODO: cleanup

  var me = this;
  this.playTimeout = setTimeout(function() {me.playNext();}, interval);
};

/**
 * Toggle start or stop playing
 */
Slider.prototype.togglePlay = function() {
  if (this.playTimeout === undefined) {
    this.play();
  } else {
    this.stop();
  }
};

/**
 * Start playing
 */
Slider.prototype.play = function() {
  // Test whether already playing
  if (this.playTimeout) return;

  this.playNext();

  if (this.frame) {
    this.frame.play.value = 'Stop';
  }
};

/**
 * Stop playing
 */
Slider.prototype.stop = function() {
  clearInterval(this.playTimeout);
  this.playTimeout = undefined;

  if (this.frame) {
    this.frame.play.value = 'Play';
  }
};

/**
 * Set a callback function which will be triggered when the value of the
 * slider bar has changed.
 *
 * @param {function} callback
 */
Slider.prototype.setOnChangeCallback = function(callback) {
  this.onChangeCallback = callback;
};

/**
 * Set the interval for playing the list
 * @param {number} interval   The interval in milliseconds
 */
Slider.prototype.setPlayInterval = function(interval) {
  this.playInterval = interval;
};

/**
 * Retrieve the current play interval
 * @return {number} interval   The interval in milliseconds
 */
Slider.prototype.getPlayInterval = function() {
  return this.playInterval;
};

/**
 * Set looping on or off
 * @param {boolean} doLoop  If true, the slider will jump to the start when
 *               the end is passed, and will jump to the end
 *               when the start is passed.
 *
 */
Slider.prototype.setPlayLoop = function(doLoop) {
  this.playLoop = doLoop;
};


/**
 * Execute the onchange callback function
 */
Slider.prototype.onChange = function() {
  if (this.onChangeCallback !== undefined) {
    this.onChangeCallback();
  }
};

/**
 * redraw the slider on the correct place
 */
Slider.prototype.redraw = function() {
  if (this.frame) {
    // resize the bar
    this.frame.bar.style.top = (this.frame.clientHeight/2 -
        this.frame.bar.offsetHeight/2) + 'px';
    this.frame.bar.style.width = (this.frame.clientWidth -
        this.frame.prev.clientWidth -
        this.frame.play.clientWidth -
        this.frame.next.clientWidth - 30)  + 'px';

    // position the slider button
    var left = this.indexToLeft(this.index);
    this.frame.slide.style.left = (left) + 'px';
  }
};


/**
 * Set the list with values for the slider
 * @param {Array} values   A javascript array with values (any type)
 */
Slider.prototype.setValues = function(values) {
  this.values = values;

  if (this.values.length > 0)
    this.setIndex(0);
  else
    this.index = undefined;
};

/**
 * Select a value by its index
 * @param {number} index
 */
Slider.prototype.setIndex = function(index) {
  if (index < this.values.length) {
    this.index = index;

    this.redraw();
    this.onChange();
  }
  else {
    throw new Error('Index out of range');
  }
};

/**
 * retrieve the index of the currently selected vaue
 * @return {number} index
 */
Slider.prototype.getIndex = function() {
  return this.index;
};


/**
 * retrieve the currently selected value
 * @return {*} value
 */
Slider.prototype.get = function() {
  return this.values[this.index];
};


Slider.prototype._onMouseDown = function(event) {
  // only react on left mouse button down
  var leftButtonDown = event.which ? (event.which === 1) : (event.button === 1);
  if (!leftButtonDown) return;

  this.startClientX = event.clientX;
  this.startSlideX = parseFloat(this.frame.slide.style.left);

  this.frame.style.cursor = 'move';

  // add event listeners to handle moving the contents
  // we store the function onmousemove and onmouseup in the graph, so we can
  // remove the eventlisteners lateron in the function mouseUp()
  var me = this;
  this.onmousemove = function (event) {me._onMouseMove(event);};
  this.onmouseup   = function (event) {me._onMouseUp(event);};
  util.addEventListener(document, 'mousemove', this.onmousemove);
  util.addEventListener(document, 'mouseup',   this.onmouseup);
  util.preventDefault(event);
};


Slider.prototype.leftToIndex = function (left) {
  var width = parseFloat(this.frame.bar.style.width) -
      this.frame.slide.clientWidth - 10;
  var x = left - 3;

  var index = Math.round(x / width * (this.values.length-1));
  if (index < 0) index = 0;
  if (index > this.values.length-1) index = this.values.length-1;

  return index;
};

Slider.prototype.indexToLeft = function (index) {
  var width = parseFloat(this.frame.bar.style.width) -
      this.frame.slide.clientWidth - 10;

  var x = index / (this.values.length-1) * width;
  var left = x + 3;

  return left;
};



Slider.prototype._onMouseMove = function (event) {
  var diff = event.clientX - this.startClientX;
  var x = this.startSlideX + diff;

  var index = this.leftToIndex(x);

  this.setIndex(index);

  util.preventDefault();
};


Slider.prototype._onMouseUp = function (event) {  // eslint-disable-line no-unused-vars
  this.frame.style.cursor = 'auto';

  // remove event listeners
  util.removeEventListener(document, 'mousemove', this.onmousemove);
  util.removeEventListener(document, 'mouseup', this.onmouseup);

  util.preventDefault();
};

module.exports = Slider;
