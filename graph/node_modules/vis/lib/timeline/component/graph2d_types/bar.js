var DOMutil = require('../../../DOMutil');
var Points = require('./points');

/**
 *
 * @param {vis.GraphGroup.id} groupId
 * @param {Object} options   // TODO: Describe options
 * @constructor Bargraph
 */
function Bargraph(groupId, options) {  // eslint-disable-line no-unused-vars
}

Bargraph.drawIcon = function (group, x, y, iconWidth, iconHeight, framework) {
  var fillHeight = iconHeight * 0.5;
  var outline = DOMutil.getSVGElement("rect", framework.svgElements, framework.svg);
  outline.setAttributeNS(null, "x", x);
  outline.setAttributeNS(null, "y", y - fillHeight);
  outline.setAttributeNS(null, "width", iconWidth);
  outline.setAttributeNS(null, "height", 2 * fillHeight);
  outline.setAttributeNS(null, "class", "vis-outline");

  var barWidth = Math.round(0.3 * iconWidth);
  var originalWidth = group.options.barChart.width;
  var scale = originalWidth / barWidth;
  var bar1Height = Math.round(0.4 * iconHeight);
  var bar2Height = Math.round(0.75 * iconHeight);

  var offset = Math.round((iconWidth - (2 * barWidth)) / 3);

  DOMutil.drawBar(x + 0.5 * barWidth + offset, y + fillHeight - bar1Height - 1, barWidth, bar1Height, group.className + ' vis-bar', framework.svgElements, framework.svg, group.style);
  DOMutil.drawBar(x + 1.5 * barWidth + offset + 2, y + fillHeight - bar2Height - 1, barWidth, bar2Height, group.className + ' vis-bar', framework.svgElements, framework.svg, group.style);

  if (group.options.drawPoints.enabled == true) {
    var groupTemplate = {
      style: group.options.drawPoints.style,
      styles: group.options.drawPoints.styles,
      size: (group.options.drawPoints.size / scale),
      className: group.className
    };
    DOMutil.drawPoint(x + 0.5 * barWidth + offset, y + fillHeight - bar1Height - 1, groupTemplate, framework.svgElements, framework.svg);
    DOMutil.drawPoint(x + 1.5 * barWidth + offset + 2, y + fillHeight - bar2Height - 1, groupTemplate, framework.svgElements, framework.svg);
  }
};

/**
 * draw a bar graph
 *
 * @param {Array.<vis.GraphGroup.id>} groupIds
 * @param {Object} processedGroupData
 * @param {{svg: Object, svgElements: Array.<Object>, options: Object, groups: Array.<vis.Group>}} framework
 */
Bargraph.draw = function (groupIds, processedGroupData, framework) {
  var combinedData = [];
  var intersections = {};
  var coreDistance;
  var key, drawData;
  var group;
  var i, j;
  var barPoints = 0;

  // combine all barchart data
  for (i = 0; i < groupIds.length; i++) {
    group = framework.groups[groupIds[i]];
    if (group.options.style === 'bar') {
      if (group.visible === true && (framework.options.groups.visibility[groupIds[i]] === undefined || framework.options.groups.visibility[groupIds[i]] === true)) {
        for (j = 0; j < processedGroupData[groupIds[i]].length; j++) {
          combinedData.push({
            screen_x: processedGroupData[groupIds[i]][j].screen_x,
            screen_end: processedGroupData[groupIds[i]][j].screen_end,
            screen_y: processedGroupData[groupIds[i]][j].screen_y,
            x: processedGroupData[groupIds[i]][j].x,
            end: processedGroupData[groupIds[i]][j].end,
            y: processedGroupData[groupIds[i]][j].y,
            groupId: groupIds[i],
            label: processedGroupData[groupIds[i]][j].label
          });
          barPoints += 1;
        }
      }
    }
  }

  if (barPoints === 0) {
    return;
  }

  // sort by time and by group
  combinedData.sort(function (a, b) {
    if (a.screen_x === b.screen_x) {
      return a.groupId < b.groupId ? -1 : 1;
    }
    else {
      return a.screen_x - b.screen_x;
    }
  });

  // get intersections
  Bargraph._getDataIntersections(intersections, combinedData);

  // plot barchart
  for (i = 0; i < combinedData.length; i++) {
    group = framework.groups[combinedData[i].groupId];
    var minWidth = group.options.barChart.minWidth != undefined ? group.options.barChart.minWidth : 0.1 * group.options.barChart.width;

    key = combinedData[i].screen_x;
    var heightOffset = 0;
    if (intersections[key] === undefined) {
      if (i + 1 < combinedData.length) {
        coreDistance = Math.abs(combinedData[i + 1].screen_x - key);
      }
      drawData = Bargraph._getSafeDrawData(coreDistance, group, minWidth);
    }
    else {
      var nextKey = i + (intersections[key].amount - intersections[key].resolved);
      if (nextKey < combinedData.length) {
        coreDistance = Math.abs(combinedData[nextKey].screen_x - key);
      }
      drawData = Bargraph._getSafeDrawData(coreDistance, group, minWidth);
      intersections[key].resolved += 1;

      if (group.options.stack === true && group.options.excludeFromStacking !== true) {
        if (combinedData[i].screen_y < group.zeroPosition) {
          heightOffset = intersections[key].accumulatedNegative;
          intersections[key].accumulatedNegative += group.zeroPosition - combinedData[i].screen_y;
        }
        else {
          heightOffset = intersections[key].accumulatedPositive;
          intersections[key].accumulatedPositive += group.zeroPosition - combinedData[i].screen_y;
        }
      }
      else if (group.options.barChart.sideBySide === true) {
        drawData.width = drawData.width / intersections[key].amount;
        drawData.offset += (intersections[key].resolved) * drawData.width - (0.5 * drawData.width * (intersections[key].amount + 1));
      }
    }
    
    let dataWidth = drawData.width;
    let start = combinedData[i].screen_x;

    // are we drawing explicit boxes? (we supplied an end value)
    if (combinedData[i].screen_end != undefined){
      dataWidth = combinedData[i].screen_end - combinedData[i].screen_x;
      start += (dataWidth * 0.5);
    }
    else {
      start += drawData.offset
    }

    DOMutil.drawBar(start, combinedData[i].screen_y - heightOffset, dataWidth, group.zeroPosition - combinedData[i].screen_y, group.className + ' vis-bar', framework.svgElements, framework.svg, group.style);

    // draw points
    if (group.options.drawPoints.enabled === true) {
      let pointData = {
        screen_x: combinedData[i].screen_x,
        screen_y: combinedData[i].screen_y - heightOffset,
        x: combinedData[i].x,
        y: combinedData[i].y,
        groupId: combinedData[i].groupId,
        label: combinedData[i].label
      };
      Points.draw([pointData], group, framework, drawData.offset);
      //DOMutil.drawPoint(combinedData[i].x + drawData.offset, combinedData[i].y, group, framework.svgElements, framework.svg);
    }
  }
};


/**
 * Fill the intersections object with counters of how many datapoints share the same x coordinates
 * @param {Object} intersections
 * @param {Array.<Object>} combinedData
 * @private
 */
Bargraph._getDataIntersections = function (intersections, combinedData) {
  // get intersections
  var coreDistance;
  for (var i = 0; i < combinedData.length; i++) {
    if (i + 1 < combinedData.length) {
      coreDistance = Math.abs(combinedData[i + 1].screen_x - combinedData[i].screen_x);
    }
    if (i > 0) {
      coreDistance = Math.min(coreDistance, Math.abs(combinedData[i - 1].screen_x - combinedData[i].screen_x));
    }
    if (coreDistance === 0) {
      if (intersections[combinedData[i].screen_x] === undefined) {
        intersections[combinedData[i].screen_x] = {
          amount: 0,
          resolved: 0,
          accumulatedPositive: 0,
          accumulatedNegative: 0
        };
      }
      intersections[combinedData[i].screen_x].amount += 1;
    }
  }
};


/**
 * Get the width and offset for bargraphs based on the coredistance between datapoints
 *
 * @param {number} coreDistance
 * @param {vis.Group} group
 * @param {number} minWidth
 * @returns {{width: number, offset: number}}
 * @private
 */
Bargraph._getSafeDrawData = function (coreDistance, group, minWidth) {
  var width, offset;
  if (coreDistance < group.options.barChart.width && coreDistance > 0) {
    width = coreDistance < minWidth ? minWidth : coreDistance

    offset = 0; // recalculate offset with the new width;
    if (group.options.barChart.align === 'left') {
      offset -= 0.5 * coreDistance;
    }
    else if (group.options.barChart.align === 'right') {
      offset += 0.5 * coreDistance;
    }
  }
  else {
    // default settings
    width = group.options.barChart.width;
    offset = 0;
    if (group.options.barChart.align === 'left') {
      offset -= 0.5 * group.options.barChart.width;
    }
    else if (group.options.barChart.align === 'right') {
      offset += 0.5 * group.options.barChart.width;
    }
  }

  return {width: width, offset: offset};
};

Bargraph.getStackedYRange = function (combinedData, groupRanges, groupIds, groupLabel, orientation) {
  if (combinedData.length > 0) {
    // sort by time and by group
    combinedData.sort(function (a, b) {
      if (a.screen_x === b.screen_x) {
        return a.groupId < b.groupId ? -1 : 1;
      }
      else {
        return a.screen_x - b.screen_x;
      }
    });
    var intersections = {};

    Bargraph._getDataIntersections(intersections, combinedData);
    groupRanges[groupLabel] = Bargraph._getStackedYRange(intersections, combinedData);
    groupRanges[groupLabel].yAxisOrientation = orientation;
    groupIds.push(groupLabel);
  }
};

Bargraph._getStackedYRange = function (intersections, combinedData) {
  var key;
  var yMin = combinedData[0].screen_y;
  var yMax = combinedData[0].screen_y;
  for (var i = 0; i < combinedData.length; i++) {
    key = combinedData[i].screen_x;
    if (intersections[key] === undefined) {
      yMin = yMin > combinedData[i].screen_y ? combinedData[i].screen_y : yMin;
      yMax = yMax < combinedData[i].screen_y ? combinedData[i].screen_y : yMax;
    }
    else {
      if (combinedData[i].screen_y < 0) {
        intersections[key].accumulatedNegative += combinedData[i].screen_y;
      }
      else {
        intersections[key].accumulatedPositive += combinedData[i].screen_y;
      }
    }
  }
  for (var xpos in intersections) {
    if (intersections.hasOwnProperty(xpos)) {
      yMin = yMin > intersections[xpos].accumulatedNegative ? intersections[xpos].accumulatedNegative : yMin;
      yMin = yMin > intersections[xpos].accumulatedPositive ? intersections[xpos].accumulatedPositive : yMin;
      yMax = yMax < intersections[xpos].accumulatedNegative ? intersections[xpos].accumulatedNegative : yMax;
      yMax = yMax < intersections[xpos].accumulatedPositive ? intersections[xpos].accumulatedPositive : yMax;
    }
  }

  return {min: yMin, max: yMax};
};

module.exports = Bargraph;