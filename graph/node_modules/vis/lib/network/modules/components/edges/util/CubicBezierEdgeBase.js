import BezierEdgeBase from './BezierEdgeBase'

/**
 * A Base Class for all Cubic Bezier Edges. Bezier curves are used to model
 * smooth gradual curves in paths between nodes.
 *
 * @extends BezierEdgeBase
 */
class CubicBezierEdgeBase extends BezierEdgeBase {
  /**
   * @param {Object} options
   * @param {Object} body
   * @param {Label} labelModule
   */
  constructor(options, body, labelModule) {
    super(options, body, labelModule);
  }

  /**
   * Calculate the distance between a point (x3,y3) and a line segment from
   * (x1,y1) to (x2,y2).
   * http://stackoverflow.com/questions/849211/shortest-distancae-between-a-point-and-a-line-segment
   * https://en.wikipedia.org/wiki/B%C3%A9zier_curve
   * @param {number} x1 from x
   * @param {number} y1 from y
   * @param {number} x2 to x
   * @param {number} y2 to y
   * @param {number} x3 point to check x
   * @param {number} y3 point to check y
   * @param {Node} via1
   * @param {Node} via2
   * @returns {number}
   * @private
   */
  _getDistanceToBezierEdge(x1, y1, x2, y2, x3, y3, via1, via2) { // x3,y3 is the point
    let minDistance = 1e9;
    let distance;
    let i, t, x, y;
    let lastX = x1;
    let lastY = y1;
    let vec = [0,0,0,0]
    for (i = 1; i < 10; i++) {
      t = 0.1 * i;
      vec[0] = Math.pow(1 - t, 3);
      vec[1] = 3 * t * Math.pow(1 - t, 2);
      vec[2] = 3 * Math.pow(t,2) * (1 - t);
      vec[3] = Math.pow(t, 3);
      x = vec[0] * x1 + vec[1] * via1.x + vec[2] * via2.x + vec[3] * x2;
      y = vec[0] * y1 + vec[1] * via1.y + vec[2] * via2.y + vec[3] * y2;
      if (i > 0) {
        distance = this._getDistanceToLine(lastX, lastY, x, y, x3, y3);
        minDistance = distance < minDistance ? distance : minDistance;
      }
      lastX = x;
      lastY = y;
    }

    return minDistance;
  }
}

export default CubicBezierEdgeBase;