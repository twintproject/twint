import CubicBezierEdgeBase from './util/CubicBezierEdgeBase'

/**
 * A Cubic Bezier Edge. Bezier curves are used to model smooth gradual
 * curves in paths between nodes.
 *
 * @extends CubicBezierEdgeBase
 */
class CubicBezierEdge extends CubicBezierEdgeBase {
  /**
   * @param {Object} options
   * @param {Object} body
   * @param {Label} labelModule
   */
  constructor(options, body, labelModule) {
    super(options, body, labelModule);
  }

  /**
   * Draw a line between two nodes
   * @param {CanvasRenderingContext2D} ctx
   * @param {{toArrow: boolean, toArrowScale: (allOptions.edges.arrows.to.scaleFactor|{number}|allOptions.edges.arrows.middle.scaleFactor|allOptions.edges.arrows.from.scaleFactor|Array|number), toArrowType: *, middleArrow: boolean, middleArrowScale: (number|allOptions.edges.arrows.middle.scaleFactor|{number}|Array), middleArrowType: (allOptions.edges.arrows.middle.type|{string}|string|*), fromArrow: boolean, fromArrowScale: (allOptions.edges.arrows.to.scaleFactor|{number}|allOptions.edges.arrows.middle.scaleFactor|allOptions.edges.arrows.from.scaleFactor|Array|number), fromArrowType: *, arrowStrikethrough: (*|boolean|allOptions.edges.arrowStrikethrough|{boolean}), color: undefined, inheritsColor: (string|string|string|allOptions.edges.color.inherit|{string, boolean}|Array|*), opacity: *, hidden: *, length: *, shadow: *, shadowColor: *, shadowSize: *, shadowX: *, shadowY: *, dashes: (*|boolean|Array|allOptions.edges.dashes|{boolean, array}), width: *}} values
   * @param {Array.<Node>} viaNodes
   * @private
   */
  _line(ctx, values, viaNodes) {
    // get the coordinates of the support points.
    let via1 = viaNodes[0];
    let via2 = viaNodes[1];
    this._bezierCurve(ctx, values, via1, via2);
  }

  /**
   *
   * @returns {Array.<{x: number, y: number}>}
   * @private
   */
  _getViaCoordinates() {
    let dx = this.from.x - this.to.x;
    let dy = this.from.y - this.to.y;

    let x1, y1, x2, y2;
    let roundness =  this.options.smooth.roundness;

    // horizontal if x > y or if direction is forced or if direction is horizontal
    if ((Math.abs(dx) > Math.abs(dy) || this.options.smooth.forceDirection === true || this.options.smooth.forceDirection === 'horizontal') && this.options.smooth.forceDirection !== 'vertical') {
      y1 = this.from.y;
      y2 = this.to.y;
      x1 = this.from.x - roundness * dx;
      x2 = this.to.x + roundness * dx;
    }
    else {
      y1 = this.from.y - roundness * dy;
      y2 = this.to.y + roundness * dy;
      x1 = this.from.x;
      x2 = this.to.x;
    }

    return [{x: x1, y: y1},{x: x2, y: y2}];
  }

  /**
   *
   * @returns {Array.<{x: number, y: number}>}
   */
  getViaNode() {
    return this._getViaCoordinates();
  }

  /**
   *
   * @param {Node} nearNode
   * @param {CanvasRenderingContext2D} ctx
   * @returns {{x: number, y: number, t: number}}
   * @private
   */
  _findBorderPosition(nearNode, ctx) {
    return this._findBorderPositionBezier(nearNode, ctx);
  }

  /**
   *
   * @param {number} x1
   * @param {number} y1
   * @param {number} x2
   * @param {number} y2
   * @param {number} x3
   * @param {number} y3
   * @param {Node} via1
   * @param {Node} via2
   * @returns {number}
   * @private
   */
  _getDistanceToEdge(x1, y1, x2, y2, x3, y3, [via1, via2] = this._getViaCoordinates()) { // x3,y3 is the point
    return this._getDistanceToBezierEdge(x1, y1, x2, y2, x3, y3, via1, via2);
  }

  /**
   * Combined function of pointOnLine and pointOnBezier. This gives the coordinates of a point on the line at a certain percentage of the way
   * @param {number} percentage
   * @param {{x: number, y: number}} [via1=this._getViaCoordinates()[0]]
   * @param {{x: number, y: number}} [via2=this._getViaCoordinates()[1]]
   * @returns {{x: number, y: number}}
   * @private
   */
  getPoint(percentage, [via1, via2] = this._getViaCoordinates()) {
    let t = percentage;
    let vec = [];
    vec[0] = Math.pow(1 - t, 3);
    vec[1] = 3 * t * Math.pow(1 - t, 2);
    vec[2] = 3 * Math.pow(t,2) * (1 - t);
    vec[3] = Math.pow(t, 3);
    let x = vec[0] * this.fromPoint.x + vec[1] * via1.x + vec[2] * via2.x + vec[3] * this.toPoint.x;
    let y = vec[0] * this.fromPoint.y + vec[1] * via1.y + vec[2] * via2.y + vec[3] * this.toPoint.y;

    return {x: x, y: y};
  }
}


export default CubicBezierEdge;
