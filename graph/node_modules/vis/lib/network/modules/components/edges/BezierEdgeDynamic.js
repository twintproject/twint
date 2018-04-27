import BezierEdgeBase from './util/BezierEdgeBase'

/**
 * A Dynamic Bezier Edge. Bezier curves are used to model smooth gradual
 * curves in paths between nodes. The Dynamic piece refers to how the curve
 * reacts to physics changes.
 *
 * @extends BezierEdgeBase
 */
class BezierEdgeDynamic extends BezierEdgeBase {
  /**
   * @param {Object} options
   * @param {Object} body
   * @param {Label} labelModule
   */
  constructor(options, body, labelModule) {
    //this.via = undefined; // Here for completeness but not allowed to defined before super() is invoked.
    super(options, body, labelModule); // --> this calls the setOptions below
    this._boundFunction = () => {this.positionBezierNode();};
    this.body.emitter.on("_repositionBezierNodes", this._boundFunction);
  }

  /**
   *
   * @param {Object} options
   */
  setOptions(options) {
    // check if the physics has changed.
    let physicsChange = false;
    if (this.options.physics !== options.physics) {
      physicsChange = true;
    }

    // set the options and the to and from nodes
    this.options = options;
    this.id = this.options.id;
    this.from = this.body.nodes[this.options.from];
    this.to = this.body.nodes[this.options.to];

    // setup the support node and connect
    this.setupSupportNode();
    this.connect();

    // when we change the physics state of the edge, we reposition the support node.
    if (physicsChange === true) {
      this.via.setOptions({physics: this.options.physics});
      this.positionBezierNode();
    }
  }

  /**
   * Connects an edge to node(s)
   */
  connect() {
    this.from = this.body.nodes[this.options.from];
    this.to = this.body.nodes[this.options.to];
    if (this.from === undefined || this.to === undefined || this.options.physics === false) {
      this.via.setOptions({physics:false})
    }
    else {
      // fix weird behaviour where a self referencing node has physics enabled
      if (this.from.id === this.to.id) {
        this.via.setOptions({physics: false})
      }
      else {
        this.via.setOptions({physics: true})
      }
    }
  }

  /**
   * remove the support nodes
   * @returns {boolean}
   */
  cleanup() {
    this.body.emitter.off("_repositionBezierNodes", this._boundFunction);
    if (this.via !== undefined) {
      delete this.body.nodes[this.via.id];
      this.via = undefined;
      return true;
    }
    return false;
  }

  /**
   * Bezier curves require an anchor point to calculate the smooth flow. These points are nodes. These nodes are invisible but
   * are used for the force calculation.
   *
   * The changed data is not called, if needed, it is returned by the main edge constructor.
   * @private
   */
  setupSupportNode() {
    if (this.via === undefined) {
      var nodeId = "edgeId:" + this.id;
      var node = this.body.functions.createNode({
        id: nodeId,
        shape: 'circle',
        physics:true,
        hidden:true
      });
      this.body.nodes[nodeId] = node;
      this.via = node;
      this.via.parentEdgeId = this.id;
      this.positionBezierNode();
    }
  }

  /**
   * Positions bezier node
   */
  positionBezierNode() {
    if (this.via !== undefined && this.from !== undefined && this.to !== undefined) {
      this.via.x = 0.5 * (this.from.x + this.to.x);
      this.via.y = 0.5 * (this.from.y + this.to.y);
    }
    else if (this.via !== undefined) {
      this.via.x = 0;
      this.via.y = 0;
    }
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
   * @returns {Node|undefined|*|{index, line, column}}
   */
  getViaNode() {
    return this.via;
  }


  /**
   * Combined function of pointOnLine and pointOnBezier. This gives the coordinates of a point on the line at a certain percentage of the way
   *
   * @param {number} percentage
   * @param {Node} viaNode
   * @returns {{x: number, y: number}}
   * @private
   */
  getPoint(percentage, viaNode = this.via) {
    let t = percentage;
    let x, y;
    if (this.from === this.to){
      let [cx,cy,cr]  = this._getCircleData(this.from);
      let a = 2 * Math.PI * (1 - t);
      x = cx + cr * Math.sin(a);
      y = cy + cr - cr * (1 - Math.cos(a));
    } else {
      x = Math.pow(1 - t, 2) * this.fromPoint.x + 2 * t * (1 - t) * viaNode.x + Math.pow(t, 2) * this.toPoint.x;
      y = Math.pow(1 - t, 2) * this.fromPoint.y + 2 * t * (1 - t) * viaNode.y + Math.pow(t, 2) * this.toPoint.y;
    }

    return {x: x, y: y};
  }

  /**
   *
   * @param {Node} nearNode
   * @param {CanvasRenderingContext2D} ctx
   * @returns {*}
   * @private
   */
  _findBorderPosition(nearNode, ctx) {
    return this._findBorderPositionBezier(nearNode, ctx, this.via);
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
    return this._getDistanceToBezierEdge(x1, y1, x2, y2, x3, y3, this.via);
  }
}


export default BezierEdgeDynamic;
