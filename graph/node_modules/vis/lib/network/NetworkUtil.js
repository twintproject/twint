let util = require("../util");

/**
 * Utility Class
 */
class NetworkUtil {
  /**
   * @ignore
   */
  constructor() {}

  /**
   * Find the center position of the network considering the bounding boxes
   *
   * @param {Array.<Node>} allNodes
   * @param {Array.<Node>} [specificNodes=[]]
   * @returns {{minX: number, maxX: number, minY: number, maxY: number}}
   * @static
   */
  static getRange(allNodes, specificNodes = []) {
    var minY = 1e9, maxY = -1e9, minX = 1e9, maxX = -1e9, node;
    if (specificNodes.length > 0) {
      for (var i = 0; i < specificNodes.length; i++) {
        node = allNodes[specificNodes[i]];
        if (minX > node.shape.boundingBox.left) {
          minX = node.shape.boundingBox.left;
        }
        if (maxX < node.shape.boundingBox.right) {
          maxX = node.shape.boundingBox.right;
        }
        if (minY > node.shape.boundingBox.top) {
          minY = node.shape.boundingBox.top;
        } // top is negative, bottom is positive
        if (maxY < node.shape.boundingBox.bottom) {
          maxY = node.shape.boundingBox.bottom;
        } // top is negative, bottom is positive
      }
    }

    if (minX === 1e9 && maxX === -1e9 && minY === 1e9 && maxY === -1e9) {
      minY = 0, maxY = 0, minX = 0, maxX = 0;
    }
    return {minX: minX, maxX: maxX, minY: minY, maxY: maxY};
  }

  /**
   * Find the center position of the network
   *
   * @param {Array.<Node>} allNodes
   * @param {Array.<Node>} [specificNodes=[]]
   * @returns {{minX: number, maxX: number, minY: number, maxY: number}}
   * @static
   */
  static getRangeCore(allNodes, specificNodes = []) {
    var minY = 1e9, maxY = -1e9, minX = 1e9, maxX = -1e9, node;
    if (specificNodes.length > 0) {
      for (var i = 0; i < specificNodes.length; i++) {
        node = allNodes[specificNodes[i]];
        if (minX > node.x) {
          minX = node.x;
        }
        if (maxX < node.x) {
          maxX = node.x;
        }
        if (minY > node.y) {
          minY = node.y;
        } // top is negative, bottom is positive
        if (maxY < node.y) {
          maxY = node.y;
        } // top is negative, bottom is positive
      }
    }

    if (minX === 1e9 && maxX === -1e9 && minY === 1e9 && maxY === -1e9) {
      minY = 0, maxY = 0, minX = 0, maxX = 0;
    }
    return {minX: minX, maxX: maxX, minY: minY, maxY: maxY};
  }


  /**
   * @param {object} range = {minX: minX, maxX: maxX, minY: minY, maxY: maxY};
   * @returns {{x: number, y: number}}
   * @static
   */
  static findCenter(range) {
    return {x: (0.5 * (range.maxX + range.minX)),
      y: (0.5 * (range.maxY + range.minY))};
  }


  /**
   * This returns a clone of the options or options of the edge or node to be used for construction of new edges or check functions for new nodes.
   * @param {vis.Item} item
   * @param {'node'|undefined} type
   * @returns {{}}
   * @static
   */
  static cloneOptions(item, type) {
    let clonedOptions = {};
    if (type === undefined || type === 'node') {
      util.deepExtend(clonedOptions, item.options, true);
      clonedOptions.x = item.x;
      clonedOptions.y = item.y;
      clonedOptions.amountOfConnections = item.edges.length;
    }
    else {
      util.deepExtend(clonedOptions, item.options, true);
    }
    return clonedOptions;
  }

}

export default NetworkUtil;