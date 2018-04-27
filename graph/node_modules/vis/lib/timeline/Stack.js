// Utility functions for ordering and stacking of items
var EPSILON = 0.001; // used when checking collisions, to prevent round-off errors

/**
 * Order items by their start data
 * @param {Item[]} items
 */
exports.orderByStart = function(items) {
  items.sort(function (a, b) {
    return a.data.start - b.data.start;
  });
};

/**
 * Order items by their end date. If they have no end date, their start date
 * is used.
 * @param {Item[]} items
 */
exports.orderByEnd = function(items) {
  items.sort(function (a, b) {
    var aTime = ('end' in a.data) ? a.data.end : a.data.start,
        bTime = ('end' in b.data) ? b.data.end : b.data.start;

    return aTime - bTime;
  });
};

/**
 * Adjust vertical positions of the items such that they don't overlap each
 * other.
 * @param {Item[]} items
 *            All visible items
 * @param {{item: {horizontal: number, vertical: number}, axis: number}} margin
 *            Margins between items and between items and the axis.
 * @param {boolean} [force=false]
 *            If true, all items will be repositioned. If false (default), only
 *            items having a top===null will be re-stacked
 */
exports.stack = function(items, margin, force) {
  if (force) {
    // reset top position of all items
    for (var i = 0; i < items.length; i++) {
      items[i].top = null;
    }
  }

  // calculate new, non-overlapping positions
  for (var i = 0; i < items.length; i++) {  // eslint-disable-line no-redeclare
    var item = items[i];
    if (item.stack && item.top === null) {
      // initialize top position
      item.top = margin.axis;

      do {
        // TODO: optimize checking for overlap. when there is a gap without items,
        //       you only need to check for items from the next item on, not from zero
        var collidingItem = null;
        for (var j = 0, jj = items.length; j < jj; j++) {
          var other = items[j];
          if (other.top !== null && other !== item && other.stack && exports.collision(item, other, margin.item, other.options.rtl)) {
            collidingItem = other;
            break;
          }
        }

        if (collidingItem != null) {
          // There is a collision. Reposition the items above the colliding element
          item.top = collidingItem.top + collidingItem.height + margin.item.vertical;
        }
      } while (collidingItem);
    }
  }
};

/**
 * Adjust vertical positions of the items within a single subgroup such that they 
 * don't overlap each other.
 * @param {Item[]} items
 *            All items withina subgroup
 * @param {{item: {horizontal: number, vertical: number}, axis: number}} margin
 *            Margins between items and between items and the axis.
 * @param {subgroup} subgroup
 *            The subgroup that is being stacked 
 */
exports.substack = function (items, margin, subgroup) {
  for (var i = 0; i < items.length; i++) {
    items[i].top = null;
  }

  // Set the initial height
  var subgroupHeight = subgroup.height;

  // calculate new, non-overlapping positions
  for (i = 0; i < items.length; i++) {
    var item = items[i];

    if (item.stack && item.top === null) {
      // initialize top position
      item.top = item.baseTop;//margin.axis + item.baseTop;

      do {
        // TODO: optimize checking for overlap. when there is a gap without items,
        //       you only need to check for items from the next item on, not from zero
        var collidingItem = null;
        for (var j = 0, jj = items.length; j < jj; j++) {
          var other = items[j];
          if (other.top !== null && other !== item /*&& other.stack*/ && exports.collision(item, other, margin.item, other.options.rtl)) {
            collidingItem = other;
            break;
          }
        }

        if (collidingItem != null) {
          // There is a collision. Reposition the items above the colliding element
          item.top = collidingItem.top + collidingItem.height + margin.item.vertical;// + item.baseTop;
        }

        if (item.top + item.height > subgroupHeight) {
          subgroupHeight = item.top + item.height;
        }
      } while (collidingItem);
    }
  }

  // Set the new height
  subgroup.height = subgroupHeight - subgroup.top + 0.5 * margin.item.vertical;
};

/**
 * Adjust vertical positions of the items without stacking them
 * @param {Item[]} items
 *            All visible items
 * @param {{item: {horizontal: number, vertical: number}, axis: number}} margin
 *            Margins between items and between items and the axis.
 * @param {subgroups[]} subgroups
 *            All subgroups
 * @param {boolean} stackSubgroups
 */
exports.nostack = function(items, margin, subgroups, stackSubgroups) {
  for (var i = 0; i < items.length; i++) {
    if (items[i].data.subgroup == undefined) {
      items[i].top = margin.item.vertical;
    } else if (items[i].data.subgroup !== undefined && stackSubgroups) {
      var newTop = 0;
      for (var subgroup in subgroups) {
        if (subgroups.hasOwnProperty(subgroup)) {
          if (subgroups[subgroup].visible == true && subgroups[subgroup].index < subgroups[items[i].data.subgroup].index) {
            newTop += subgroups[subgroup].height;
            subgroups[items[i].data.subgroup].top = newTop;
          }
        }
      }
      items[i].top = newTop + 0.5 * margin.item.vertical;
    }
  }
  if (!stackSubgroups) {
    exports.stackSubgroups(items, margin, subgroups)
  }
};

/**
 * Adjust vertical positions of the subgroups such that they don't overlap each
 * other.
 * @param {Array.<vis.Item>} items
 * @param {{item: {horizontal: number, vertical: number}, axis: number}} margin Margins between items and between items and the axis.
 * @param {subgroups[]} subgroups
 *            All subgroups
 */
exports.stackSubgroups = function(items, margin, subgroups) {
  for (var subgroup in subgroups) {
    if (subgroups.hasOwnProperty(subgroup)) {


      subgroups[subgroup].top = 0;
      do {
        // TODO: optimize checking for overlap. when there is a gap without items,
        //       you only need to check for items from the next item on, not from zero
        var collidingItem = null;
        for (var otherSubgroup in subgroups) {
          if (subgroups[otherSubgroup].top !== null && otherSubgroup !== subgroup && subgroups[subgroup].index > subgroups[otherSubgroup].index && exports.collisionByTimes(subgroups[subgroup], subgroups[otherSubgroup])) {
            collidingItem = subgroups[otherSubgroup];
            break;
          }
        }

        if (collidingItem != null) {
          // There is a collision. Reposition the subgroups above the colliding element
          subgroups[subgroup].top = collidingItem.top + collidingItem.height;
        }
      } while (collidingItem);
    }
  }
  for (var i = 0; i < items.length; i++) {
    if (items[i].data.subgroup !== undefined) {
      items[i].top = subgroups[items[i].data.subgroup].top + 0.5 * margin.item.vertical;
    }
  }
};

/**
 * Adjust vertical positions of the subgroups such that they don't overlap each
 * other, then stacks the contents of each subgroup individually.
 * @param {Item[]} subgroupItems
 *            All the items in a subgroup
 * @param {{item: {horizontal: number, vertical: number}, axis: number}} margin
 *            Margins between items and between items and the axis.
 * @param {subgroups[]} subgroups
 *            All subgroups 
 */
exports.stackSubgroupsWithInnerStack = function (subgroupItems, margin, subgroups) {
  var doSubStack = false;
  
  // Run subgroups in their order (if any)
  var subgroupOrder = [];

  for(var subgroup in subgroups) {
    if (subgroups[subgroup].hasOwnProperty("index")) {
      subgroupOrder[subgroups[subgroup].index] = subgroup;
    }
    else {
      subgroupOrder.push(subgroup);
    }
  }

  for(var j = 0; j < subgroupOrder.length; j++) {
    subgroup = subgroupOrder[j];
    if (subgroups.hasOwnProperty(subgroup)) {

      doSubStack = doSubStack || subgroups[subgroup].stack;
      subgroups[subgroup].top = 0;      

      for (var otherSubgroup in subgroups) {
        if (subgroups[otherSubgroup].visible && subgroups[subgroup].index > subgroups[otherSubgroup].index) {
          subgroups[subgroup].top += subgroups[otherSubgroup].height;
        }
      }

      var items = subgroupItems[subgroup];
      for(var i = 0; i < items.length; i++) {
        if (items[i].data.subgroup !== undefined) {
          items[i].top = subgroups[items[i].data.subgroup].top + 0.5 * margin.item.vertical;

          if (subgroups[subgroup].stack) {
            items[i].baseTop = items[i].top;              
          }
        } 
      }

      if (doSubStack && subgroups[subgroup].stack) {
        exports.substack(subgroupItems[subgroup], margin, subgroups[subgroup]);        
      }
    }
  }    
};

/**
 * Test if the two provided items collide
 * The items must have parameters left, width, top, and height.
 * @param {Item} a          The first item
 * @param {Item} b          The second item
 * @param {{horizontal: number, vertical: number}} margin
 *                          An object containing a horizontal and vertical
 *                          minimum required margin.
 * @param {boolean} rtl
 * @return {boolean}        true if a and b collide, else false
 */
exports.collision = function(a, b, margin, rtl) {
  if (rtl) {
    return  ((a.right - margin.horizontal + EPSILON)  < (b.right + b.width) &&
    (a.right + a.width + margin.horizontal - EPSILON) > b.right &&
    (a.top - margin.vertical + EPSILON)              < (b.top + b.height) &&
    (a.top + a.height + margin.vertical - EPSILON)   > b.top);
  } else {
    return ((a.left - margin.horizontal + EPSILON)   < (b.left + b.width) &&
    (a.left + a.width + margin.horizontal - EPSILON) > b.left &&
    (a.top - margin.vertical + EPSILON)              < (b.top + b.height) &&
    (a.top + a.height + margin.vertical - EPSILON)   > b.top);
  }
};

/**
 * Test if the two provided objects collide
 * The objects must have parameters start, end, top, and height.
 * @param {Object} a          The first Object
 * @param {Object} b          The second Object
 * @return {boolean}        true if a and b collide, else false
 */
exports.collisionByTimes = function(a, b) {
  return (
    (a.start <= b.start && a.end >= b.start && a.top < (b.top + b.height) && (a.top + a.height) > b.top ) ||
    (b.start <= a.start && b.end >= a.start && b.top < (a.top + a.height) && (b.top + b.height) > a.top )
  )
}