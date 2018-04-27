/**
 * Initializes window.requestAnimationFrame() to a usable form.
 *
 * Specifically, set up this method for the case of running on node.js with jsdom enabled.
 *
 * NOTES:
 *
 * * On node.js, when calling this directly outside of this class, `window` is not defined.
 *   This happens even if jsdom is used.
 * * For node.js + jsdom, `window` is available at the moment the constructor is called.
 *   For this reason, the called is placed within the constructor.
 * * Even then, `window.requestAnimationFrame()` is not defined, so it still needs to be added.
 * * During unit testing, it happens that the window object is reset during execution, causing
 *   a runtime error due to missing `requestAnimationFrame()`. This needs to be compensated for,
 *   see `_requestNextFrame()`.
 * * Since this is a global object, it may affect other modules besides `Network`. With normal
 *   usage, this does not cause any problems. During unit testing, errors may occur. These have
 *   been compensated for, see comment block in _requestNextFrame().
 *
 * @private
 */
function _initRequestAnimationFrame() {
  var func;

  if (window !== undefined) {
    func = window.requestAnimationFrame
        || window.mozRequestAnimationFrame
        || window.webkitRequestAnimationFrame
        || window.msRequestAnimationFrame;
  }

  if (func === undefined) {
    // window or method not present, setting mock requestAnimationFrame
    window.requestAnimationFrame =
     function(callback) {
       //console.log("Called mock requestAnimationFrame");
       callback();
     }
  } else {
     window.requestAnimationFrame = func;
  }
}

let util = require('../../util');

/**
 * The canvas renderer
 */
class CanvasRenderer {
  /**
   * @param {Object} body
   * @param {Canvas} canvas
   */
  constructor(body, canvas) {
    _initRequestAnimationFrame();
    this.body = body;
    this.canvas = canvas;

    this.redrawRequested = false;
    this.renderTimer = undefined;
    this.requiresTimeout = true;
    this.renderingActive = false;
    this.renderRequests = 0;
    this.allowRedraw = true;

    this.dragging = false;
    this.options = {};
    this.defaultOptions = {
      hideEdgesOnDrag: false,
      hideNodesOnDrag: false
    };
    util.extend(this.options, this.defaultOptions);

    this._determineBrowserMethod();
    this.bindEventListeners();
  }

  /**
   * Binds event listeners
   */
  bindEventListeners() {
    this.body.emitter.on("dragStart", () => { this.dragging = true; });
    this.body.emitter.on("dragEnd", () => { this.dragging = false; });
    this.body.emitter.on("_resizeNodes", () => { this._resizeNodes(); });
    this.body.emitter.on("_redraw", () => {
      if (this.renderingActive === false) {
        this._redraw();
      }
    });
    this.body.emitter.on("_blockRedraw", () => {this.allowRedraw = false;});
    this.body.emitter.on("_allowRedraw", () => {this.allowRedraw = true; this.redrawRequested = false;});
    this.body.emitter.on("_requestRedraw", this._requestRedraw.bind(this));
    this.body.emitter.on("_startRendering", () => {
      this.renderRequests += 1;
      this.renderingActive = true;
      this._startRendering();
    });
    this.body.emitter.on("_stopRendering", () => {
      this.renderRequests -= 1;
      this.renderingActive = this.renderRequests > 0;
      this.renderTimer = undefined;
    });
    this.body.emitter.on('destroy',  () => {
      this.renderRequests = 0;
      this.allowRedraw = false;
      this.renderingActive = false;
      if (this.requiresTimeout === true) {
        clearTimeout(this.renderTimer);
      }
      else {
        window.cancelAnimationFrame(this.renderTimer);
      }
      this.body.emitter.off();
    });

  }

  /**
   *
   * @param {Object} options
   */
  setOptions(options) {
    if (options !== undefined) {
      let fields = ['hideEdgesOnDrag','hideNodesOnDrag'];
      util.selectiveDeepExtend(fields,this.options, options);
    }
  }


  /**
   * Prepare the drawing of the next frame.
   *
   * Calls the callback when the next frame can or will be drawn.
   *
   * @param {function} callback
   * @param {number} delay - timeout case only, wait this number of milliseconds
   * @returns {function|undefined}
   * @private
   */
  _requestNextFrame(callback, delay) { 
    // During unit testing, it happens that the mock window object is reset while
    // the next frame is still pending. Then, either 'window' is not present, or
    // 'requestAnimationFrame()' is not present because it is not defined on the
    // mock window object.
    //
    // As a consequence, unrelated unit tests may appear to fail, even if the problem
    // described happens in the current unit test.
    //
    // This is not something that will happen in normal operation, but we still need
    // to take it into account.
    //
    if (typeof window === 'undefined') return;  // Doing `if (window === undefined)` does not work here!

    let timer;

    var myWindow = window;  // Grab a reference to reduce the possibility that 'window' is reset
                            // while running this method.

    if (this.requiresTimeout === true) {
      // wait given number of milliseconds and perform the animation step function
      timer = myWindow.setTimeout(callback, delay);
    } else {
      if (myWindow.requestAnimationFrame) {
        timer = myWindow.requestAnimationFrame(callback);
      }
    }

    return timer;
  }

  /**
   *
   * @private
   */
  _startRendering() {
    if (this.renderingActive === true) {
      if (this.renderTimer === undefined) {
        this.renderTimer = this._requestNextFrame(this._renderStep.bind(this), this.simulationInterval);
      }
    }
  }

  /**
   *
   * @private
   */
  _renderStep() {
    if (this.renderingActive === true) {
      // reset the renderTimer so a new scheduled animation step can be set
      this.renderTimer = undefined;

      if (this.requiresTimeout === true) {
        // this schedules a new simulation step
        this._startRendering();
      }

      this._redraw();

      if (this.requiresTimeout === false) {
        // this schedules a new simulation step
        this._startRendering();
      }
    }
  }

  /**
   * Redraw the network with the current data
   * chart will be resized too.
   */
  redraw() {
    this.body.emitter.emit('setSize');
    this._redraw();
  }

  /**
   * Redraw the network with the current data
   * @private
   */
  _requestRedraw() {
    if (this.redrawRequested !== true && this.renderingActive === false && this.allowRedraw === true) {
      this.redrawRequested = true;
      this._requestNextFrame(() => {this._redraw(false);}, 0);
    }
  }

  /**
   * Redraw the network with the current data
   * @param {boolean} [hidden=false] | Used to get the first estimate of the node sizes.
   *                                   Only the nodes are drawn after which they are quickly drawn over.
   * @private
   */
  _redraw(hidden = false) {
    if (this.allowRedraw === true) {
      this.body.emitter.emit("initRedraw");

      this.redrawRequested = false;

      // when the container div was hidden, this fixes it back up!
      if (this.canvas.frame.canvas.width === 0 || this.canvas.frame.canvas.height === 0) {
        this.canvas.setSize();
      }

      this.canvas.setTransform();

      let ctx = this.canvas.getContext();

      // clear the canvas
      let w = this.canvas.frame.canvas.clientWidth;
      let h = this.canvas.frame.canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      // if the div is hidden, we stop the redraw here for performance.
      if (this.canvas.frame.clientWidth === 0) {
        return;
      }

      // set scaling and translation
      ctx.save();
      ctx.translate(this.body.view.translation.x, this.body.view.translation.y);
      ctx.scale(this.body.view.scale, this.body.view.scale);

      ctx.beginPath();
      this.body.emitter.emit("beforeDrawing", ctx);
      ctx.closePath();

      if (hidden === false) {
        if (this.dragging === false || (this.dragging === true && this.options.hideEdgesOnDrag === false)) {
          this._drawEdges(ctx);
        }
      }

      if (this.dragging === false || (this.dragging === true && this.options.hideNodesOnDrag === false)) {
        this._drawNodes(ctx, hidden);
      }

      ctx.beginPath();
      this.body.emitter.emit("afterDrawing", ctx);
      ctx.closePath();


      // restore original scaling and translation
      ctx.restore();
      if (hidden === true) {
        ctx.clearRect(0, 0, w, h);
      }
    }
  }


  /**
   * Redraw all nodes
   *
   * @param {CanvasRenderingContext2D}   ctx
   * @param {boolean} [alwaysShow]
   * @private
   */
  _resizeNodes() {
    this.canvas.setTransform();
    let ctx = this.canvas.getContext();
    ctx.save();
    ctx.translate(this.body.view.translation.x, this.body.view.translation.y);
    ctx.scale(this.body.view.scale, this.body.view.scale);

    let nodes = this.body.nodes;
    let node;

    // resize all nodes
    for (let nodeId in nodes) {
      if (nodes.hasOwnProperty(nodeId)) {
        node = nodes[nodeId];
        node.resize(ctx);
        node.updateBoundingBox(ctx, node.selected);
      }
    }

    // restore original scaling and translation
    ctx.restore();
  }

  /**
   * Redraw all nodes
   *
   * @param {CanvasRenderingContext2D} ctx  2D context of a HTML canvas
   * @param {boolean} [alwaysShow]
   * @private
   */
  _drawNodes(ctx, alwaysShow = false) {
    let nodes = this.body.nodes;
    let nodeIndices = this.body.nodeIndices;
    let node;
    let selected = [];
    let margin = 20;
    let topLeft = this.canvas.DOMtoCanvas({x:-margin,y:-margin});
    let bottomRight = this.canvas.DOMtoCanvas({
      x: this.canvas.frame.canvas.clientWidth+margin,
      y: this.canvas.frame.canvas.clientHeight+margin
    });
    let viewableArea = {top:topLeft.y,left:topLeft.x,bottom:bottomRight.y,right:bottomRight.x};

    // draw unselected nodes;
    for (let i = 0; i < nodeIndices.length; i++) {
      node = nodes[nodeIndices[i]];
      // set selected nodes aside
      if (node.isSelected()) {
        selected.push(nodeIndices[i]);
      }
      else {
        if (alwaysShow === true) {
          node.draw(ctx);
        }
        else if (node.isBoundingBoxOverlappingWith(viewableArea) === true) {
          node.draw(ctx);
        }
        else {
          node.updateBoundingBox(ctx, node.selected);
        }
      }
    }

    // draw the selected nodes on top
    for (let i = 0; i < selected.length; i++) {
      node = nodes[selected[i]];
      node.draw(ctx);
    }
  }


  /**
   * Redraw all edges
   * @param {CanvasRenderingContext2D} ctx  2D context of a HTML canvas
   * @private
   */
  _drawEdges(ctx) {
    let edges = this.body.edges;
    let edgeIndices = this.body.edgeIndices;
    let edge;

    for (let i = 0; i < edgeIndices.length; i++) {
      edge = edges[edgeIndices[i]];
      if (edge.connected === true) {
        edge.draw(ctx);
      }
    }
  }

  /**
   * Determine if the browser requires a setTimeout or a requestAnimationFrame. This was required because
   * some implementations (safari and IE9) did not support requestAnimationFrame
   * @private
   */
  _determineBrowserMethod() {
    if (typeof window !== 'undefined') {
      let browserType = navigator.userAgent.toLowerCase();
      this.requiresTimeout = false;
      if (browserType.indexOf('msie 9.0') != -1) { // IE 9
        this.requiresTimeout = true;
      }
      else if (browserType.indexOf('safari') != -1) {  // safari
        if (browserType.indexOf('chrome') <= -1) {
          this.requiresTimeout = true;
        }
      }
    }
    else {
      this.requiresTimeout = true;
    }
  }
}

export default CanvasRenderer;
