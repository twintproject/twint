/**
 * Definitions for param's in jsdoc.
 * These are more or less global within Network. Putting them here until I can figure out
 * where to really put them
 * 
 * @typedef {string|number} Id
 * @typedef {Id} NodeId
 * @typedef {Id} EdgeId
 * @typedef {Id} LabelId
 *
 * @typedef {{x: number, y: number}} point
 * @typedef {{left: number, top: number, width: number, height: number}} rect
 * @typedef {{x: number, y:number, angle: number}} rotationPoint
 *   - point to rotate around and the angle in radians to rotate. angle == 0 means no rotation
 * @typedef {{nodeId:NodeId}} nodeClickItem
 * @typedef {{nodeId:NodeId, labelId:LabelId}} nodeLabelClickItem
 * @typedef {{edgeId:EdgeId}} edgeClickItem
 * @typedef {{edgeId:EdgeId, labelId:LabelId}} edgeLabelClickItem
 */

let util = require("../../../../util");

/**
 * Helper functions for components
 * @class
 */
class ComponentUtil {
  /**
   * Determine values to use for (sub)options of 'chosen'.
   *
   * This option is either a boolean or an object whose values should be examined further.
   * The relevant structures are:
   *
   * - chosen: <boolean value>
   * - chosen: { subOption: <boolean or function> }
   *
   * Where subOption is 'node', 'edge' or 'label'.
   *
   * The intention of this method appears to be to set a specific priority to the options;
   * Since most properties are either bridged or merged into the local options objects, there
   * is not much point in handling them separately.
   * TODO: examine if 'most' in previous sentence can be replaced with 'all'. In that case, we
   *       should be able to get rid of this method.
   *
   * @param {string}  subOption  option within object 'chosen' to consider; either 'node', 'edge' or 'label'
   * @param {Object}  pile       array of options objects to consider
   * 
   * @return {boolean|function}  value for passed subOption of 'chosen' to use
   */
  static choosify(subOption, pile) {
    // allowed values for subOption
    let allowed = [ 'node', 'edge', 'label'];
    let value = true;

    let chosen = util.topMost(pile, 'chosen');
    if (typeof chosen === 'boolean') {
      value = chosen;
    } else if (typeof chosen === 'object') {
      if (allowed.indexOf(subOption) === -1 ) {
        throw new Error('choosify: subOption \'' + subOption + '\' should be one of '
          + "'" + allowed.join("', '") +  "'");
      }

      let chosenEdge = util.topMost(pile, ['chosen', subOption]);
      if ((typeof chosenEdge === 'boolean') || (typeof chosenEdge === 'function')) {
        value = chosenEdge;
      }
    }

    return value;
  }


  /**
   * Check if the point falls within the given rectangle.
   *
   * @param {rect} rect
   * @param {point} point
   * @param {rotationPoint} [rotationPoint] if specified, the rotation that applies to the rectangle.
   * @returns {boolean}  true if point within rectangle, false otherwise
   * @static
   */
  static pointInRect(rect, point, rotationPoint) {
    if (rect.width <= 0 || rect.height <= 0) {
      return false;  // early out
    }

    if (rotationPoint !== undefined) {
      // Rotate the point the same amount as the rectangle
      var tmp = {
        x: point.x - rotationPoint.x,
        y: point.y - rotationPoint.y
      };

      if (rotationPoint.angle !== 0) {
        // In order to get the coordinates the same, you need to 
        // rotate in the reverse direction
        var angle = -rotationPoint.angle;

        var tmp2 = {
          x: Math.cos(angle)*tmp.x - Math.sin(angle)*tmp.y,
          y: Math.sin(angle)*tmp.x + Math.cos(angle)*tmp.y
        };
        point = tmp2;
      } else {
        point = tmp;
      }

      // Note that if a rotation is specified, the rectangle coordinates
      // are **not* the full canvas coordinates. They are relative to the
      // rotationPoint. Hence, the point coordinates need not be translated
      // back in this case.
    }

    var right  = rect.x + rect.width;
    var bottom = rect.y + rect.width;

    return (
      rect.left < point.x &&
      right     > point.x &&
      rect.top  < point.y &&
      bottom    > point.y
    );
  }


  /**
   * Check if given value is acceptable as a label text.
   *
   * @param {*} text value to check; can be anything at this point
   * @returns {boolean} true if valid label value, false otherwise
   */
  static isValidLabel(text) {
    // Note that this is quite strict: types that *might* be converted to string are disallowed
    return  (typeof text === 'string' && text !== '');
  }
}

export default ComponentUtil;
