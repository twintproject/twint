import BezierEdgeBase from './util/BezierEdgeBase'

/**
 * A Static Bezier Edge. Bezier curves are used to model smooth gradual
 * curves in paths between nodes.
 *
 * @extends BezierEdgeBase
 */
class BezierEdgeStatic extends BezierEdgeBase {
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
   * @param {Node} viaNode
   * @private
   */
  _line(ctx, values, viaNode) {
    this._bezierCurve(ctx, values, viaNode);
  }

  /**
   *
   * @returns {Array.<{x: number, y: number}>}
   */
  getViaNode() {
    return this._getViaCoordinates();
  }


  /**
   * We do not use the to and fromPoints here to make the via nodes the same as edges without arrows.
   * @returns {{x: undefined, y: undefined}}
   * @private
   */
  _getViaCoordinates() {
    // Assumption: x/y coordinates in from/to always defined
    let xVia = undefined;
    let yVia = undefined;
    let factor = this.options.smooth.roundness;
    let type = this.options.smooth.type;
    let dx = Math.abs(this.from.x - this.to.x);
    let dy = Math.abs(this.from.y - this.to.y);
    if (type === 'discrete' || type === 'diagonalCross') {
      let stepX;
      let stepY;

      if (dx <= dy) {
        stepX = stepY = factor * dy;
      } else {
        stepX = stepY = factor * dx;
      }

      if (this.from.x >  this.to.x) stepX = -stepX;
      if (this.from.y >= this.to.y) stepY = -stepY;

      xVia = this.from.x + stepX;
      yVia = this.from.y + stepY;

      if (type === "discrete") {
        if (dx <= dy) {
          xVia = dx < factor * dy ? this.from.x : xVia;
        } else {
          yVia = dy < factor * dx ? this.from.y : yVia;
        }
      }
    }
    else if (type === "straightCross") {
      let stepX = (1 - factor) * dx;
      let stepY = (1 - factor) * dy;

      if (dx <= dy) {  // up - down
        stepX = 0;
        if (this.from.y < this.to.y) stepY = -stepY;
      }
      else { // left - right
        if (this.from.x < this.to.x) stepX = -stepX;
        stepY = 0;
      }
      xVia = this.to.x + stepX;
      yVia = this.to.y + stepY;
    }
    else if (type === 'horizontal') {
      let stepX = (1 - factor) * dx;
      if (this.from.x < this.to.x) stepX = -stepX;
      xVia = this.to.x + stepX;
      yVia = this.from.y;
    }
    else if (type === 'vertical') {
      let stepY = (1 - factor) * dy;
      if (this.from.y < this.to.y) stepY = -stepY;
      xVia = this.from.x;
      yVia = this.to.y + stepY;
    }
    else if (type === 'curvedCW') {
      dx = this.to.x - this.from.x;
      dy = this.from.y - this.to.y;
      let radius = Math.sqrt(dx * dx + dy * dy);
      let pi = Math.PI;

      let originalAngle = Math.atan2(dy, dx);
      let myAngle = (originalAngle + ((factor * 0.5) + 0.5) * pi) % (2 * pi);

      xVia = this.from.x + (factor * 0.5 + 0.5) * radius * Math.sin(myAngle);
      yVia = this.from.y + (factor * 0.5 + 0.5) * radius * Math.cos(myAngle);
    }
    else if (type === 'curvedCCW') {
      dx = this.to.x - this.from.x;
      dy = this.from.y - this.to.y;
      let radius = Math.sqrt(dx * dx + dy * dy);
      let pi = Math.PI;

      let originalAngle = Math.atan2(dy, dx);
      let myAngle = (originalAngle + ((-factor * 0.5) + 0.5) * pi) % (2 * pi);

      xVia = this.from.x + (factor * 0.5 + 0.5) * radius * Math.sin(myAngle);
      yVia = this.from.y + (factor * 0.5 + 0.5) * radius * Math.cos(myAngle);
    }
    else { // continuous
      let stepX;
      let stepY;

      if (dx <= dy) {
        stepX = stepY = factor * dy;
      } else {
        stepX = stepY = factor * dx;
      }

      if (this.from.x >  this.to.x) stepX = -stepX;
      if (this.from.y >= this.to.y) stepY = -stepY;

      xVia = this.from.x + stepX;
      yVia = this.from.y + stepY;

      if (dx <= dy) {
        if (this.from.x <= this.to.x) {
          xVia = this.to.x < xVia ? this.to.x : xVia;
        }
        else {
          xVia = this.to.x > xVia ? this.to.x : xVia;
        }
      }
      else {
        if (this.from.y >= this.to.y) {
          yVia = this.to.y > yVia ? this.to.y : yVia;
        } else {
          yVia = this.to.y < yVia ? this.to.y : yVia;
        }
      }
    }
    return {x: xVia, y: yVia};
  }

  /**
   *
   * @param {Node} nearNode
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} options
   * @returns {*}
   * @private
   */
  _findBorderPosition(nearNode, ctx, options = {}) {
    return this._findBorderPositionBezier(nearNode, ctx, options.via);
  }

  /**
   *
   * @param {number} x1
   * @param {number} y1
   * @param {number} x2
   * @param {number} y2
   * @param {number} x3
   * @param {number} y3
   * @param {Node} viaNode
   * @returns {number}
   * @private
   */
  _getDistanceToEdge(x1, y1, x2, y2, x3, y3, viaNode = this._getViaCoordinates()) { // x3,y3 is the point
    return this._getDistanceToBezierEdge(x1, y1, x2, y2, x3, y3, viaNode);
  }

  /**
   * Combined function of pointOnLine and pointOnBezier. This gives the coordinates of a point on the line at a certain percentage of the way
   * @param {number} percentage
   * @param {Node} viaNode
   * @returns {{x: number, y: number}}
   * @private
   */
  getPoint(percentage, viaNode = this._getViaCoordinates()) {
    var t = percentage;
    var x = Math.pow(1 - t, 2) * this.fromPoint.x + (2 * t * (1 - t)) * viaNode.x + Math.pow(t, 2) * this.toPoint.x;
    var y = Math.pow(1 - t, 2) * this.fromPoint.y + (2 * t * (1 - t)) * viaNode.y + Math.pow(t, 2) * this.toPoint.y;

    return {x: x, y: y};
  }
}


export default BezierEdgeStatic;
