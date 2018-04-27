var Item = require('./Item');

/**
 * @constructor BoxItem
 * @extends Item
 * @param {Object} data             Object containing parameters start
 *                                  content, className.
 * @param {{toScreen: function, toTime: function}} conversion
 *                                  Conversion functions from time to screen and vice versa
 * @param {Object} [options]        Configuration options
 *                                  // TODO: describe available options
 */
function BoxItem (data, conversion, options) {
  this.props = {
    dot: {
      width: 0,
      height: 0
    },
    line: {
      width: 0,
      height: 0
    }
  };
  this.options = options;
  // validate data
  if (data) {
    if (data.start == undefined) {
      throw new Error('Property "start" missing in item ' + data);
    }
  }

  Item.call(this, data, conversion, options);
}

BoxItem.prototype = new Item (null, null, null);

/**
 * Check whether this item is visible inside given range
 * @param {{start: number, end: number}} range with a timestamp for start and end
 * @returns {boolean} True if visible
 */
BoxItem.prototype.isVisible = function(range) {
  // determine visibility
  var isVisible;
  var align = this.options.align;
  var widthInMs = this.width * range.getMillisecondsPerPixel();

  if (align == 'right') {
    isVisible = (this.data.start.getTime() > range.start ) && (this.data.start.getTime() - widthInMs < range.end);
  }
  else if (align == 'left') {
    isVisible = (this.data.start.getTime() + widthInMs > range.start ) && (this.data.start.getTime() < range.end);
  }
  else {
    // default or 'center'
    isVisible = (this.data.start.getTime() + widthInMs/2 > range.start ) && (this.data.start.getTime() - widthInMs/2 < range.end);
  }
  return isVisible;
};

BoxItem.prototype._createDomElement = function() {
  if (!this.dom) {
    // create DOM
    this.dom = {};

    // create main box
    this.dom.box = document.createElement('DIV');

    // contents box (inside the background box). used for making margins
    this.dom.content = document.createElement('DIV');
    this.dom.content.className = 'vis-item-content';
    this.dom.box.appendChild(this.dom.content);

    // line to axis
    this.dom.line = document.createElement('DIV');
    this.dom.line.className = 'vis-line';

    // dot on axis
    this.dom.dot = document.createElement('DIV');
    this.dom.dot.className = 'vis-dot';

    // attach this item as attribute
    this.dom.box['timeline-item'] = this;

    this.dirty = true;
  }
}

BoxItem.prototype._appendDomElement = function() {
  if (!this.parent) {
    throw new Error('Cannot redraw item: no parent attached');
  }
  if (!this.dom.box.parentNode) {
    var foreground = this.parent.dom.foreground;
    if (!foreground) throw new Error('Cannot redraw item: parent has no foreground container element');
    foreground.appendChild(this.dom.box);
  }
  if (!this.dom.line.parentNode) {
    var background = this.parent.dom.background;
    if (!background) throw new Error('Cannot redraw item: parent has no background container element');
    background.appendChild(this.dom.line);
  }
  if (!this.dom.dot.parentNode) {
    var axis = this.parent.dom.axis;
    if (!background) throw new Error('Cannot redraw item: parent has no axis container element');
    axis.appendChild(this.dom.dot);
  }
  this.displayed = true;
}

BoxItem.prototype._updateDirtyDomComponents = function() {
  // An item is marked dirty when:
  // - the item is not yet rendered
  // - the item's data is changed
  // - the item is selected/deselected
  if (this.dirty) {
    this._updateContents(this.dom.content);
    this._updateDataAttributes(this.dom.box);
    this._updateStyle(this.dom.box);

    var editable = (this.editable.updateTime || this.editable.updateGroup);

    // update class
    var className = (this.data.className? ' ' + this.data.className : '') +
        (this.selected ? ' vis-selected' : '') +
        (editable ? ' vis-editable' : ' vis-readonly');
    this.dom.box.className = 'vis-item vis-box' + className;
    this.dom.line.className = 'vis-item vis-line' + className;
    this.dom.dot.className  = 'vis-item vis-dot' + className;
  }
}

BoxItem.prototype._getDomComponentsSizes = function() {
  return {
    previous: {
      right: this.dom.box.style.right,
      left: this.dom.box.style.left
    },
    dot: {
      height: this.dom.dot.offsetHeight,
      width: this.dom.dot.offsetWidth
    },
    line: {
      width: this.dom.line.offsetWidth
    },
    box: {
      width: this.dom.box.offsetWidth,
      height: this.dom.box.offsetHeight
    }
  }
}

BoxItem.prototype._updateDomComponentsSizes = function(sizes) {
  if (this.options.rtl) {
    this.dom.box.style.right = "0px";
  } else {
    this.dom.box.style.left = "0px";
  }

  // recalculate size
  this.props.dot.height = sizes.dot.height;
  this.props.dot.width = sizes.dot.width;
  this.props.line.width = sizes.line.width;
  this.width = sizes.box.width;
  this.height = sizes.box.height;

  // restore previous position
  if (this.options.rtl) {
    this.dom.box.style.right = sizes.previous.right;
  } else {
    this.dom.box.style.left = sizes.previous.left;
  }

  this.dirty = false;
}

BoxItem.prototype._repaintDomAdditionals = function() {
  this._repaintOnItemUpdateTimeTooltip(this.dom.box);
  this._repaintDragCenter();
  this._repaintDeleteButton(this.dom.box);
}

/**
 * Repaint the item
 * @param {boolean} [returnQueue=false]  return the queue
 * @return {boolean} the redraw queue if returnQueue=true
 */
BoxItem.prototype.redraw = function(returnQueue) {
  var sizes
  var queue = [
    // create item DOM
    this._createDomElement.bind(this),

    // append DOM to parent DOM
    this._appendDomElement.bind(this),

    // update dirty DOM
    this._updateDirtyDomComponents.bind(this),

    (function() {
      if (this.dirty) {
        sizes = this._getDomComponentsSizes();
      }
    }).bind(this),

    (function() {
      if (this.dirty) {
        this._updateDomComponentsSizes.bind(this)(sizes);
      }
    }).bind(this),

    // repaint DOM additionals
    this._repaintDomAdditionals.bind(this)
  ];

  if (returnQueue) {
    return queue;
  } else {
    var result;
    queue.forEach(function (fn) {
      result = fn();
    });
    return result;
  }
};

/**
 * Show the item in the DOM (when not already displayed). The items DOM will
 * be created when needed.
 */
BoxItem.prototype.show = function() {
  if (!this.displayed) {
    this.redraw();
  }
};

/**
 * Hide the item from the DOM (when visible)
 */
BoxItem.prototype.hide = function() {
  if (this.displayed) {
    var dom = this.dom;

    if (dom.box.parentNode)   dom.box.parentNode.removeChild(dom.box);
    if (dom.line.parentNode)  dom.line.parentNode.removeChild(dom.line);
    if (dom.dot.parentNode)   dom.dot.parentNode.removeChild(dom.dot);

    this.displayed = false;
  }
};

/**
 * Reposition the item horizontally
 * @Override
 */
BoxItem.prototype.repositionX = function() {
  var start = this.conversion.toScreen(this.data.start);
  var align = this.options.align;

  // calculate left position of the box
  if (align == 'right') {
    if (this.options.rtl) {
      this.right = start - this.width;

      // reposition box, line, and dot
      this.dom.box.style.right = this.right + 'px';
      this.dom.line.style.right = (start - this.props.line.width) + 'px';
      this.dom.dot.style.right = (start - this.props.line.width / 2 - this.props.dot.width / 2) + 'px';
    } else {
      this.left = start - this.width;

      // reposition box, line, and dot
      this.dom.box.style.left = this.left + 'px';
      this.dom.line.style.left = (start - this.props.line.width) + 'px';
      this.dom.dot.style.left = (start - this.props.line.width / 2 - this.props.dot.width / 2) + 'px';
    }
  }
  else if (align == 'left') {
    if (this.options.rtl) {
      this.right = start;

      // reposition box, line, and dot
      this.dom.box.style.right = this.right + 'px';
      this.dom.line.style.right = start + 'px';
      this.dom.dot.style.right = (start + this.props.line.width / 2 - this.props.dot.width / 2) + 'px';
    } else {
      this.left = start;

      // reposition box, line, and dot
      this.dom.box.style.left = this.left + 'px';
      this.dom.line.style.left = start + 'px';
      this.dom.dot.style.left = (start + this.props.line.width / 2 - this.props.dot.width / 2) + 'px';
    }
  }
  else {
    // default or 'center'
    if (this.options.rtl) {
      this.right = start - this.width / 2;

      // reposition box, line, and dot
      this.dom.box.style.right = this.right + 'px';
      this.dom.line.style.right = (start - this.props.line.width) + 'px';
      this.dom.dot.style.right = (start - this.props.dot.width / 2) + 'px';
    } else {
      this.left = start - this.width / 2;

      // reposition box, line, and dot
      this.dom.box.style.left = this.left + 'px';
      this.dom.line.style.left = (start - this.props.line.width / 2) + 'px';
      this.dom.dot.style.left = (start - this.props.dot.width / 2) + 'px';
    }
  }
};

/**
 * Reposition the item vertically
 * @Override
 */
BoxItem.prototype.repositionY = function() {
  var orientation = this.options.orientation.item;
  var box = this.dom.box;
  var line = this.dom.line;
  var dot = this.dom.dot;

  if (orientation == 'top') {
    box.style.top     = (this.top || 0) + 'px';

    line.style.top    = '0';
    line.style.height = (this.parent.top + this.top + 1) + 'px';
    line.style.bottom = '';
  }
  else { // orientation 'bottom'
    var itemSetHeight = this.parent.itemSet.props.height; // TODO: this is nasty
    var lineHeight = itemSetHeight - this.parent.top - this.parent.height + this.top;

    box.style.top     = (this.parent.height - this.top - this.height || 0) + 'px';
    line.style.top    = (itemSetHeight - lineHeight) + 'px';
    line.style.bottom = '0';
  }

  dot.style.top = (-this.props.dot.height / 2) + 'px';
};

/**
 * Return the width of the item left from its start date
 * @return {number}
 */
BoxItem.prototype.getWidthLeft = function () {
  return this.width / 2;
};

/**
 * Return the width of the item right from its start date
 * @return {number}
 */
BoxItem.prototype.getWidthRight = function () {
  return this.width / 2;
};

module.exports = BoxItem;
