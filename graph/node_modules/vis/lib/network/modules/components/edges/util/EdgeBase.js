let util = require("../../../../../util");
let EndPoints = require("./EndPoints").default;


/**
 * The Base Class for all edges.
 *
 */
class EdgeBase {
  /**
   * @param {Object} options
   * @param {Object} body
   * @param {Label} labelModule
   */
  constructor(options, body, labelModule) {
    this.body = body;
    this.labelModule = labelModule;
    this.options = {};
    this.setOptions(options);
    this.colorDirty = true;
    this.color = {};
    this.selectionWidth = 2;
    this.hoverWidth = 1.5;
    this.fromPoint = this.from;
    this.toPoint = this.to;
  }

  /**
   * Connects a node to itself
   */
  connect() {
    this.from = this.body.nodes[this.options.from];
    this.to = this.body.nodes[this.options.to];
  }

  /**
   *
   * @returns {boolean} always false
   */
  cleanup() {
    return false;
  }

  /**
   *
   * @param {Object} options
   */
  setOptions(options) {
    this.options = options;
    this.from = this.body.nodes[this.options.from];
    this.to = this.body.nodes[this.options.to];
    this.id = this.options.id;
  }

  /**
   * Redraw a edge as a line
   * Draw this edge in the given canvas
   * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
   *
   * @param {CanvasRenderingContext2D}   ctx
   * @param {Array} values
   * @param {boolean} selected
   * @param {boolean} hover
   * @param {Node} viaNode
   * @private
   */
  drawLine(ctx, values, selected, hover, viaNode) {
    // set style
    ctx.strokeStyle = this.getColor(ctx, values, selected, hover);
    ctx.lineWidth = values.width;

    if (values.dashes !== false) {
      this._drawDashedLine(ctx, values, viaNode);
    }
    else {
      this._drawLine(ctx, values, viaNode);
    }
  }


  /**
   *
   * @param {CanvasRenderingContext2D}   ctx
   * @param {Array} values
   * @param {Node} viaNode
   * @param {{x: number, y: number}} [fromPoint]
   * @param {{x: number, y: number}} [toPoint]
   * @private
   */
  _drawLine(ctx, values, viaNode, fromPoint, toPoint) {
    if (this.from != this.to) {
      // draw line
      this._line(ctx, values, viaNode, fromPoint, toPoint);
    }
    else {
      let [x,y,radius] = this._getCircleData(ctx);
      this._circle(ctx, values, x, y, radius);
    }
  }

  /**
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {Array} values
   * @param {Node} viaNode
   * @param {{x: number, y: number}} [fromPoint]  TODO: Remove in next major release
   * @param {{x: number, y: number}} [toPoint]    TODO: Remove in next major release
   * @private
   */
  _drawDashedLine(ctx, values, viaNode, fromPoint, toPoint) {  // eslint-disable-line no-unused-vars
    ctx.lineCap = 'round';
    let pattern = [5,5];
    if (Array.isArray(values.dashes) === true) {
      pattern = values.dashes;
    }

    // only firefox and chrome support this method, else we use the legacy one.
    if (ctx.setLineDash !== undefined) {
      ctx.save();

      // set dash settings for chrome or firefox
      ctx.setLineDash(pattern);
      ctx.lineDashOffset = 0;

      // draw the line
      if (this.from != this.to) {
        // draw line
        this._line(ctx, values, viaNode);
      }
      else {
        let [x,y,radius] = this._getCircleData(ctx);
        this._circle(ctx, values, x, y, radius);
      }

      // restore the dash settings.
      ctx.setLineDash([0]);
      ctx.lineDashOffset = 0;
      ctx.restore();
    }
    else { // unsupporting smooth lines
      if (this.from != this.to) {
        // draw line
        ctx.dashedLine(this.from.x, this.from.y, this.to.x, this.to.y, pattern);
      }
      else {
        let [x,y,radius] = this._getCircleData(ctx);
        this._circle(ctx, values, x, y, radius);
      }
      // draw shadow if enabled
      this.enableShadow(ctx, values);

      ctx.stroke();

      // disable shadows for other elements.
      this.disableShadow(ctx, values);
    }
  }


  /**
   *
   * @param {Node} nearNode
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} options
   * @returns {{x: number, y: number}}
   */
  findBorderPosition(nearNode, ctx, options) {
    if (this.from != this.to) {
      return this._findBorderPosition(nearNode, ctx, options);
    }
    else {
      return this._findBorderPositionCircle(nearNode, ctx, options);
    }
  }

  /**
   *
   * @param {CanvasRenderingContext2D} ctx
   * @returns {{from: ({x: number, y: number, t: number}|*), to: ({x: number, y: number, t: number}|*)}}
   */
  findBorderPositions(ctx) {
    let from = {};
    let to = {};
    if (this.from != this.to) {
      from = this._findBorderPosition(this.from, ctx);
      to = this._findBorderPosition(this.to, ctx);
    }
    else {
      let [x,y] = this._getCircleData(ctx).slice(0, 2);

      from = this._findBorderPositionCircle(this.from, ctx, {x, y, low:0.25, high:0.6, direction:-1});
      to = this._findBorderPositionCircle(this.from, ctx, {x, y, low:0.6, high:0.8, direction:1});
    }
    return {from, to};
  }

  /**
   *
   * @param {CanvasRenderingContext2D} ctx
   * @returns {Array.<number>} x, y, radius
   * @private
   */
  _getCircleData(ctx) {
    let x, y;
    let node = this.from;
    let radius = this.options.selfReferenceSize;

    if (ctx !== undefined) {
      if (node.shape.width === undefined) {
        node.shape.resize(ctx);
      }
    }

    // get circle coordinates
    if (node.shape.width > node.shape.height) {
      x = node.x + node.shape.width * 0.5;
      y = node.y - radius;
    }
    else {
      x = node.x + radius;
      y = node.y - node.shape.height * 0.5;
    }
    return [x,y,radius];
  }

  /**
   * Get a point on a circle
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   * @param {number} percentage - Value between 0 (line start) and 1 (line end)
   * @return {Object} point
   * @private
   */
  _pointOnCircle(x, y, radius, percentage) {
    let angle = percentage * 2 * Math.PI;
    return {
      x: x + radius * Math.cos(angle),
      y: y - radius * Math.sin(angle)
    }
  }

  /**
   * This function uses binary search to look for the point where the circle crosses the border of the node.
   * @param {Node} node
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} options
   * @returns {*}
   * @private
   */
  _findBorderPositionCircle(node, ctx, options) {
    let x = options.x;
    let y = options.y;
    let low = options.low;
    let high = options.high;
    let direction = options.direction;

    let maxIterations = 10;
    let iteration = 0;
    let radius = this.options.selfReferenceSize;
    let pos, angle, distanceToBorder, distanceToPoint, difference;
    let threshold = 0.05;
    let middle = (low + high) * 0.5;

    while (low <= high && iteration < maxIterations) {
      middle = (low + high) * 0.5;

      pos = this._pointOnCircle(x, y, radius, middle);
      angle = Math.atan2((node.y - pos.y), (node.x - pos.x));
      distanceToBorder = node.distanceToBorder(ctx, angle);
      distanceToPoint = Math.sqrt(Math.pow(pos.x - node.x, 2) + Math.pow(pos.y - node.y, 2));
      difference = distanceToBorder - distanceToPoint;
      if (Math.abs(difference) < threshold) {
        break; // found
      }
      else if (difference > 0) { // distance to nodes is larger than distance to border --> t needs to be bigger if we're looking at the to node.
        if (direction > 0) {
          low = middle;
        }
        else {
          high = middle;
        }
      }
      else {
        if (direction > 0) {
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
   * Get the line width of the edge. Depends on width and whether one of the
   * connected nodes is selected.
   * @param {boolean} selected
   * @param {boolean} hover
   * @returns {number} width
   * @private
   */
  getLineWidth(selected, hover) {
    if (selected === true) {
      return Math.max(this.selectionWidth, 0.3 / this.body.view.scale);
    }
    else {
      if (hover === true) {
        return Math.max(this.hoverWidth, 0.3 / this.body.view.scale);
      }
      else {
        return Math.max(this.options.width, 0.3 / this.body.view.scale);
      }
    }
  }

  /**
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {{toArrow: boolean, toArrowScale: (allOptions.edges.arrows.to.scaleFactor|{number}|allOptions.edges.arrows.middle.scaleFactor|allOptions.edges.arrows.from.scaleFactor|Array|number), toArrowType: *, middleArrow: boolean, middleArrowScale: (number|allOptions.edges.arrows.middle.scaleFactor|{number}|Array), middleArrowType: (allOptions.edges.arrows.middle.type|{string}|string|*), fromArrow: boolean, fromArrowScale: (allOptions.edges.arrows.to.scaleFactor|{number}|allOptions.edges.arrows.middle.scaleFactor|allOptions.edges.arrows.from.scaleFactor|Array|number), fromArrowType: *, arrowStrikethrough: (*|boolean|allOptions.edges.arrowStrikethrough|{boolean}), color: undefined, inheritsColor: (string|string|string|allOptions.edges.color.inherit|{string, boolean}|Array|*), opacity: *, hidden: *, length: *, shadow: *, shadowColor: *, shadowSize: *, shadowX: *, shadowY: *, dashes: (*|boolean|Array|allOptions.edges.dashes|{boolean, array}), width: *}} values
   * @param {boolean} selected - Unused
   * @param {boolean} hover - Unused
   * @returns {string}
   */
  getColor(ctx, values, selected, hover) {  // eslint-disable-line no-unused-vars
    if (values.inheritsColor !== false) {
      // when this is a loop edge, just use the 'from' method
      if ((values.inheritsColor === 'both') && (this.from.id !== this.to.id)) {
        let grd = ctx.createLinearGradient(this.from.x, this.from.y, this.to.x, this.to.y);
        let fromColor, toColor;
        fromColor = this.from.options.color.highlight.border;
        toColor = this.to.options.color.highlight.border;

        if ((this.from.selected === false) && (this.to.selected === false)) {
          fromColor = util.overrideOpacity(this.from.options.color.border, values.opacity);
          toColor = util.overrideOpacity(this.to.options.color.border, values.opacity);
        }
        else if ((this.from.selected === true) && (this.to.selected === false)) {
          toColor = this.to.options.color.border;
        }
        else if ((this.from.selected === false) && (this.to.selected === true)) {
          fromColor = this.from.options.color.border;
        }
        grd.addColorStop(0, fromColor);
        grd.addColorStop(1, toColor);

        // -------------------- this returns -------------------- //
        return grd;
      }

      if (values.inheritsColor === "to") {
        return util.overrideOpacity(this.to.options.color.border, values.opacity);
      } else { // "from"
        return util.overrideOpacity(this.from.options.color.border, values.opacity);
      }
    } else {
      return util.overrideOpacity(values.color, values.opacity);
    }
  }

  /**
   * Draw a line from a node to itself, a circle
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {Array} values
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   * @private
   */
  _circle(ctx, values, x, y, radius) {
    // draw shadow if enabled
    this.enableShadow(ctx, values);

    // draw a circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
    ctx.stroke();

    // disable shadows for other elements.
    this.disableShadow(ctx, values);
  }


  /**
   * Calculate the distance between a point (x3,y3) and a line segment from (x1,y1) to (x2,y2).
   * (x3,y3) is the point.
   *
   * http://stackoverflow.com/questions/849211/shortest-distancae-between-a-point-and-a-line-segment
   *
   * @param {number} x1
   * @param {number} y1
   * @param {number} x2
   * @param {number} y2
   * @param {number} x3
   * @param {number} y3
   * @param {Node} via
   * @param {Array} values
   * @returns {number}
   */
  getDistanceToEdge(x1, y1, x2, y2, x3, y3, via, values) {  // eslint-disable-line no-unused-vars
    let returnValue = 0;
    if (this.from != this.to) {
      returnValue = this._getDistanceToEdge(x1, y1, x2, y2, x3, y3, via)
    }
    else {
      let [x,y,radius] = this._getCircleData(undefined);
      let dx = x - x3;
      let dy = y - y3;
      returnValue = Math.abs(Math.sqrt(dx * dx + dy * dy) - radius);
    }

    return returnValue;
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
  _getDistanceToLine(x1, y1, x2, y2, x3, y3) {
    let px = x2 - x1;
    let py = y2 - y1;
    let something = px * px + py * py;
    let u = ((x3 - x1) * px + (y3 - y1) * py) / something;

    if (u > 1) {
      u = 1;
    }
    else if (u < 0) {
      u = 0;
    }

    let x = x1 + u * px;
    let y = y1 + u * py;
    let dx = x - x3;
    let dy = y - y3;

    //# Note: If the actual distance does not matter,
    //# if you only want to compare what this function
    //# returns to other results of this function, you
    //# can just return the squared distance instead
    //# (i.e. remove the sqrt) to gain a little performance

    return Math.sqrt(dx * dx + dy * dy);
  }


  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} position
   * @param {Node} viaNode
   * @param {boolean} selected
   * @param {boolean} hover
   * @param {Array} values
   * @returns {{point: *, core: {x: number, y: number}, angle: *, length: number, type: *}}
   */
  getArrowData(ctx, position, viaNode, selected, hover, values) {
    // set lets
    let angle;
    let arrowPoint;
    let node1;
    let node2;
    let guideOffset;
    let scaleFactor;
    let type;
    let lineWidth = values.width;

    if (position === 'from') {
      node1 = this.from;
      node2 = this.to;
      guideOffset = 0.1;
      scaleFactor = values.fromArrowScale;
      type = values.fromArrowType;
    }
    else if (position === 'to') {
      node1 = this.to;
      node2 = this.from;
      guideOffset = -0.1;
      scaleFactor = values.toArrowScale;
      type = values.toArrowType;
    }
    else {
      node1 = this.to;
      node2 = this.from;
      scaleFactor = values.middleArrowScale;
      type = values.middleArrowType;
    }

    // if not connected to itself
    if (node1 != node2) {
      if (position !== 'middle') {
        // draw arrow head
        if (this.options.smooth.enabled === true) {
          arrowPoint = this.findBorderPosition(node1, ctx, { via: viaNode });
          let guidePos = this.getPoint(Math.max(0.0, Math.min(1.0, arrowPoint.t + guideOffset)), viaNode);
          angle = Math.atan2((arrowPoint.y - guidePos.y), (arrowPoint.x - guidePos.x));
        } else {
          angle = Math.atan2((node1.y - node2.y), (node1.x - node2.x));
          arrowPoint = this.findBorderPosition(node1, ctx);
        }
      } else {
        angle = Math.atan2((node1.y - node2.y), (node1.x - node2.x));
        arrowPoint = this.getPoint(0.5, viaNode); // this is 0.6 to account for the size of the arrow.
      }
    } else {
      // draw circle
      let [x,y,radius] = this._getCircleData(ctx);

      if (position === 'from') {
        arrowPoint = this.findBorderPosition(this.from, ctx, { x, y, low: 0.25, high: 0.6, direction: -1 });
        angle = arrowPoint.t * -2 * Math.PI + 1.5 * Math.PI + 0.1 * Math.PI;
      } else if (position === 'to') {
        arrowPoint = this.findBorderPosition(this.from, ctx, { x, y, low: 0.6, high: 1.0, direction: 1 });
        angle = arrowPoint.t * -2 * Math.PI + 1.5 * Math.PI - 1.1 * Math.PI;
      } else {
        arrowPoint = this._pointOnCircle(x, y, radius, 0.175);
        angle = 3.9269908169872414; // === 0.175 * -2 * Math.PI + 1.5 * Math.PI + 0.1 * Math.PI;
      }
    }

    if (position === 'middle' && scaleFactor < 0) lineWidth *= -1; // reversed middle arrow
    let length = 15 * scaleFactor + 3 * lineWidth; // 3* lineWidth is the width of the edge.

    var xi = arrowPoint.x - length * 0.9 * Math.cos(angle);
    var yi = arrowPoint.y - length * 0.9 * Math.sin(angle);
    let arrowCore = { x: xi, y: yi };

    return { point: arrowPoint, core: arrowCore, angle: angle, length: length, type: type };
  }

  /**
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {{toArrow: boolean, toArrowScale: (allOptions.edges.arrows.to.scaleFactor|{number}|allOptions.edges.arrows.middle.scaleFactor|allOptions.edges.arrows.from.scaleFactor|Array|number), toArrowType: *, middleArrow: boolean, middleArrowScale: (number|allOptions.edges.arrows.middle.scaleFactor|{number}|Array), middleArrowType: (allOptions.edges.arrows.middle.type|{string}|string|*), fromArrow: boolean, fromArrowScale: (allOptions.edges.arrows.to.scaleFactor|{number}|allOptions.edges.arrows.middle.scaleFactor|allOptions.edges.arrows.from.scaleFactor|Array|number), fromArrowType: *, arrowStrikethrough: (*|boolean|allOptions.edges.arrowStrikethrough|{boolean}), color: undefined, inheritsColor: (string|string|string|allOptions.edges.color.inherit|{string, boolean}|Array|*), opacity: *, hidden: *, length: *, shadow: *, shadowColor: *, shadowSize: *, shadowX: *, shadowY: *, dashes: (*|boolean|Array|allOptions.edges.dashes|{boolean, array}), width: *}} values
   * @param {boolean} selected
   * @param {boolean} hover
   * @param {Object} arrowData
   */
  drawArrowHead(ctx, values, selected, hover, arrowData) {
    // set style
    ctx.strokeStyle = this.getColor(ctx, values, selected, hover);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = values.width;

    EndPoints.draw(ctx, arrowData);

    // draw shadow if enabled
    this.enableShadow(ctx, values);
    ctx.fill();
    // disable shadows for other elements.
    this.disableShadow(ctx, values);
  }


  /**
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {{toArrow: boolean, toArrowScale: (allOptions.edges.arrows.to.scaleFactor|{number}|allOptions.edges.arrows.middle.scaleFactor|allOptions.edges.arrows.from.scaleFactor|Array|number), toArrowType: *, middleArrow: boolean, middleArrowScale: (number|allOptions.edges.arrows.middle.scaleFactor|{number}|Array), middleArrowType: (allOptions.edges.arrows.middle.type|{string}|string|*), fromArrow: boolean, fromArrowScale: (allOptions.edges.arrows.to.scaleFactor|{number}|allOptions.edges.arrows.middle.scaleFactor|allOptions.edges.arrows.from.scaleFactor|Array|number), fromArrowType: *, arrowStrikethrough: (*|boolean|allOptions.edges.arrowStrikethrough|{boolean}), color: undefined, inheritsColor: (string|string|string|allOptions.edges.color.inherit|{string, boolean}|Array|*), opacity: *, hidden: *, length: *, shadow: *, shadowColor: *, shadowSize: *, shadowX: *, shadowY: *, dashes: (*|boolean|Array|allOptions.edges.dashes|{boolean, array}), width: *}} values
   */
  enableShadow(ctx, values) {
    if (values.shadow === true) {
      ctx.shadowColor = values.shadowColor;
      ctx.shadowBlur = values.shadowSize;
      ctx.shadowOffsetX = values.shadowX;
      ctx.shadowOffsetY = values.shadowY;
    }
  }

  /**
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {{toArrow: boolean, toArrowScale: (allOptions.edges.arrows.to.scaleFactor|{number}|allOptions.edges.arrows.middle.scaleFactor|allOptions.edges.arrows.from.scaleFactor|Array|number), toArrowType: *, middleArrow: boolean, middleArrowScale: (number|allOptions.edges.arrows.middle.scaleFactor|{number}|Array), middleArrowType: (allOptions.edges.arrows.middle.type|{string}|string|*), fromArrow: boolean, fromArrowScale: (allOptions.edges.arrows.to.scaleFactor|{number}|allOptions.edges.arrows.middle.scaleFactor|allOptions.edges.arrows.from.scaleFactor|Array|number), fromArrowType: *, arrowStrikethrough: (*|boolean|allOptions.edges.arrowStrikethrough|{boolean}), color: undefined, inheritsColor: (string|string|string|allOptions.edges.color.inherit|{string, boolean}|Array|*), opacity: *, hidden: *, length: *, shadow: *, shadowColor: *, shadowSize: *, shadowX: *, shadowY: *, dashes: (*|boolean|Array|allOptions.edges.dashes|{boolean, array}), width: *}} values
   */
  disableShadow(ctx, values) {
    if (values.shadow === true) {
      ctx.shadowColor = 'rgba(0,0,0,0)';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
  }
}

export default EdgeBase;
