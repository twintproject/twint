var util = require('../../util');
var stack = require('../Stack');

/**
 * @param {number | string} groupId
 * @param {Object} data
 * @param {ItemSet} itemSet
 * @constructor Group
 */
function Group (groupId, data, itemSet) {
  this.groupId = groupId;
  this.subgroups = {};
  this.subgroupStack = {};
  this.subgroupStackAll = false;
  this.doInnerStack = false;
  this.subgroupIndex = 0;
  this.subgroupOrderer = data && data.subgroupOrder;
  this.itemSet = itemSet;
  this.isVisible = null;
  this.stackDirty = true; // if true, items will be restacked on next redraw
  
  if (data && data.nestedGroups) {
    this.nestedGroups = data.nestedGroups;
    if (data.showNested == false) {
      this.showNested = false;
    } else {
      this.showNested = true;
    }
  }

  if (data && data.subgroupStack) {
    if (typeof data.subgroupStack === "boolean") {
      this.doInnerStack = data.subgroupStack;
      this.subgroupStackAll = data.subgroupStack;
    }
    else {
      // We might be doing stacking on specific sub groups, but only
      // if at least one is set to do stacking
      for(var key in data.subgroupStack) {
        this.subgroupStack[key] = data.subgroupStack[key];
        this.doInnerStack = this.doInnerStack || data.subgroupStack[key];
      }
    }
  }

  this.nestedInGroup = null;

  this.dom = {};
  this.props = {
    label: {
      width: 0,
      height: 0
    }
  };
  this.className = null;

  this.items = {};        // items filtered by groupId of this group
  this.visibleItems = []; // items currently visible in window
  this.itemsInRange = []; // items currently in range
  this.orderedItems = {
    byStart: [],
    byEnd: []
  };
  this.checkRangedItems = false; // needed to refresh the ranged items if the window is programatically changed with NO overlap.
  var me = this;
  this.itemSet.body.emitter.on("checkRangedItems", function () {
    me.checkRangedItems = true;
  })

  this._create();

  this.setData(data);
}

/**
 * Create DOM elements for the group
 * @private
 */
Group.prototype._create = function() {
  var label = document.createElement('div');
  if (this.itemSet.options.groupEditable.order) {
    label.className = 'vis-label draggable';
  } else {
    label.className = 'vis-label';
  }
  this.dom.label = label;

  var inner = document.createElement('div');
  inner.className = 'vis-inner';
  label.appendChild(inner);
  this.dom.inner = inner;

  var foreground = document.createElement('div');
  foreground.className = 'vis-group';
  foreground['timeline-group'] = this;
  this.dom.foreground = foreground;

  this.dom.background = document.createElement('div');
  this.dom.background.className = 'vis-group';

  this.dom.axis = document.createElement('div');
  this.dom.axis.className = 'vis-group';

  // create a hidden marker to detect when the Timelines container is attached
  // to the DOM, or the style of a parent of the Timeline is changed from
  // display:none is changed to visible.
  this.dom.marker = document.createElement('div');
  this.dom.marker.style.visibility = 'hidden';
  this.dom.marker.style.position = 'absolute';
  this.dom.marker.innerHTML = '';
  this.dom.background.appendChild(this.dom.marker);
};

/**
 * Set the group data for this group
 * @param {Object} data   Group data, can contain properties content and className
 */
Group.prototype.setData = function(data) {
  // update contents
  var content;
  var templateFunction;

  if (this.itemSet.options && this.itemSet.options.groupTemplate) {
    templateFunction = this.itemSet.options.groupTemplate.bind(this);
    content = templateFunction(data, this.dom.inner);
  } else {
    content = data && data.content;
  }

  if (content instanceof Element) {
    this.dom.inner.appendChild(content);
    while (this.dom.inner.firstChild) {
      this.dom.inner.removeChild(this.dom.inner.firstChild);
    }
    this.dom.inner.appendChild(content);
  } else if (content instanceof Object) {
    templateFunction(data, this.dom.inner);
  } else if (content !== undefined && content !== null) {
    this.dom.inner.innerHTML = content;
  } else {
    this.dom.inner.innerHTML = this.groupId || ''; // groupId can be null
  }

  // update title
  this.dom.label.title = data && data.title || '';
  if (!this.dom.inner.firstChild) {
    util.addClassName(this.dom.inner, 'vis-hidden');
  }
  else {
    util.removeClassName(this.dom.inner, 'vis-hidden');
  }

  if (data && data.nestedGroups) {
    if (!this.nestedGroups || this.nestedGroups != data.nestedGroups) {
      this.nestedGroups = data.nestedGroups;
    }
    
    if (data.showNested !== undefined || this.showNested === undefined) {
      if (data.showNested == false) {
        this.showNested = false;
      } else {
        this.showNested = true;
      }
    }

    util.addClassName(this.dom.label, 'vis-nesting-group');
    var collapsedDirClassName = this.itemSet.options.rtl ? 'collapsed-rtl' : 'collapsed'
    if (this.showNested) {
      util.removeClassName(this.dom.label, collapsedDirClassName);
      util.addClassName(this.dom.label, 'expanded');
    } else {
      util.removeClassName(this.dom.label, 'expanded');
      util.addClassName(this.dom.label, collapsedDirClassName);
    }
  } else if (this.nestedGroups) {
    this.nestedGroups = null;
    collapsedDirClassName = this.itemSet.options.rtl ? 'collapsed-rtl' : 'collapsed'
    util.removeClassName(this.dom.label, collapsedDirClassName);
    util.removeClassName(this.dom.label, 'expanded');
    util.removeClassName(this.dom.label, 'vis-nesting-group');
  }

  if (data && data.nestedInGroup) {
    util.addClassName(this.dom.label, 'vis-nested-group');
    if (this.itemSet.options && this.itemSet.options.rtl) {
      this.dom.inner.style.paddingRight = '30px';
    } else {
      this.dom.inner.style.paddingLeft = '30px';
    }
  }

  // update className
  var className = data && data.className || null;
  if (className != this.className) {
    if (this.className) {
      util.removeClassName(this.dom.label, this.className);
      util.removeClassName(this.dom.foreground, this.className);
      util.removeClassName(this.dom.background, this.className);
      util.removeClassName(this.dom.axis, this.className);
    }
    util.addClassName(this.dom.label, className);
    util.addClassName(this.dom.foreground, className);
    util.addClassName(this.dom.background, className);
    util.addClassName(this.dom.axis, className);
    this.className = className;
  }

  // update style
  if (this.style) {
    util.removeCssText(this.dom.label, this.style);
    this.style = null;
  }
  if (data && data.style) {
    util.addCssText(this.dom.label, data.style);
    this.style = data.style;
  }
};

/**
 * Get the width of the group label
 * @return {number} width
 */
Group.prototype.getLabelWidth = function() {
  return this.props.label.width;
};

Group.prototype._didMarkerHeightChange = function() {
  var markerHeight = this.dom.marker.clientHeight;
  if (markerHeight != this.lastMarkerHeight) {
    this.lastMarkerHeight = markerHeight;
    var redrawQueue = {};
    var redrawQueueLength = 0;

    util.forEach(this.items, function (item, key) {
      item.dirty = true;
      if (item.displayed) {
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
    return true;
  }
}

Group.prototype._calculateGroupSizeAndPosition = function() {
  var offsetTop = this.dom.foreground.offsetTop
  var offsetLeft = this.dom.foreground.offsetLeft
  var offsetWidth = this.dom.foreground.offsetWidth
  this.top = offsetTop;
  this.right = offsetLeft;
  this.width = offsetWidth;
}

Group.prototype._redrawItems = function(forceRestack, lastIsVisible, margin, range) {
  var restack = forceRestack || this.stackDirty || this.isVisible && !lastIsVisible;

  // if restacking, reposition visible items vertically
  if (restack) {
    var visibleSubgroups = {};
    var subgroup = null;

    if (typeof this.itemSet.options.order === 'function') {
      // a custom order function
      // brute force restack of all items

      // show all items
      var me = this;
      var limitSize = false;

      var redrawQueue = {};
      var redrawQueueLength = 0;

      util.forEach(this.items, function (item, key) {
        if (!item.displayed) {
          var returnQueue = true;
          redrawQueue[key] = item.redraw(returnQueue);
          redrawQueueLength = redrawQueue[key].length;
          me.visibleItems.push(item);
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

      util.forEach(this.items, function (item) {
        item.repositionX(limitSize);
      });

      if (this.doInnerStack && this.itemSet.options.stackSubgroups) {
        // Order the items within each subgroup
        for(subgroup in this.subgroups) {            
          visibleSubgroups[subgroup] = this.subgroups[subgroup].items.slice().sort(function (a, b) {
            return me.itemSet.options.order(a.data, b.data);
          });
        }

        stack.stackSubgroupsWithInnerStack(visibleSubgroups, margin, this.subgroups);          
      }
      else {
        // order all items and force a restacking
        var customOrderedItems = this.orderedItems.byStart.slice().sort(function (a, b) {
          return me.itemSet.options.order(a.data, b.data);
        });
        stack.stack(customOrderedItems, margin, true /* restack=true */);        
      }

      this.visibleItems = this._updateItemsInRange(this.orderedItems, this.visibleItems, range);
    } else {
      // no custom order function, lazy stacking
      this.visibleItems = this._updateItemsInRange(this.orderedItems, this.visibleItems, range);

      if (this.itemSet.options.stack) {
        if (this.doInnerStack && this.itemSet.options.stackSubgroups) {                    
          for(subgroup in this.subgroups) {            
            visibleSubgroups[subgroup] = this.subgroups[subgroup].items;
          }

          stack.stackSubgroupsWithInnerStack(visibleSubgroups, margin, this.subgroups);
        }
        else {
          // TODO: ugly way to access options...
          stack.stack(this.visibleItems, margin, true /* restack=true */);
        }
      } else {
        // no stacking
        stack.nostack(this.visibleItems, margin, this.subgroups, this.itemSet.options.stackSubgroups);
      }
    }

    this.stackDirty = false;
  }
}

Group.prototype._didResize = function(resized, height) {
  resized = util.updateProperty(this, 'height', height) || resized;
  // recalculate size of label
  var labelWidth = this.dom.inner.clientWidth;
  var labelHeight = this.dom.inner.clientHeight;
  resized = util.updateProperty(this.props.label, 'width', labelWidth) || resized;
  resized = util.updateProperty(this.props.label, 'height', labelHeight) || resized;
  return resized;
}

Group.prototype._applyGroupHeight = function(height) {
  this.dom.background.style.height = height + 'px';
  this.dom.foreground.style.height = height + 'px';
  this.dom.label.style.height = height + 'px';
}

// update vertical position of items after they are re-stacked and the height of the group is calculated
Group.prototype._updateItemsVerticalPosition = function(margin) {
  for (var i = 0, ii = this.visibleItems.length; i < ii; i++) {
    var item = this.visibleItems[i];
    item.repositionY(margin);
    if (!this.isVisible && this.groupId != "__background__") {
      if (item.displayed) item.hide();
    }
  }
}

/**
 * Repaint this group
 * @param {{start: number, end: number}} range
 * @param {{item: {horizontal: number, vertical: number}, axis: number}} margin
 * @param {boolean} [forceRestack=false]  Force restacking of all items
 * @param {boolean} [returnQueue=false]  return the queue or if the group resized
 * @return {boolean} Returns true if the group is resized or the redraw queue if returnQueue=true
 */
Group.prototype.redraw = function(range, margin, forceRestack, returnQueue) {
  var resized = false;
  var lastIsVisible = this.isVisible;
  var height;

  var queue = [
    // force recalculation of the height of the items when the marker height changed
    // (due to the Timeline being attached to the DOM or changed from display:none to visible)
    (function () {
      forceRestack = this._didMarkerHeightChange.bind(this);
    }).bind(this),

    // recalculate the height of the subgroups
    this._updateSubGroupHeights.bind(this, margin),

    // calculate actual size and position
    this._calculateGroupSizeAndPosition.bind(this),

    // check if group is visible
    (function() {
      this.isVisible = this._isGroupVisible.bind(this)(range, margin);
    }).bind(this),

    // redraw Items if needed
    (function() {
      this._redrawItems.bind(this)(forceRestack, lastIsVisible, margin, range)
    }).bind(this),

    // update subgroups
    this._updateSubgroupsSizes.bind(this),

    // recalculate the height of the group
    (function() {
      height = this._calculateHeight.bind(this)(margin);
    }).bind(this),

    // calculate actual size and position again
    this._calculateGroupSizeAndPosition.bind(this),

    // check if resized
    (function() {
      resized = this._didResize.bind(this)(resized, height)
    }).bind(this),

    // apply group height
    (function() {
      this._applyGroupHeight.bind(this)(height)
    }).bind(this),

    // update vertical position of items after they are re-stacked and the height of the group is calculated
    (function() {
      this._updateItemsVerticalPosition.bind(this)(margin)
    }).bind(this),

    function() {
      if (!this.isVisible && this.height) {
        resized = false;
      }
      return resized
    }
  ]

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
 * recalculate the height of the subgroups
 *
 * @param {{item: vis.Item}} margin
 * @private
 */
Group.prototype._updateSubGroupHeights = function (margin) {
  if (Object.keys(this.subgroups).length > 0) {
    var me = this;

    this.resetSubgroups();

    util.forEach(this.visibleItems, function (item) {
      if (item.data.subgroup !== undefined) {
        me.subgroups[item.data.subgroup].height = Math.max(me.subgroups[item.data.subgroup].height, item.height + margin.item.vertical);
        me.subgroups[item.data.subgroup].visible = true;
      }
    });
  }
};

/**
 * check if group is visible
 *
 * @param {vis.Range} range
 * @param {{axis: vis.DataAxis}} margin
 * @returns {boolean} is visible
 * @private
 */
Group.prototype._isGroupVisible = function (range, margin) {
  return (this.top <= range.body.domProps.centerContainer.height - range.body.domProps.scrollTop + margin.axis)
  && (this.top + this.height + margin.axis >= - range.body.domProps.scrollTop);
};

/**
 * recalculate the height of the group
 * @param {{item: {horizontal: number, vertical: number}, axis: number}} margin
 * @returns {number} Returns the height
 * @private
 */
Group.prototype._calculateHeight = function (margin) {
  // recalculate the height of the group
  var height;
  var itemsInRange = this.visibleItems;
  if (itemsInRange.length > 0) {
    var min = itemsInRange[0].top;
    var max = itemsInRange[0].top + itemsInRange[0].height;
    util.forEach(itemsInRange, function (item) {
      min = Math.min(min, item.top);
      max = Math.max(max, (item.top + item.height));
    });
    if (min > margin.axis) {
      // there is an empty gap between the lowest item and the axis
      var offset = min - margin.axis;
      max -= offset;
      util.forEach(itemsInRange, function (item) {
        item.top -= offset;
      });
    }
    height = max + margin.item.vertical / 2;
  }
  else {
    height = 0;
  }
  height = Math.max(height, this.props.label.height);

  return height;
};

/**
 * Show this group: attach to the DOM
 */
Group.prototype.show = function() {
  if (!this.dom.label.parentNode) {
    this.itemSet.dom.labelSet.appendChild(this.dom.label);
  }

  if (!this.dom.foreground.parentNode) {
    this.itemSet.dom.foreground.appendChild(this.dom.foreground);
  }

  if (!this.dom.background.parentNode) {
    this.itemSet.dom.background.appendChild(this.dom.background);
  }

  if (!this.dom.axis.parentNode) {
    this.itemSet.dom.axis.appendChild(this.dom.axis);
  }
};

/**
 * Hide this group: remove from the DOM
 */
Group.prototype.hide = function() {
  var label = this.dom.label;
  if (label.parentNode) {
    label.parentNode.removeChild(label);
  }

  var foreground = this.dom.foreground;
  if (foreground.parentNode) {
    foreground.parentNode.removeChild(foreground);
  }

  var background = this.dom.background;
  if (background.parentNode) {
    background.parentNode.removeChild(background);
  }

  var axis = this.dom.axis;
  if (axis.parentNode) {
    axis.parentNode.removeChild(axis);
  }
};

/**
 * Add an item to the group
 * @param {Item} item
 */
Group.prototype.add = function(item) {
  this.items[item.id] = item;
  item.setParent(this);
  this.stackDirty = true;
  // add to
  if (item.data.subgroup !== undefined) {
    this._addToSubgroup(item);
    this.orderSubgroups();
  }

  if (this.visibleItems.indexOf(item) == -1) {
    var range = this.itemSet.body.range; // TODO: not nice accessing the range like this
    this._checkIfVisible(item, this.visibleItems, range);
  }
};


Group.prototype._addToSubgroup = function(item, subgroupId) {
  subgroupId = subgroupId || item.data.subgroup;
  if (subgroupId != undefined && this.subgroups[subgroupId] === undefined) {
    this.subgroups[subgroupId] = {
      height:0,
      top: 0,
      start: item.data.start,
      end: item.data.end || item.data.start,
      visible: false,
      index:this.subgroupIndex,
      items: [],
      stack: this.subgroupStackAll || this.subgroupStack[subgroupId] || false
    };
    this.subgroupIndex++;
  }


  if (new Date(item.data.start) < new Date(this.subgroups[subgroupId].start)) {
    this.subgroups[subgroupId].start = item.data.start;
  }

  var itemEnd = item.data.end || item.data.start;
  if (new Date(itemEnd) > new Date(this.subgroups[subgroupId].end)) {
    this.subgroups[subgroupId].end = itemEnd;
  }

  this.subgroups[subgroupId].items.push(item);
  
};

Group.prototype._updateSubgroupsSizes = function () {
  var me = this;
  if (me.subgroups) {
    for (var subgroup in me.subgroups) {
      var initialEnd = me.subgroups[subgroup].items[0].data.end || me.subgroups[subgroup].items[0].data.start;
      var newStart = me.subgroups[subgroup].items[0].data.start;
      var newEnd = initialEnd - 1;

      me.subgroups[subgroup].items.forEach(function(item) {
        if (new Date(item.data.start) < new Date(newStart)) { 
          newStart = item.data.start; 
        }

        var itemEnd = item.data.end || item.data.start;
        if (new Date(itemEnd) > new Date(newEnd)) {
          newEnd = itemEnd;
        }
      })

      me.subgroups[subgroup].start = newStart;
      me.subgroups[subgroup].end = new Date(newEnd - 1) // -1 to compensate for colliding end to start subgroups;

    }
  }
}

Group.prototype.orderSubgroups = function() {
  if (this.subgroupOrderer !== undefined) {
    var sortArray = [];
    var subgroup;
    if (typeof this.subgroupOrderer == 'string') {
      for (subgroup in this.subgroups) {
        sortArray.push({subgroup: subgroup, sortField: this.subgroups[subgroup].items[0].data[this.subgroupOrderer]})
      }
      sortArray.sort(function (a, b) {
        return a.sortField - b.sortField;
      })
    }
    else if (typeof this.subgroupOrderer == 'function') {
      for (subgroup in this.subgroups) {
        sortArray.push(this.subgroups[subgroup].items[0].data);
      }
      sortArray.sort(this.subgroupOrderer);
    }

    if (sortArray.length > 0) {
      for (var i = 0; i < sortArray.length; i++) {
        this.subgroups[sortArray[i].subgroup].index = i;
      }
    }
  }
};

Group.prototype.resetSubgroups = function() {
  for (var subgroup in this.subgroups) {
    if (this.subgroups.hasOwnProperty(subgroup)) {
      this.subgroups[subgroup].visible = false;
      this.subgroups[subgroup].height = 0;
    }
  }
};

/**
 * Remove an item from the group
 * @param {Item} item
 */
Group.prototype.remove = function(item) {
  delete this.items[item.id];
  item.setParent(null);
  this.stackDirty = true;

  // remove from visible items
  var index = this.visibleItems.indexOf(item);
  if (index != -1) this.visibleItems.splice(index, 1);

  if(item.data.subgroup !== undefined){
    this._removeFromSubgroup(item);
    this.orderSubgroups();
  }
};

Group.prototype._removeFromSubgroup = function(item, subgroupId) {
  subgroupId = subgroupId || item.data.subgroup;
  if (subgroupId != undefined) {
    var subgroup = this.subgroups[subgroupId];
    if (subgroup){
      var itemIndex = subgroup.items.indexOf(item);
      //  Check the item is actually in this subgroup. How should items not in the group be handled?
      if (itemIndex >= 0) {
        subgroup.items.splice(itemIndex,1);
        if (!subgroup.items.length){
          delete this.subgroups[subgroupId];
        } else {
          this._updateSubgroupsSizes();
        }
      }
    }
  }
};

/**
 * Remove an item from the corresponding DataSet
 * @param {Item} item
 */
Group.prototype.removeFromDataSet = function(item) {
  this.itemSet.removeItem(item.id);
};


/**
 * Reorder the items
 */
Group.prototype.order = function() {
  var array = util.toArray(this.items);
  var startArray = [];
  var endArray = [];

  for (var i = 0; i < array.length; i++) {
    if (array[i].data.end !== undefined) {
      endArray.push(array[i]);
    }
    startArray.push(array[i]);
  }
  this.orderedItems = {
    byStart: startArray,
    byEnd: endArray
  };

  stack.orderByStart(this.orderedItems.byStart);
  stack.orderByEnd(this.orderedItems.byEnd);
};


/**
 * Update the visible items
 * @param {{byStart: Item[], byEnd: Item[]}} orderedItems   All items ordered by start date and by end date
 * @param {Item[]} oldVisibleItems                          The previously visible items.
 * @param {{start: number, end: number}} range              Visible range
 * @return {Item[]} visibleItems                            The new visible items.
 * @private
 */
Group.prototype._updateItemsInRange = function(orderedItems, oldVisibleItems, range) {
  var visibleItems = [];
  var visibleItemsLookup = {}; // we keep this to quickly look up if an item already exists in the list without using indexOf on visibleItems

  var interval = (range.end - range.start) / 4;
  var lowerBound = range.start - interval;
  var upperBound = range.end + interval;

  // this function is used to do the binary search.
  var searchFunction = function (value) {
    if      (value < lowerBound)  {return -1;}
    else if (value <= upperBound) {return  0;}
    else                          {return  1;}
  };

  // first check if the items that were in view previously are still in view.
  // IMPORTANT: this handles the case for the items with startdate before the window and enddate after the window!
  // also cleans up invisible items.
  if (oldVisibleItems.length > 0) {
    for (var i = 0; i < oldVisibleItems.length; i++) {
      this._checkIfVisibleWithReference(oldVisibleItems[i], visibleItems, visibleItemsLookup, range);
    }
  }

  // we do a binary search for the items that have only start values.
  var initialPosByStart = util.binarySearchCustom(orderedItems.byStart, searchFunction, 'data','start');

  // trace the visible items from the inital start pos both ways until an invisible item is found, we only look at the start values.
  this._traceVisible(initialPosByStart, orderedItems.byStart, visibleItems, visibleItemsLookup, function (item) {
    return (item.data.start < lowerBound || item.data.start > upperBound);
  });

  // if the window has changed programmatically without overlapping the old window, the ranged items with start < lowerBound and end > upperbound are not shown.
  // We therefore have to brute force check all items in the byEnd list
  if (this.checkRangedItems == true) {
    this.checkRangedItems = false;
    for (i = 0; i < orderedItems.byEnd.length; i++) {
      this._checkIfVisibleWithReference(orderedItems.byEnd[i], visibleItems, visibleItemsLookup, range);
    }
  }
  else {
    // we do a binary search for the items that have defined end times.
    var initialPosByEnd = util.binarySearchCustom(orderedItems.byEnd, searchFunction, 'data','end');

    // trace the visible items from the inital start pos both ways until an invisible item is found, we only look at the end values.
    this._traceVisible(initialPosByEnd, orderedItems.byEnd, visibleItems, visibleItemsLookup, function (item) {
      return (item.data.end < lowerBound || item.data.end > upperBound);
    });
  }

  var redrawQueue = {};
  var redrawQueueLength = 0;

  for (i = 0; i < visibleItems.length; i++) {
    var item = visibleItems[i];
    if (!item.displayed) {
      var returnQueue = true;
      redrawQueue[i] = item.redraw(returnQueue);
      redrawQueueLength = redrawQueue[i].length;
    }
  }

  var needRedraw = redrawQueueLength > 0;
  if (needRedraw) {
    // redraw all regular items
    for (var j = 0; j < redrawQueueLength; j++) {
      util.forEach(redrawQueue, function (fns) {
        fns[j]();
      });
    }
  }

  for (i = 0; i < visibleItems.length; i++) {
    visibleItems[i].repositionX();
  }
  return visibleItems;
};

Group.prototype._traceVisible = function (initialPos, items, visibleItems, visibleItemsLookup, breakCondition) {
  if (initialPos != -1) {
    var i, item;
    for (i = initialPos; i >= 0; i--) {
      item = items[i];
      if (breakCondition(item)) {
        break;
      }
      else {
        if (visibleItemsLookup[item.id] === undefined) {
          visibleItemsLookup[item.id] = true;
          visibleItems.push(item);
        }
      }
    }

    for (i = initialPos + 1; i < items.length; i++) {
      item = items[i];
      if (breakCondition(item)) {
        break;
      }
      else {
        if (visibleItemsLookup[item.id] === undefined) {
          visibleItemsLookup[item.id] = true;
          visibleItems.push(item);
        }
      }
    }
  }
}


/**
 * this function is very similar to the _checkIfInvisible() but it does not
 * return booleans, hides the item if it should not be seen and always adds to
 * the visibleItems.
 * this one is for brute forcing and hiding.
 *
 * @param {Item} item
 * @param {Array} visibleItems
 * @param {{start:number, end:number}} range
 * @private
 */
Group.prototype._checkIfVisible = function(item, visibleItems, range) {
    if (item.isVisible(range)) {
      if (!item.displayed) item.show();
      // reposition item horizontally
      item.repositionX();
      visibleItems.push(item);
    }
    else {
      if (item.displayed) item.hide();
    }
};


/**
 * this function is very similar to the _checkIfInvisible() but it does not
 * return booleans, hides the item if it should not be seen and always adds to
 * the visibleItems.
 * this one is for brute forcing and hiding.
 *
 * @param {Item} item
 * @param {Array.<vis.Item>} visibleItems
 * @param {Object<number, boolean>} visibleItemsLookup
 * @param {{start:number, end:number}} range
 * @private
 */
Group.prototype._checkIfVisibleWithReference = function(item, visibleItems, visibleItemsLookup, range) {
  if (item.isVisible(range)) {
    if (visibleItemsLookup[item.id] === undefined) {
      visibleItemsLookup[item.id] = true;
      visibleItems.push(item);
    }
  }
  else {
    if (item.displayed) item.hide();
  }
};

Group.prototype.changeSubgroup = function(item, oldSubgroup, newSubgroup) {
  this._removeFromSubgroup(item, oldSubgroup);
  this._addToSubgroup(item, newSubgroup);
  this.orderSubgroups();
};

module.exports = Group;
