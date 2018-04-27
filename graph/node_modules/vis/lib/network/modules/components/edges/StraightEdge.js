import EdgeBase from './util/EdgeBase'

/**
 * A Straight Edge.
 *
 * @extends EdgeBase
 */
class StraightEdge extends EdgeBase {
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
   * @private
   */
  _line(ctx, values) {
    // draw a straight line
    ctx.beginPath();
    ctx.moveTo(this.fromPoint.x, this.fromPoint.y);
    ctx.lineTo(this.toPoint.x, this.toPoint.y);
    // draw shadow if enabled
    this.enableShadow(ctx, values);
    ctx.stroke();
    this.disableShadow(ctx, values);
  }

  /**
   *
   * @returns {undefined}
   */
  getViaNode() {
    return undefined;
  }

  /**
   * Combined function of pointOnLine and pointOnBezier. This gives the coordinates of a point on the line at a certain percentage of the way
   *
   * @param {number} percentage
   * @returns {{x: number, y: number}}
   * @private
   */
  getPoint(percentage) {
    return {
      x: (1 - percentage) * this.fromPoint.x + percentage * this.toPoint.x,
      y: (1 - percentage) * this.fromPoint.y + percentage * this.toPoint.y
    }
  }

  /**
   *
   * @param {Node} nearNode
   * @param {CanvasRenderingContext2D} ctx
   * @returns {{x: number, y: number}}
   * @private
   */
  _findBorderPosition(nearNode, ctx) {
    let node1 = this.to;
    let node2 = this.from;
    if (nearNode.id === this.from.id) {
      node1 = this.from;
      node2 = this.to;
    }

    let angle = Math.atan2((node1.y - node2.y), (node1.x - node2.x));
    let dx = (node1.x - node2.x);
    let dy = (node1.y - node2.y);
    let edgeSegmentLength = Math.sqrt(dx * dx + dy * dy);
    let toBorderDist = nearNode.distanceToBorder(ctx, angle);
    let toBorderPoint = (edgeSegmentLength - toBorderDist) / edgeSegmentLength;

    let borderPos = {};
    borderPos.x = (1 - toBorderPoint) * node2.x + toBorderPoint * node1.x;
    borderPos.y = (1 - toBorderPoint) * node2.y + toBorderPoint * node1.y;

    return borderPos;
  }

  /**
   *
   * @param {number} x1
   * @param {number} y1
   * @param {number} x2
   * @param {number} y2
   * @param {number} x3
   * @param {number} y3
   * @returns {number}
   * @private
   */
  _getDistanceToEdge(x1, y1, x2, y2, x3, y3) { // x3,y3 is the point
    return this._getDistanceToLine(x1, y1, x2, y2, x3, y3);
  }

}

export default StraightEdge;