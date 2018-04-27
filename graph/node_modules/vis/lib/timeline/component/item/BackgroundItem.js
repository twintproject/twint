var Item = require('./Item');
var BackgroundGroup = require('../BackgroundGroup');
var RangeItem = require('./RangeItem');

/**
 * @constructor BackgroundItem
 * @extends Item
 * @param {Object} data             Object containing parameters start, end
 *                                  content, className.
 * @param {{toScreen: function, toTime: function}} conversion
 *                                  Conversion functions from time to screen and vice versa
 * @param {Object} [options]        Configuration options
 *                                  // TODO: describe options
 * // TODO: implement support for the BackgroundItem just having a start, then being displayed as a sort of an annotation
 */
function BackgroundItem (data, conversion, options) {
  this.props = {
    content: {
      width: 0
    }
  };
  this.overflow = false; // if contents can overflow (css styling), this flag is set to true

  // validate data
  if (data) {
    if (data.start == undefined) {
      throw new Error('Property "start" missing in item ' + data.id);
    }
    if (data.end == undefined) {
      throw new Error('Property "end" missing in item ' + data.id);
    }
  }

  Item.call(this, data, conversion, options);
}

BackgroundItem.prototype = new Item (null, null, null);

BackgroundItem.prototype.baseClassName = 'vis-item vis-background';

BackgroundItem.prototype.stack = false;

/**
 * Check whether this item is visible inside given range
 * @param {vis.Range} range with a timestamp for start and end
 * @returns {boolean} True if visible
 */
BackgroundItem.prototype.isVisible = function(range) {
  // determine visibility
  return (this.data.start < range.end) && (this.data.end > range.start); 
};

BackgroundItem.prototype._createDomElement = function() {
  if (!this.dom) {
    // create DOM
    this.dom = {};

    // background box
    this.dom.box = document.createElement('div');
    // className is updated in redraw()

    // frame box (to prevent the item contents from overflowing
    this.dom.frame = document.createElement('div');
    this.dom.frame.className = 'vis-item-overflow';
    this.dom.box.appendChild(this.dom.frame);

    // contents box
    this.dom.content = document.createElement('div');
    this.dom.content.className = 'vis-item-content';
    this.dom.frame.appendChild(this.dom.content);

    // Note: we do NOT attach this item as attribute to the DOM,
    //       such that background items cannot be selected
    //this.dom.box['timeline-item'] = this;

    this.dirty = true;
  }
}

BackgroundItem.prototype._appendDomElement = function() {
  if (!this.parent) {
    throw new Error('Cannot redraw item: no parent attached');
  }
  if (!this.dom.box.parentNode) {
    var background = this.parent.dom.background;
    if (!background) {
      throw new Error('Cannot redraw item: parent has no background container element');
    }
    background.appendChild(this.dom.box);
  }
  this.displayed = true;
}

BackgroundItem.prototype._updateDirtyDomComponents = function() {
  // update dirty DOM. An item is marked dirty when:
  // - the item is not yet rendered
  // - the item's data is changed
  // - the item is selected/deselected
  if (this.dirty) {
    this._updateContents(this.dom.content);
    this._updateDataAttributes(this.dom.content);
    this._updateStyle(this.dom.box);

    // update class
    var className = (this.data.className ? (' ' + this.data.className) : '') +
        (this.selected ? ' vis-selected' : '');
    this.dom.box.className = this.baseClassName + className;
  }
}

BackgroundItem.prototype._getDomComponentsSizes = function() {
  // determine from css whether this box has overflow
  this.overflow = window.getComputedStyle(this.dom.content).overflow !== 'hidden';
  return {
    content: {
      width: this.dom.content.offsetWidth
    }
  }
}

BackgroundItem.prototype._updateDomComponentsSizes = function(sizes) {
  // recalculate size
  this.props.content.width = sizes.content.width;
  this.height = 0; // set height zero, so this item will be ignored when stacking items

  this.dirty = false;
}

BackgroundItem.prototype._repaintDomAdditionals = function() {
}

/**
 * Repaint the item
 * @param {boolean} [returnQueue=false]  return the queue
 * @return {boolean} the redraw result or the redraw queue if returnQueue=true
 */
BackgroundItem.prototype.redraw = function(returnQueue) {
  var sizes
  var queue = [
    // create item DOM
    this._createDomElement.bind(this),

    // append DOM to parent DOM
    this._appendDomElement.bind(this),

    this._updateDirtyDomComponents.bind(this),

    (function() {
      if (this.dirty) {
        sizes = this._getDomComponentsSizes.bind(this)();
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
 * Show the item in the DOM (when not already visible). The items DOM will
 * be created when needed.
 */
BackgroundItem.prototype.show = RangeItem.prototype.show;

/**
 * Hide the item from the DOM (when visible)
 * @return {Boolean} changed
 */
BackgroundItem.prototype.hide = RangeItem.prototype.hide;

/**
 * Reposition the item horizontally
 * @Override
 */
BackgroundItem.prototype.repositionX = RangeItem.prototype.repositionX;

/**
 * Reposition the item vertically
 * @Override
 */
BackgroundItem.prototype.repositionY = function(margin) {  // eslint-disable-line no-unused-vars
  var height;
  var orientation = this.options.orientation.item;

  // special positioning for subgroups
  if (this.data.subgroup !== undefined) {
    // TODO: instead of calculating the top position of the subgroups here for every BackgroundItem, calculate the top of the subgroup once in Itemset
    var itemSubgroup = this.data.subgroup;

    this.dom.box.style.height = this.parent.subgroups[itemSubgroup].height + 'px';

    if (orientation == 'top') { 
      this.dom.box.style.top = this.parent.top + this.parent.subgroups[itemSubgroup].top + 'px';
    } else {
      this.dom.box.style.top = (this.parent.top + this.parent.height - this.parent.subgroups[itemSubgroup].top - this.parent.subgroups[itemSubgroup].height) + 'px';
    }
    this.dom.box.style.bottom = '';
  }
  // and in the case of no subgroups:
  else {
    // we want backgrounds with groups to only show in groups.
    if (this.parent instanceof BackgroundGroup) {
      // if the item is not in a group:
      height = Math.max(this.parent.height,
          this.parent.itemSet.body.domProps.center.height,
          this.parent.itemSet.body.domProps.centerContainer.height);
      this.dom.box.style.bottom = orientation == 'bottom' ? '0' : '';
      this.dom.box.style.top = orientation == 'top' ? '0' : '';
    }
    else {
      height = this.parent.height;
      // same alignment for items when orientation is top or bottom
      this.dom.box.style.top = this.parent.top + 'px';
      this.dom.box.style.bottom = '';
    }
  }
  this.dom.box.style.height = height + 'px';
};

module.exports = BackgroundItem;
