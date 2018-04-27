import EdgeBase from './EdgeBase'

/**
 * The Base Class for all Bezier edges. Bezier curves are used to model smooth
 * gradual curves in paths between nodes.
 *
 * @extends EdgeBase
 */
class BezierEdgeBase extends EdgeBase {
  /**
   * @param {Object} options
   * @param {Object} body
   * @param {Label} labelModule
   */
  constructor(options, body, labelModule) {
    super(options, body, labelModule);
  }

  /**
   * This function uses binary search to look for the point where the bezier curve crosses the border of the node.
   *
   * @param {Node} nearNode
   * @param {CanvasRenderingContext2D} ctx
   * @param {Node} viaNode
   * @returns {*}
   * @private
   */
  _findBorderPositionBezier(nearNode, ctx, viaNode = this._getViaCoordinates()) {
    var maxIterations = 10;
    var iteration = 0;
    var low = 0;
    var high = 1;
    var pos, angle, distanceToBorder, distanceToPoint, difference;
    var threshold = 0.2;
    var node = this.to;
    var from = false;
    if (nearNode.id === this.from.id) {
      node = this.from;
      from = true;
    }

    while (low <= high && iteration < maxIterations) {
      var middle = (low + high) * 0.5;

      pos = this.getPoint(middle, viaNode);
      angle = Math.atan2((node.y - pos.y), (node.x - pos.x));
      distanceToBorder = node.distanceToBorder(ctx, angle);
      distanceToPoint = Math.sqrt(Math.pow(pos.x - node.x, 2) + Math.pow(pos.y - node.y, 2));
      difference = distanceToBorder - distanceToPoint;
      if (Math.abs(difference) < threshold) {
        break; // found
      }
      else if (difference < 0) { // distance to nodes is larger than distance to border --> t needs to be bigger if we're looking at the to node.
        if (from === false) {
          low = middle;
        }
        else {
          high = middle;
        }
      }
      else {
        if (from === false) {
          high = middle;
        }
        else {
          low = middle;
        }
      }

      iteration++;
    }
    pos.t = middle;

    return pos;
  }



  /**
   * Calculate the distance between a point (x3,y3) and a line segment from
   * (x1,y1) to (x2,y2).
   * http://stackoverflow.com/questions/849211/shortest-distancae-between-a-point-and-a-line-segment
   * @param {number} x1 from x
   * @param {number} y1 from y
   * @param {number} x2 to x
   * @param {number} y2 to y
   * @param {number} x3 point to check x
   * @param {number} y3 point to check y
   * @param {Node} via
   * @returns {number}
   * @private
   */
  _getDistanceToBezierEdge(x1, y1, x2, y2, x3, y3, via) { // x3,y3 is the point
    let minDistance = 1e9;
    let distance;
    let i, t, x, y;
    let lastX = x1;
    let lastY = y1;
    for (i = 1; i < 10; i++) {
      t = 0.1 * i;
      x = Math.pow(1 - t, 2) * x1 + (2 * t * (1 - t)) * via.x + Math.pow(t, 2) * x2;
      y = Math.pow(1 - t, 2) * y1 + (2 * t * (1 - t)) * via.y + Math.pow(t, 2) * y2;
      if (i > 0) {
        distance = this._getDistanceToLine(lastX, lastY, x, y, x3, y3);
        minDistance = distance < minDistance ? distance : minDistance;
      }
      lastX = x;
      lastY = y;
    }

    return minDistance;
  }


  /**
   * Draw a bezier curve between two nodes
   *
   * The method accepts zero, one or two control points.
   * Passing zero control points just draws a straight line
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object}           values   | options for shadow drawing
   * @param {Object|undefined} viaNode1 | first control point for curve drawing
   * @param {Object|undefined} viaNode2 | second control point for curve drawing
   *
   * @protected
   */
  _bezierCurve(ctx, values, viaNode1, viaNode2) {
    var hasNode1 = (viaNode1 !== undefined && viaNode1.x !== undefined);
    var hasNode2 = (viaNode2 !== undefined && viaNode2.x !== undefined);

    ctx.beginPath();
    ctx.moveTo(this.fromPoint.x, this.fromPoint.y);

    if (hasNode1 && hasNode2) {
      ctx.bezierCurveTo(viaNode1.x, viaNode1.y, viaNode2.x, viaNode2.y, this.toPoint.x, this.toPoint.y);
    } else if (hasNode1) {
      ctx.quadraticCurveTo(viaNode1.x, viaNode1.y, this.toPoint.x, this.toPoint.y);
    } else {
      // fallback to normal straight edge
      ctx.lineTo(this.toPoint.x, this.toPoint.y);
    }

    // draw shadow if enabled
    this.enableShadow(ctx, values);
    ctx.stroke();
    this.disableShadow(ctx, values);
  }

  /**
   *
   * @returns {*|{x, y}|{x: undefined, y: undefined}}
   */
  getViaNode() {
    return this._getViaCoordinates();
  }
}

export default BezierEdgeBase;
