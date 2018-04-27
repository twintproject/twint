let util = require('../../util');

var NetworkUtil = require('../NetworkUtil').default;

/**
 * The view
 */
class View {
  /**
   * @param {Object} body
   * @param {Canvas} canvas
   */
  constructor(body, canvas) {
    this.body = body;
    this.canvas = canvas;

    this.animationSpeed = 1/this.renderRefreshRate;
    this.animationEasingFunction = "easeInOutQuint";
    this.easingTime = 0;
    this.sourceScale = 0;
    this.targetScale = 0;
    this.sourceTranslation = 0;
    this.targetTranslation = 0;
    this.lockedOnNodeId = undefined;
    this.lockedOnNodeOffset = undefined;
    this.touchTime = 0;

    this.viewFunction = undefined;

    this.body.emitter.on("fit",                 this.fit.bind(this));
    this.body.emitter.on("animationFinished",   () => {this.body.emitter.emit("_stopRendering");});
    this.body.emitter.on("unlockNode",          this.releaseNode.bind(this));
  }

  /**
   *
   * @param {Object} [options={}]
   */
  setOptions(options = {}) {
    this.options = options;
  }


  /**
   * This function zooms out to fit all data on screen based on amount of nodes
   * @param {Object} [options={{nodes=Array}}]
   * @param {boolean} [initialZoom=false]  | zoom based on fitted formula or range, true = fitted, default = false;
   */
  fit(options = {nodes:[]}, initialZoom = false) {
    let range;
    let zoomLevel;
    if (options.nodes === undefined || options.nodes.length === 0) {
      options.nodes = this.body.nodeIndices;
    }


    if (initialZoom === true) {
      // check if more than half of the nodes have a predefined position. If so, we use the range, not the approximation.
      let positionDefined = 0;
      for (let nodeId in this.body.nodes) {
        if (this.body.nodes.hasOwnProperty(nodeId)) {
          let node = this.body.nodes[nodeId];
          if (node.predefinedPosition === true) {
            positionDefined += 1;
          }
        }
      }
      if (positionDefined > 0.5 * this.body.nodeIndices.length) {
        this.fit(options,false);
        return;
      }

      range = NetworkUtil.getRange(this.body.nodes, options.nodes);

      let numberOfNodes = this.body.nodeIndices.length;
      zoomLevel = 12.662 / (numberOfNodes + 7.4147) + 0.0964822; // this is obtained from fitting a dataset from 5 points with scale levels that looked good.

      // correct for larger canvasses.
      let factor = Math.min(this.canvas.frame.canvas.clientWidth / 600, this.canvas.frame.canvas.clientHeight / 600);
      zoomLevel *= factor;
    }
    else {
      this.body.emitter.emit("_resizeNodes");
      range = NetworkUtil.getRange(this.body.nodes, options.nodes);

      let xDistance = Math.abs(range.maxX - range.minX) * 1.1;
      let yDistance = Math.abs(range.maxY - range.minY) * 1.1;

      let xZoomLevel = this.canvas.frame.canvas.clientWidth  / xDistance;
      let yZoomLevel = this.canvas.frame.canvas.clientHeight / yDistance;

      zoomLevel = (xZoomLevel <= yZoomLevel) ? xZoomLevel : yZoomLevel;
    }

    if (zoomLevel > 1.0) {
      zoomLevel = 1.0;
    }
    else if (zoomLevel === 0) {
      zoomLevel = 1.0;
    }

    let center = NetworkUtil.findCenter(range);
    let animationOptions = {position: center, scale: zoomLevel, animation: options.animation};
    this.moveTo(animationOptions);
  }
  
  // animation

  /**
   * Center a node in view.
   *
   * @param {number} nodeId
   * @param {number} [options]
   */
  focus(nodeId, options = {}) {
    if (this.body.nodes[nodeId] !== undefined) {
      let nodePosition = {x: this.body.nodes[nodeId].x, y: this.body.nodes[nodeId].y};
      options.position = nodePosition;
      options.lockedOnNode = nodeId;

      this.moveTo(options)
    }
    else {
      console.log("Node: " + nodeId + " cannot be found.");
    }
  }

  /**
   *
   * @param {Object} options  |  options.offset   = {x:number, y:number}   // offset from the center in DOM pixels
   *                          |  options.scale    = number                 // scale to move to
   *                          |  options.position = {x:number, y:number}   // position to move to
   *                          |  options.animation = {duration:number, easingFunction:String} || Boolean   // position to move to
   */
  moveTo(options) {
    if (options === undefined) {
      options = {};
      return;
    }
    if (options.offset    === undefined)           {options.offset    = {x: 0, y: 0};    }
    if (options.offset.x  === undefined)           {options.offset.x  = 0;               }
    if (options.offset.y  === undefined)           {options.offset.y  = 0;               }
    if (options.scale     === undefined)           {options.scale     = this.body.view.scale;  }
    if (options.position  === undefined)           {options.position  = this.getViewPosition();}
    if (options.animation === undefined)           {options.animation = {duration:0};    }
    if (options.animation === false    )           {options.animation = {duration:0};    }
    if (options.animation === true     )           {options.animation = {};              }
    if (options.animation.duration === undefined)  {options.animation.duration = 1000;   }  // default duration
    if (options.animation.easingFunction === undefined)  {options.animation.easingFunction = "easeInOutQuad";  } // default easing function

    this.animateView(options);
  }

  /**
   *
   * @param {Object} options  |  options.offset   = {x:number, y:number}   // offset from the center in DOM pixels
   *                          |  options.time     = number                 // animation time in milliseconds
   *                          |  options.scale    = number                 // scale to animate to
   *                          |  options.position = {x:number, y:number}   // position to animate to
   *                          |  options.easingFunction = String           // linear, easeInQuad, easeOutQuad, easeInOutQuad,
   *                                                                       // easeInCubic, easeOutCubic, easeInOutCubic,
   *                                                                       // easeInQuart, easeOutQuart, easeInOutQuart,
   *                                                                       // easeInQuint, easeOutQuint, easeInOutQuint
   */
  animateView(options) {
    if (options === undefined) {
      return;
    }
    this.animationEasingFunction = options.animation.easingFunction;
    // release if something focussed on the node
    this.releaseNode();
    if (options.locked === true) {
      this.lockedOnNodeId = options.lockedOnNode;
      this.lockedOnNodeOffset = options.offset;
    }

    // forcefully complete the old animation if it was still running
    if (this.easingTime != 0) {
      this._transitionRedraw(true); // by setting easingtime to 1, we finish the animation.
    }

    this.sourceScale = this.body.view.scale;
    this.sourceTranslation = this.body.view.translation;
    this.targetScale = options.scale;

    // set the scale so the viewCenter is based on the correct zoom level. This is overridden in the transitionRedraw
    // but at least then we'll have the target transition
    this.body.view.scale = this.targetScale;
    let viewCenter = this.canvas.DOMtoCanvas({x: 0.5 * this.canvas.frame.canvas.clientWidth, y: 0.5 * this.canvas.frame.canvas.clientHeight});

    let distanceFromCenter = { // offset from view, distance view has to change by these x and y to center the node
      x: viewCenter.x - options.position.x,
      y: viewCenter.y - options.position.y
    };
    this.targetTranslation = {
      x: this.sourceTranslation.x + distanceFromCenter.x * this.targetScale + options.offset.x,
      y: this.sourceTranslation.y + distanceFromCenter.y * this.targetScale + options.offset.y
    };

    // if the time is set to 0, don't do an animation
    if (options.animation.duration === 0) {
      if (this.lockedOnNodeId != undefined) {
        this.viewFunction = this._lockedRedraw.bind(this);
        this.body.emitter.on("initRedraw", this.viewFunction);
      }
      else {
        this.body.view.scale = this.targetScale;
        this.body.view.translation = this.targetTranslation;
        this.body.emitter.emit("_requestRedraw");
      }
    }
    else {
      this.animationSpeed = 1 / (60 * options.animation.duration * 0.001) || 1 / 60; // 60 for 60 seconds, 0.001 for milli's
      this.animationEasingFunction = options.animation.easingFunction;


      this.viewFunction = this._transitionRedraw.bind(this);
      this.body.emitter.on("initRedraw", this.viewFunction);
      this.body.emitter.emit("_startRendering");
    }
  }

  /**
   * used to animate smoothly by hijacking the redraw function.
   * @private
   */
  _lockedRedraw() {
    let nodePosition = {x: this.body.nodes[this.lockedOnNodeId].x, y: this.body.nodes[this.lockedOnNodeId].y};
    let viewCenter = this.canvas.DOMtoCanvas({x: 0.5 * this.canvas.frame.canvas.clientWidth, y: 0.5 * this.canvas.frame.canvas.clientHeight});
    let distanceFromCenter = { // offset from view, distance view has to change by these x and y to center the node
      x: viewCenter.x - nodePosition.x,
      y: viewCenter.y - nodePosition.y
    };
    let sourceTranslation = this.body.view.translation;
    let targetTranslation = {
      x: sourceTranslation.x + distanceFromCenter.x * this.body.view.scale + this.lockedOnNodeOffset.x,
      y: sourceTranslation.y + distanceFromCenter.y * this.body.view.scale + this.lockedOnNodeOffset.y
    };

    this.body.view.translation = targetTranslation;
  }

  /**
   * Resets state of a locked on Node
   */
  releaseNode() {
    if (this.lockedOnNodeId !== undefined && this.viewFunction !== undefined) {
      this.body.emitter.off("initRedraw", this.viewFunction);
      this.lockedOnNodeId = undefined;
      this.lockedOnNodeOffset = undefined;
    }
  }

  /**
   * @param {boolean} [finished=false]
   * @private
   */
  _transitionRedraw(finished = false) {
    this.easingTime += this.animationSpeed;
    this.easingTime = finished === true ? 1.0 : this.easingTime;

    let progress = util.easingFunctions[this.animationEasingFunction](this.easingTime);

    this.body.view.scale = this.sourceScale + (this.targetScale - this.sourceScale) * progress;
    this.body.view.translation = {
      x: this.sourceTranslation.x + (this.targetTranslation.x - this.sourceTranslation.x) * progress,
      y: this.sourceTranslation.y + (this.targetTranslation.y - this.sourceTranslation.y) * progress
    };

    // cleanup
    if (this.easingTime >= 1.0) {
      this.body.emitter.off("initRedraw", this.viewFunction);
      this.easingTime = 0;
      if (this.lockedOnNodeId != undefined) {
        this.viewFunction = this._lockedRedraw.bind(this);
        this.body.emitter.on("initRedraw", this.viewFunction);
      }
      this.body.emitter.emit("animationFinished");
    }
  }


  /**
   *
   * @returns {number}
   */
  getScale() {
    return this.body.view.scale;
  }

  /**
   *
   * @returns {{x: number, y: number}}
   */
  getViewPosition() {
    return this.canvas.DOMtoCanvas({x: 0.5 * this.canvas.frame.canvas.clientWidth, y: 0.5 * this.canvas.frame.canvas.clientHeight});
  }


}

export default View;