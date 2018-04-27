let util = require('../../util');
var NavigationHandler = require('./components/NavigationHandler').default;
var Popup = require('./../../shared/Popup').default;


/**
 * Handler for interactions
 */
class InteractionHandler {
  /**
   * @param {Object} body
   * @param {Canvas} canvas
   * @param {SelectionHandler} selectionHandler
   */
  constructor(body, canvas, selectionHandler) {
    this.body = body;
    this.canvas = canvas;
    this.selectionHandler = selectionHandler;
    this.navigationHandler = new NavigationHandler(body,canvas);

    // bind the events from hammer to functions in this object
    this.body.eventListeners.onTap        = this.onTap.bind(this);
    this.body.eventListeners.onTouch      = this.onTouch.bind(this);
    this.body.eventListeners.onDoubleTap  = this.onDoubleTap.bind(this);
    this.body.eventListeners.onHold       = this.onHold.bind(this);
    this.body.eventListeners.onDragStart  = this.onDragStart.bind(this);
    this.body.eventListeners.onDrag       = this.onDrag.bind(this);
    this.body.eventListeners.onDragEnd    = this.onDragEnd.bind(this);
    this.body.eventListeners.onMouseWheel = this.onMouseWheel.bind(this);
    this.body.eventListeners.onPinch      = this.onPinch.bind(this);
    this.body.eventListeners.onMouseMove  = this.onMouseMove.bind(this);
    this.body.eventListeners.onRelease    = this.onRelease.bind(this);
    this.body.eventListeners.onContext    = this.onContext.bind(this);

    this.touchTime = 0;
    this.drag = {};
    this.pinch = {};
    this.popup = undefined;
    this.popupObj = undefined;
    this.popupTimer = undefined;

    this.body.functions.getPointer = this.getPointer.bind(this);

    this.options = {};
    this.defaultOptions = {
      dragNodes:true,
      dragView: true,
      hover: false,
      keyboard: {
        enabled: false,
        speed: {x: 10, y: 10, zoom: 0.02},
        bindToWindow: true
      },
      navigationButtons: false,
      tooltipDelay: 300,
      zoomView: true
    };
    util.extend(this.options,this.defaultOptions);

    this.bindEventListeners()
  }

  /**
   * Binds event listeners
   */
  bindEventListeners() {
    this.body.emitter.on('destroy', () => {
      clearTimeout(this.popupTimer);
      delete this.body.functions.getPointer;
    })
  }

  /**
   *
   * @param {Object} options
   */
  setOptions(options) {
    if (options !== undefined) {
      // extend all but the values in fields
      let fields = ['hideEdgesOnDrag','hideNodesOnDrag','keyboard','multiselect','selectable','selectConnectedEdges'];
      util.selectiveNotDeepExtend(fields, this.options, options);

      // merge the keyboard options in.
      util.mergeOptions(this.options, options, 'keyboard');

      if (options.tooltip) {
        util.extend(this.options.tooltip, options.tooltip);
        if (options.tooltip.color) {
          this.options.tooltip.color = util.parseColor(options.tooltip.color);
        }
      }
    }

    this.navigationHandler.setOptions(this.options);
  }


  /**
   * Get the pointer location from a touch location
   * @param {{x: number, y: number}} touch
   * @return {{x: number, y: number}} pointer
   * @private
   */
  getPointer(touch) {
    return {
      x: touch.x - util.getAbsoluteLeft(this.canvas.frame.canvas),
      y: touch.y - util.getAbsoluteTop(this.canvas.frame.canvas)
    };
  }


  /**
   * On start of a touch gesture, store the pointer
   * @param {Event}  event   The event
   * @private
   */
  onTouch(event) {
    if (new Date().valueOf() - this.touchTime > 50) {
      this.drag.pointer = this.getPointer(event.center);
      this.drag.pinched = false;
      this.pinch.scale = this.body.view.scale;
      // to avoid double fireing of this event because we have two hammer instances. (on canvas and on frame)
      this.touchTime = new Date().valueOf();
    }
  }


  /**
   * handle tap/click event: select/unselect a node
   * @param {Event} event
   * @private
   */
  onTap(event) {
    let pointer = this.getPointer(event.center);
    let multiselect = this.selectionHandler.options.multiselect &&
        (event.changedPointers[0].ctrlKey || event.changedPointers[0].metaKey);

    this.checkSelectionChanges(pointer, event, multiselect);
    this.selectionHandler._generateClickEvent('click', event, pointer);
  }


  /**
   * handle doubletap event
   * @param {Event} event
   * @private
   */
  onDoubleTap(event) {
    let pointer = this.getPointer(event.center);
    this.selectionHandler._generateClickEvent('doubleClick', event, pointer);
  }


  /**
   * handle long tap event: multi select nodes
   * @param {Event} event
   * @private
   */
  onHold(event) {
    let pointer = this.getPointer(event.center);
    let multiselect = this.selectionHandler.options.multiselect;

    this.checkSelectionChanges(pointer, event, multiselect);

    this.selectionHandler._generateClickEvent('click', event, pointer);
    this.selectionHandler._generateClickEvent('hold', event, pointer);
  }


  /**
   * handle the release of the screen
   *
   * @param {Event} event
   * @private
   */
  onRelease(event) {
    if (new Date().valueOf() - this.touchTime > 10) {
      let pointer = this.getPointer(event.center);
      this.selectionHandler._generateClickEvent('release', event, pointer);
      // to avoid double fireing of this event because we have two hammer instances. (on canvas and on frame)
      this.touchTime = new Date().valueOf();
    }
  }

  /**
   *
   * @param {Event} event
   */
  onContext(event) {
    let pointer = this.getPointer({x:event.clientX, y:event.clientY});
    this.selectionHandler._generateClickEvent('oncontext', event, pointer);
  }


  /**
   * Select and deselect nodes depending current selection change.
   *
   * For changing nodes, select/deselect events are fired.
   *
   * NOTE: For a given edge, if one connecting node is deselected and with the same
   *       click the other node is selected, no events for the edge will fire.
   *       It was selected and it will remain selected.
   *
   * TODO: This is all SelectionHandler calls; the method should be moved to there.
   *
   * @param {{x: number, y: number}} pointer
   * @param {Event} event
   * @param {boolean} [add=false]
   */
  checkSelectionChanges(pointer, event, add = false) {
    let previousSelection = this.selectionHandler.getSelection();
    let selected = false;
    if (add === true) {
      selected = this.selectionHandler.selectAdditionalOnPoint(pointer);
    }
    else {
      selected = this.selectionHandler.selectOnPoint(pointer);
    }
    let currentSelection = this.selectionHandler.getSelection();

    // See NOTE in method comment for the reason to do it like this
    let deselectedItems = this._determineDifference(previousSelection, currentSelection);
    let selectedItems   = this._determineDifference(currentSelection , previousSelection);

    if (deselectedItems.edges.length > 0) {
      this.selectionHandler._generateClickEvent('deselectEdge', event, pointer, previousSelection);
      selected = true;
    }

    if (deselectedItems.nodes.length > 0) {
      this.selectionHandler._generateClickEvent('deselectNode', event, pointer, previousSelection);
      selected = true;
    }

    if (selectedItems.nodes.length > 0) {
      this.selectionHandler._generateClickEvent('selectNode', event, pointer);
      selected = true;
    }

    if (selectedItems.edges.length > 0) {
      this.selectionHandler._generateClickEvent('selectEdge', event, pointer);
      selected = true;
    }

    // fire the select event if anything has been selected or deselected
    if (selected === true) { // select or unselect
      this.selectionHandler._generateClickEvent('select', event, pointer);
    }
  }


  /**
   * Remove all node and edge id's from the first set that are present in the second one.
   *
   * @param {{nodes: Array.<Node>, edges: Array.<vis.Edge>}} firstSet
   * @param {{nodes: Array.<Node>, edges: Array.<vis.Edge>}} secondSet
   * @returns {{nodes: Array.<Node>, edges: Array.<vis.Edge>}}
   * @private
   */
  _determineDifference(firstSet, secondSet) {
    let arrayDiff = function(firstArr, secondArr) {
      let result = [];

      for (let i = 0; i < firstArr.length; i++) {
        let value = firstArr[i];
        if (secondArr.indexOf(value) === -1) {
          result.push(value);
        }
      }

      return result;
    };

    return {
      nodes: arrayDiff(firstSet.nodes, secondSet.nodes),
      edges: arrayDiff(firstSet.edges, secondSet.edges)
    };
  }


  /**
   * This function is called by onDragStart.
   * It is separated out because we can then overload it for the datamanipulation system.
   *
   * @param {Event} event
   * @private
   */
  onDragStart(event) {
    //in case the touch event was triggered on an external div, do the initial touch now.
    if (this.drag.pointer === undefined) {
      this.onTouch(event);
    }

    // note: drag.pointer is set in onTouch to get the initial touch location
    let node = this.selectionHandler.getNodeAt(this.drag.pointer);

    this.drag.dragging = true;
    this.drag.selection = [];
    this.drag.translation = util.extend({},this.body.view.translation); // copy the object
    this.drag.nodeId = undefined;

    if (node !== undefined && this.options.dragNodes === true) {
      this.drag.nodeId = node.id;
      // select the clicked node if not yet selected
      if (node.isSelected() === false) {
        this.selectionHandler.unselectAll();
        this.selectionHandler.selectObject(node);
      }

      // after select to contain the node
      this.selectionHandler._generateClickEvent('dragStart', event, this.drag.pointer);

      let selection = this.selectionHandler.selectionObj.nodes;
      // create an array with the selected nodes and their original location and status
      for (let nodeId in selection) {
        if (selection.hasOwnProperty(nodeId)) {
          let object = selection[nodeId];
          let s = {
            id: object.id,
            node: object,

            // store original x, y, xFixed and yFixed, make the node temporarily Fixed
            x: object.x,
            y: object.y,
            xFixed: object.options.fixed.x,
            yFixed: object.options.fixed.y
          };

          object.options.fixed.x = true;
          object.options.fixed.y = true;

          this.drag.selection.push(s);
        }
      }
    }
    else {
      // fallback if no node is selected and thus the view is dragged.
      this.selectionHandler._generateClickEvent('dragStart', event, this.drag.pointer, undefined, true);
    }
  }


  /**
   * handle drag event
   * @param {Event} event
   * @private
   */
  onDrag(event) {
    if (this.drag.pinched === true) {
      return;
    }

    // remove the focus on node if it is focussed on by the focusOnNode
    this.body.emitter.emit('unlockNode');

    let pointer = this.getPointer(event.center);

    let selection = this.drag.selection;
    if (selection && selection.length && this.options.dragNodes === true) {
      this.selectionHandler._generateClickEvent('dragging', event, pointer);

      // calculate delta's and new location
      let deltaX = pointer.x - this.drag.pointer.x;
      let deltaY = pointer.y - this.drag.pointer.y;

      // update position of all selected nodes
      selection.forEach((selection) => {
        let node = selection.node;
        // only move the node if it was not fixed initially
        if (selection.xFixed === false) {
          node.x = this.canvas._XconvertDOMtoCanvas(this.canvas._XconvertCanvasToDOM(selection.x) + deltaX);
        }
        // only move the node if it was not fixed initially
        if (selection.yFixed === false) {
          node.y = this.canvas._YconvertDOMtoCanvas(this.canvas._YconvertCanvasToDOM(selection.y) + deltaY);
        }
      });

      // start the simulation of the physics
      this.body.emitter.emit('startSimulation');
    }
    else {
      // move the network
      if (this.options.dragView === true) {
        this.selectionHandler._generateClickEvent('dragging', event, pointer, undefined, true);

        // if the drag was not started properly because the click started outside the network div, start it now.
        if (this.drag.pointer === undefined) {
          this.onDragStart(event);
          return;
        }
        let diffX = pointer.x - this.drag.pointer.x;
        let diffY = pointer.y - this.drag.pointer.y;

        this.body.view.translation = {x:this.drag.translation.x + diffX, y:this.drag.translation.y + diffY};
        this.body.emitter.emit('_requestRedraw');
      }
    }
  }


  /**
   * handle drag start event
   * @param {Event} event
   * @private
   */
  onDragEnd(event) {
    this.drag.dragging = false;
    let selection = this.drag.selection;
    if (selection && selection.length) {
      selection.forEach(function (s) {
        // restore original xFixed and yFixed
        s.node.options.fixed.x = s.xFixed;
        s.node.options.fixed.y = s.yFixed;
      });
      this.selectionHandler._generateClickEvent('dragEnd', event, this.getPointer(event.center));
      this.body.emitter.emit('startSimulation');
    }
    else {
      this.selectionHandler._generateClickEvent('dragEnd', event, this.getPointer(event.center), undefined, true);
      this.body.emitter.emit('_requestRedraw');
    }
  }



  /**
   * Handle pinch event
   * @param {Event}  event   The event
   * @private
   */
  onPinch(event) {
    let pointer = this.getPointer(event.center);

    this.drag.pinched = true;
    if (this.pinch['scale'] === undefined) {
      this.pinch.scale = 1;
    }

    // TODO: enabled moving while pinching?
    let scale = this.pinch.scale * event.scale;
    this.zoom(scale, pointer)
  }


  /**
   * Zoom the network in or out
   * @param {number} scale a number around 1, and between 0.01 and 10
   * @param {{x: number, y: number}} pointer    Position on screen
   * @private
   */
  zoom(scale, pointer) {
    if (this.options.zoomView === true) {
      let scaleOld = this.body.view.scale;
      if (scale < 0.00001) {
        scale = 0.00001;
      }
      if (scale > 10) {
        scale = 10;
      }

      let preScaleDragPointer = undefined;
      if (this.drag !== undefined) {
        if (this.drag.dragging === true) {
          preScaleDragPointer = this.canvas.DOMtoCanvas(this.drag.pointer);
        }
      }
      // + this.canvas.frame.canvas.clientHeight / 2
      let translation = this.body.view.translation;

      let scaleFrac = scale / scaleOld;
      let tx = (1 - scaleFrac) * pointer.x + translation.x * scaleFrac;
      let ty = (1 - scaleFrac) * pointer.y + translation.y * scaleFrac;

      this.body.view.scale = scale;
      this.body.view.translation = {x:tx, y:ty};

      if (preScaleDragPointer != undefined) {
        let postScaleDragPointer = this.canvas.canvasToDOM(preScaleDragPointer);
        this.drag.pointer.x = postScaleDragPointer.x;
        this.drag.pointer.y = postScaleDragPointer.y;
      }

      this.body.emitter.emit('_requestRedraw');

      if (scaleOld < scale) {
        this.body.emitter.emit('zoom', {direction: '+', scale: this.body.view.scale, pointer: pointer});
      }
      else {
        this.body.emitter.emit('zoom', {direction: '-', scale: this.body.view.scale, pointer: pointer});
      }
    }
  }


  /**
   * Event handler for mouse wheel event, used to zoom the timeline
   * See http://adomas.org/javascript-mouse-wheel/
   *     https://github.com/EightMedia/hammer.js/issues/256
   * @param {MouseEvent}  event
   * @private
   */
  onMouseWheel(event) {
    if (this.options.zoomView === true) {
      // retrieve delta
      let delta = 0;
      if (event.wheelDelta) { /* IE/Opera. */
        delta = event.wheelDelta / 120;
      }
      else if (event.detail) { /* Mozilla case. */
        // In Mozilla, sign of delta is different than in IE.
        // Also, delta is multiple of 3.
        delta = -event.detail / 3;
      }

      // If delta is nonzero, handle it.
      // Basically, delta is now positive if wheel was scrolled up,
      // and negative, if wheel was scrolled down.
      if (delta !== 0) {

        // calculate the new scale
        let scale = this.body.view.scale;
        let zoom = delta / 10;
        if (delta < 0) {
          zoom = zoom / (1 - zoom);
        }
        scale *= (1 + zoom);

        // calculate the pointer location
        let pointer = this.getPointer({x: event.clientX, y: event.clientY});

        // apply the new scale
        this.zoom(scale, pointer);
      }

      // Prevent default actions caused by mouse wheel.
      event.preventDefault();
    }
  }


  /**
   * Mouse move handler for checking whether the title moves over a node with a title.
   * @param  {Event} event
   * @private
   */
  onMouseMove(event) {
    let pointer = this.getPointer({x:event.clientX, y:event.clientY});
    let popupVisible = false;

    // check if the previously selected node is still selected
    if (this.popup !== undefined) {
      if (this.popup.hidden === false) {
        this._checkHidePopup(pointer);
      }

      // if the popup was not hidden above
      if (this.popup.hidden === false) {
        popupVisible = true;
        this.popup.setPosition(pointer.x + 3, pointer.y - 5);
        this.popup.show();
      }
    }

    // if we bind the keyboard to the div, we have to highlight it to use it. This highlights it on mouse over.
    if (this.options.keyboard.bindToWindow === false && this.options.keyboard.enabled === true) {
      this.canvas.frame.focus();
    }

    // start a timeout that will check if the mouse is positioned above an element
    if (popupVisible === false) {
      if (this.popupTimer !== undefined) {
        clearInterval(this.popupTimer); // stop any running calculationTimer
        this.popupTimer = undefined;
      }
      if (!this.drag.dragging) {
        this.popupTimer = setTimeout(() => this._checkShowPopup(pointer), this.options.tooltipDelay);
      }
    }

    // adding hover highlights
    if (this.options.hover === true) {
      this.selectionHandler.hoverObject(event, pointer);
    }
  }



  /**
   * Check if there is an element on the given position in the network
   * (a node or edge). If so, and if this element has a title,
   * show a popup window with its title.
   *
   * @param {{x:number, y:number}} pointer
   * @private
   */
 _checkShowPopup(pointer) {
    let x = this.canvas._XconvertDOMtoCanvas(pointer.x);
    let y = this.canvas._YconvertDOMtoCanvas(pointer.y);
    let pointerObj = {
      left:   x,
      top:    y,
      right:  x,
      bottom: y
    };

    let previousPopupObjId = this.popupObj === undefined ? undefined : this.popupObj.id;
    let nodeUnderCursor = false;
    let popupType = 'node';

    // check if a node is under the cursor.
    if (this.popupObj === undefined) {
      // search the nodes for overlap, select the top one in case of multiple nodes
      let nodeIndices = this.body.nodeIndices;
      let nodes = this.body.nodes;
      let node;
      let overlappingNodes = [];
      for (let i = 0; i < nodeIndices.length; i++) {
        node = nodes[nodeIndices[i]];
        if (node.isOverlappingWith(pointerObj) === true) {
          if (node.getTitle() !== undefined) {
            overlappingNodes.push(nodeIndices[i]);
          }
        }
      }

      if (overlappingNodes.length > 0) {
        // if there are overlapping nodes, select the last one, this is the one which is drawn on top of the others
        this.popupObj = nodes[overlappingNodes[overlappingNodes.length - 1]];
        // if you hover over a node, the title of the edge is not supposed to be shown.
        nodeUnderCursor = true;
      }
    }

    if (this.popupObj === undefined && nodeUnderCursor === false) {
      // search the edges for overlap
      let edgeIndices = this.body.edgeIndices;
      let edges = this.body.edges;
      let edge;
      let overlappingEdges = [];
      for (let i = 0; i < edgeIndices.length; i++) {
        edge = edges[edgeIndices[i]];
        if (edge.isOverlappingWith(pointerObj) === true) {
          if (edge.connected === true && edge.getTitle() !== undefined) {
            overlappingEdges.push(edgeIndices[i]);
          }
        }
      }

      if (overlappingEdges.length > 0) {
        this.popupObj = edges[overlappingEdges[overlappingEdges.length - 1]];
        popupType = 'edge';
      }
    }

    if (this.popupObj !== undefined) {
      // show popup message window
      if (this.popupObj.id !== previousPopupObjId) {
        if (this.popup === undefined) {
          this.popup = new Popup(this.canvas.frame);
        }

        this.popup.popupTargetType = popupType;
        this.popup.popupTargetId = this.popupObj.id;

        // adjust a small offset such that the mouse cursor is located in the
        // bottom left location of the popup, and you can easily move over the
        // popup area
        this.popup.setPosition(pointer.x + 3, pointer.y - 5);
        this.popup.setText(this.popupObj.getTitle());
        this.popup.show();
        this.body.emitter.emit('showPopup',this.popupObj.id);
      }
    }
    else {
      if (this.popup !== undefined) {
        this.popup.hide();
        this.body.emitter.emit('hidePopup');
      }
    }
  }


  /**
   * Check if the popup must be hidden, which is the case when the mouse is no
   * longer hovering on the object
   * @param {{x:number, y:number}} pointer
   * @private
   */
 _checkHidePopup(pointer) {
    let pointerObj = this.selectionHandler._pointerToPositionObject(pointer);

    let stillOnObj = false;
    if (this.popup.popupTargetType === 'node') {
      if (this.body.nodes[this.popup.popupTargetId] !== undefined) {
        stillOnObj = this.body.nodes[this.popup.popupTargetId].isOverlappingWith(pointerObj);

        // if the mouse is still one the node, we have to check if it is not also on one that is drawn on top of it.
        // we initially only check stillOnObj because this is much faster.
        if (stillOnObj === true) {
          let overNode = this.selectionHandler.getNodeAt(pointer);
          stillOnObj = overNode === undefined ? false : overNode.id === this.popup.popupTargetId;
        }
      }
    }
    else {
      if (this.selectionHandler.getNodeAt(pointer) === undefined) {
        if (this.body.edges[this.popup.popupTargetId] !== undefined) {
          stillOnObj = this.body.edges[this.popup.popupTargetId].isOverlappingWith(pointerObj);
        }
      }
    }


    if (stillOnObj === false) {
      this.popupObj = undefined;
      this.popup.hide();
      this.body.emitter.emit('hidePopup');
    }
  }
}

export default InteractionHandler;
