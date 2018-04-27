
let util = require('../../util');
let Hammer = require('../../module/hammer');
let hammerUtil = require('../../hammerUtil');

/**
 * Clears the toolbar div element of children
 *
 * @private
 */
class ManipulationSystem {
  /**
   * @param {Object} body
   * @param {Canvas} canvas
   * @param {SelectionHandler} selectionHandler
   */
  constructor(body, canvas, selectionHandler) {
    this.body = body;
    this.canvas = canvas;
    this.selectionHandler = selectionHandler;

    this.editMode = false;
    this.manipulationDiv = undefined;
    this.editModeDiv     = undefined;
    this.closeDiv        = undefined;

    this.manipulationHammers = [];
    this.temporaryUIFunctions = {};
    this.temporaryEventFunctions = [];

    this.touchTime = 0;
    this.temporaryIds = {nodes: [], edges:[]};
    this.guiEnabled = false;
    this.inMode = false;
    this.selectedControlNode = undefined;

    this.options = {};
    this.defaultOptions = {
      enabled: false,
      initiallyActive: false,
      addNode: true,
      addEdge: true,
      editNode: undefined,
      editEdge: true,
      deleteNode: true,
      deleteEdge: true,
      controlNodeStyle:{
        shape:'dot',
        size:6,
        color: {background: '#ff0000', border: '#3c3c3c', highlight: {background: '#07f968', border: '#3c3c3c'}},
        borderWidth: 2,
        borderWidthSelected: 2
      }
    };
    util.extend(this.options, this.defaultOptions);

    this.body.emitter.on('destroy',     () => {this._clean();});
    this.body.emitter.on('_dataChanged',this._restore.bind(this));
    this.body.emitter.on('_resetData',  this._restore.bind(this));
  }


  /**
   * If something changes in the data during editing, switch back to the initial datamanipulation state and close all edit modes.
   * @private
   */
  _restore() {
    if (this.inMode !== false) {
      if (this.options.initiallyActive === true) {
        this.enableEditMode();
      }
      else {
        this.disableEditMode();
      }
    }
  }

  /**
   * Set the Options
   *
   * @param {Object} options
   * @param {Object} allOptions
   * @param {Object} globalOptions
   */
  setOptions(options, allOptions, globalOptions) {
    if (allOptions !== undefined) {
      if (allOptions.locale !== undefined)  {this.options.locale = allOptions.locale}   else {this.options.locale = globalOptions.locale;}
      if (allOptions.locales !== undefined) {this.options.locales = allOptions.locales} else {this.options.locales = globalOptions.locales;}
    }

    if (options !== undefined) {
      if (typeof options === 'boolean') {
        this.options.enabled = options;
      }
      else {
        this.options.enabled = true;
        util.deepExtend(this.options, options);
      }
      if (this.options.initiallyActive === true) {
        this.editMode = true;
      }
      this._setup();
    }
  }


  /**
   * Enable or disable edit-mode. Draws the DOM required and cleans up after itself.
   *
   * @private
   */
  toggleEditMode() {
    if (this.editMode === true) {
      this.disableEditMode();
    }
    else {
      this.enableEditMode();
    }
  }


  /**
   * Enables Edit Mode
   */
  enableEditMode() {
    this.editMode = true;

    this._clean();
    if (this.guiEnabled === true) {
      this.manipulationDiv.style.display = 'block';
      this.closeDiv.style.display = 'block';
      this.editModeDiv.style.display = 'none';
      this.showManipulatorToolbar();
    }
  }

  /**
   * Disables Edit Mode
   */
  disableEditMode() {
    this.editMode = false;

    this._clean();
    if (this.guiEnabled === true) {
      this.manipulationDiv.style.display = 'none';
      this.closeDiv.style.display = 'none';
      this.editModeDiv.style.display = 'block';
      this._createEditButton();
    }
  }

  /**
   * Creates the main toolbar. Removes functions bound to the select event. Binds all the buttons of the toolbar.
   *
   * @private
   */
  showManipulatorToolbar() {
    // restore the state of any bound functions or events, remove control nodes, restore physics
    this._clean();

    // reset global variables
    this.manipulationDOM = {};

    // if the gui is enabled, draw all elements.
    if (this.guiEnabled === true) {
      // a _restore will hide these menus
      this.editMode = true;
      this.manipulationDiv.style.display = 'block';
      this.closeDiv.style.display = 'block';

      let selectedNodeCount  = this.selectionHandler._getSelectedNodeCount();
      let selectedEdgeCount  = this.selectionHandler._getSelectedEdgeCount();
      let selectedTotalCount = selectedNodeCount + selectedEdgeCount;
      let locale = this.options.locales[this.options.locale];
      let needSeperator = false;


      if (this.options.addNode !== false) {
        this._createAddNodeButton(locale);
        needSeperator = true;
      }
      if (this.options.addEdge !== false) {
        if (needSeperator === true) {
          this._createSeperator(1);
        } else {
          needSeperator = true;
        }
        this._createAddEdgeButton(locale);
      }

      if (selectedNodeCount === 1 && typeof this.options.editNode === 'function') {
        if (needSeperator === true) {
          this._createSeperator(2);
        } else {
          needSeperator = true;
        }
        this._createEditNodeButton(locale);
      }
      else if (selectedEdgeCount === 1 && selectedNodeCount === 0 && this.options.editEdge !== false) {
        if (needSeperator === true) {
          this._createSeperator(3);
        } else {
          needSeperator = true;
        }
        this._createEditEdgeButton(locale);
      }

      // remove buttons
      if (selectedTotalCount !== 0) {
        if (selectedNodeCount > 0 && this.options.deleteNode !== false) {
          if (needSeperator === true) {
            this._createSeperator(4);
          }
          this._createDeleteButton(locale);
        }
        else if (selectedNodeCount === 0 && this.options.deleteEdge !== false) {
          if (needSeperator === true) {
            this._createSeperator(4);
          }
          this._createDeleteButton(locale);
        }
      }

      // bind the close button
      this._bindHammerToDiv(this.closeDiv, this.toggleEditMode.bind(this));

      // refresh this bar based on what has been selected
      this._temporaryBindEvent('select', this.showManipulatorToolbar.bind(this));
    }

    // redraw to show any possible changes
    this.body.emitter.emit('_redraw');

  }


  /**
   * Create the toolbar for adding Nodes
   */
  addNodeMode() {
    // when using the gui, enable edit mode if it wasnt already.
    if (this.editMode !== true) {
      this.enableEditMode();
    }

    // restore the state of any bound functions or events, remove control nodes, restore physics
    this._clean();

    this.inMode = 'addNode';
    if (this.guiEnabled === true) {
      let locale = this.options.locales[this.options.locale];
      this.manipulationDOM = {};
      this._createBackButton(locale);
      this._createSeperator();
      this._createDescription(locale['addDescription'] || this.options.locales['en']['addDescription']);

      // bind the close button
      this._bindHammerToDiv(this.closeDiv, this.toggleEditMode.bind(this));
    }

    this._temporaryBindEvent('click', this._performAddNode.bind(this));
  }

  /**
   * call the bound function to handle the editing of the node. The node has to be selected.
   */
  editNode() {
    // when using the gui, enable edit mode if it wasnt already.
    if (this.editMode !== true) {
      this.enableEditMode();
    }

    // restore the state of any bound functions or events, remove control nodes, restore physics
    this._clean();
    let node = this.selectionHandler._getSelectedNode();
    if (node !== undefined) {
      this.inMode = 'editNode';
      if (typeof this.options.editNode === 'function') {
        if (node.isCluster !== true) {
          let data = util.deepExtend({}, node.options, false);
          data.x = node.x;
          data.y = node.y;

          if (this.options.editNode.length === 2) {
            this.options.editNode(data, (finalizedData) => {
              if (finalizedData !== null && finalizedData !== undefined && this.inMode === 'editNode') { // if for whatever reason the mode has changes (due to dataset change) disregard the callback) {
                this.body.data.nodes.getDataSet().update(finalizedData);
              }
              this.showManipulatorToolbar();
            });
          }
          else {
            throw new Error('The function for edit does not support two arguments (data, callback)');
          }
        }
        else {
          alert(this.options.locales[this.options.locale]['editClusterError'] || this.options.locales['en']['editClusterError']);
        }
      }
      else {
        throw new Error('No function has been configured to handle the editing of nodes.');
      }
    }
    else {
      this.showManipulatorToolbar();
    }
  }


  /**
   * create the toolbar to connect nodes
   */
  addEdgeMode() {
    // when using the gui, enable edit mode if it wasnt already.
    if (this.editMode !== true) {
      this.enableEditMode();
    }

    // restore the state of any bound functions or events, remove control nodes, restore physics
    this._clean();

    this.inMode = 'addEdge';
    if (this.guiEnabled === true) {
      let locale = this.options.locales[this.options.locale];
      this.manipulationDOM = {};
      this._createBackButton(locale);
      this._createSeperator();
      this._createDescription(locale['edgeDescription'] || this.options.locales['en']['edgeDescription']);

      // bind the close button
      this._bindHammerToDiv(this.closeDiv, this.toggleEditMode.bind(this));
    }

    // temporarily overload functions
    this._temporaryBindUI('onTouch',    this._handleConnect.bind(this));
    this._temporaryBindUI('onDragEnd',  this._finishConnect.bind(this));
    this._temporaryBindUI('onDrag',     this._dragControlNode.bind(this));
    this._temporaryBindUI('onRelease',  this._finishConnect.bind(this));
    this._temporaryBindUI('onDragStart',this._dragStartEdge.bind(this));
    this._temporaryBindUI('onHold', () => {});
  }

  /**
   * create the toolbar to edit edges
   */
  editEdgeMode() {
    // when using the gui, enable edit mode if it wasn't already.
    if (this.editMode !== true) {
      this.enableEditMode();
    }

    // restore the state of any bound functions or events, remove control nodes, restore physics
    this._clean();

    this.inMode = 'editEdge';
    if (typeof this.options.editEdge === 'object' && typeof this.options.editEdge.editWithoutDrag === "function") {
      this.edgeBeingEditedId = this.selectionHandler.getSelectedEdges()[0];
      if (this.edgeBeingEditedId !== undefined) {
        var edge = this.body.edges[this.edgeBeingEditedId];
        this._performEditEdge(edge.from, edge.to);
        return;
      }
    }
    if (this.guiEnabled === true) {
      let locale = this.options.locales[this.options.locale];
      this.manipulationDOM = {};
      this._createBackButton(locale);
      this._createSeperator();
      this._createDescription(locale['editEdgeDescription'] || this.options.locales['en']['editEdgeDescription']);

      // bind the close button
      this._bindHammerToDiv(this.closeDiv, this.toggleEditMode.bind(this));
    }

    this.edgeBeingEditedId = this.selectionHandler.getSelectedEdges()[0];
    if (this.edgeBeingEditedId !== undefined) {
      let edge = this.body.edges[this.edgeBeingEditedId];

      // create control nodes
      let controlNodeFrom = this._getNewTargetNode(edge.from.x, edge.from.y);
      let controlNodeTo = this._getNewTargetNode(edge.to.x, edge.to.y);

      this.temporaryIds.nodes.push(controlNodeFrom.id);
      this.temporaryIds.nodes.push(controlNodeTo.id);

      this.body.nodes[controlNodeFrom.id] = controlNodeFrom;
      this.body.nodeIndices.push(controlNodeFrom.id);
      this.body.nodes[controlNodeTo.id] = controlNodeTo;
      this.body.nodeIndices.push(controlNodeTo.id);

      // temporarily overload UI functions, cleaned up automatically because of _temporaryBindUI
      this._temporaryBindUI('onTouch', this._controlNodeTouch.bind(this));    // used to get the position
      this._temporaryBindUI('onTap', () => {});                             // disabled
      this._temporaryBindUI('onHold', () => {});                             // disabled
      this._temporaryBindUI('onDragStart', this._controlNodeDragStart.bind(this));// used to select control node
      this._temporaryBindUI('onDrag', this._controlNodeDrag.bind(this));     // used to drag control node
      this._temporaryBindUI('onDragEnd', this._controlNodeDragEnd.bind(this));  // used to connect or revert control nodes
      this._temporaryBindUI('onMouseMove', () => {});                             // disabled

      // create function to position control nodes correctly on movement
      // automatically cleaned up because we use the temporary bind
      this._temporaryBindEvent('beforeDrawing', (ctx) => {
        let positions = edge.edgeType.findBorderPositions(ctx);
        if (controlNodeFrom.selected === false) {
          controlNodeFrom.x = positions.from.x;
          controlNodeFrom.y = positions.from.y;
        }
        if (controlNodeTo.selected === false) {
          controlNodeTo.x = positions.to.x;
          controlNodeTo.y = positions.to.y;
        }
      });

      this.body.emitter.emit('_redraw');
    }
    else {
      this.showManipulatorToolbar();
    }
  }

  /**
   * delete everything in the selection
   */
  deleteSelected() {
    // when using the gui, enable edit mode if it wasnt already.
    if (this.editMode !== true) {
      this.enableEditMode();
    }

    // restore the state of any bound functions or events, remove control nodes, restore physics
    this._clean();

    this.inMode = 'delete';
    let selectedNodes = this.selectionHandler.getSelectedNodes();
    let selectedEdges = this.selectionHandler.getSelectedEdges();
    let deleteFunction = undefined;
    if (selectedNodes.length > 0) {
      for (let i = 0; i < selectedNodes.length; i++) {
        if (this.body.nodes[selectedNodes[i]].isCluster === true) {
          alert(this.options.locales[this.options.locale]['deleteClusterError'] || this.options.locales['en']['deleteClusterError']);
          return;
        }
      }

      if (typeof this.options.deleteNode === 'function') {
        deleteFunction = this.options.deleteNode;
      }
    }
    else if (selectedEdges.length > 0) {
      if (typeof this.options.deleteEdge === 'function') {
        deleteFunction = this.options.deleteEdge;
      }
    }

    if (typeof deleteFunction === 'function') {
      let data = {nodes: selectedNodes, edges: selectedEdges};
      if (deleteFunction.length === 2) {
        deleteFunction(data, (finalizedData) => {
          if (finalizedData !== null && finalizedData !== undefined && this.inMode === 'delete') { // if for whatever reason the mode has changes (due to dataset change) disregard the callback) {
            this.body.data.edges.getDataSet().remove(finalizedData.edges);
            this.body.data.nodes.getDataSet().remove(finalizedData.nodes);
            this.body.emitter.emit('startSimulation');
            this.showManipulatorToolbar();
          }
          else {
            this.body.emitter.emit('startSimulation');
            this.showManipulatorToolbar();
          }
        });
      }
      else {
        throw new Error('The function for delete does not support two arguments (data, callback)')
      }
    }
    else {
      this.body.data.edges.getDataSet().remove(selectedEdges);
      this.body.data.nodes.getDataSet().remove(selectedNodes);
      this.body.emitter.emit('startSimulation');
      this.showManipulatorToolbar();
    }
  }




  //********************************************** PRIVATE ***************************************//

  /**
   * draw or remove the DOM
   * @private
   */
  _setup() {
    if (this.options.enabled === true) {
      // Enable the GUI
      this.guiEnabled = true;

      this._createWrappers();
      if (this.editMode === false) {
        this._createEditButton();
      }
      else {
        this.showManipulatorToolbar();
      }
    }
    else {
      this._removeManipulationDOM();

      // disable the gui
      this.guiEnabled = false;
    }
  }


  /**
   * create the div overlays that contain the DOM
   * @private
   */
  _createWrappers() {
    // load the manipulator HTML elements. All styling done in css.
    if (this.manipulationDiv === undefined) {
      this.manipulationDiv = document.createElement('div');
      this.manipulationDiv.className = 'vis-manipulation';
      if (this.editMode === true) {
        this.manipulationDiv.style.display = 'block';
      }
      else {
        this.manipulationDiv.style.display = 'none';
      }
      this.canvas.frame.appendChild(this.manipulationDiv);
    }

    // container for the edit button.
    if (this.editModeDiv === undefined) {
      this.editModeDiv = document.createElement('div');
      this.editModeDiv.className = 'vis-edit-mode';
      if (this.editMode === true) {
        this.editModeDiv.style.display = 'none';
      }
      else {
        this.editModeDiv.style.display = 'block';
      }
      this.canvas.frame.appendChild(this.editModeDiv);
    }


    // container for the close div button
    if (this.closeDiv === undefined) {
      this.closeDiv = document.createElement('div');
      this.closeDiv.className = 'vis-close';
      this.closeDiv.style.display = this.manipulationDiv.style.display;
      this.canvas.frame.appendChild(this.closeDiv);
    }
  }


  /**
   * generate a new target node. Used for creating new edges and editing edges
   *
   * @param {number} x
   * @param {number} y
   * @returns {Node}
   * @private
   */
  _getNewTargetNode(x,y) {
    let controlNodeStyle = util.deepExtend({}, this.options.controlNodeStyle);

    controlNodeStyle.id = 'targetNode' + util.randomUUID();
    controlNodeStyle.hidden = false;
    controlNodeStyle.physics = false;
    controlNodeStyle.x = x;
    controlNodeStyle.y = y;

    // we have to define the bounding box in order for the nodes to be drawn immediately
    let node = this.body.functions.createNode(controlNodeStyle);
    node.shape.boundingBox = {left: x, right:x, top:y, bottom:y};

    return node;
  }


  /**
   * Create the edit button
   */
  _createEditButton() {
    // restore everything to it's original state (if applicable)
    this._clean();

    // reset the manipulationDOM
    this.manipulationDOM = {};

    // empty the editModeDiv
    util.recursiveDOMDelete(this.editModeDiv);


    // create the contents for the editMode button
    let locale = this.options.locales[this.options.locale];
    let button = this._createButton('editMode', 'vis-button vis-edit vis-edit-mode', locale['edit'] || this.options.locales['en']['edit']);
    this.editModeDiv.appendChild(button);

    // bind a hammer listener to the button, calling the function toggleEditMode.
    this._bindHammerToDiv(button, this.toggleEditMode.bind(this));
  }


  /**
   * this function cleans up after everything this module does. Temporary elements, functions and events are removed, physics restored, hammers removed.
   * @private
   */
  _clean() {
    // not in mode
    this.inMode = false;

    // _clean the divs
    if (this.guiEnabled === true) {
      util.recursiveDOMDelete(this.editModeDiv);
      util.recursiveDOMDelete(this.manipulationDiv);

      // removes all the bindings and overloads
      this._cleanManipulatorHammers();
    }

    // remove temporary nodes and edges
    this._cleanupTemporaryNodesAndEdges();

    // restore overloaded UI functions
    this._unbindTemporaryUIs();

    // remove the temporaryEventFunctions
    this._unbindTemporaryEvents();

    // restore the physics if required
    this.body.emitter.emit('restorePhysics');
  }


  /**
   * Each dom element has it's own hammer. They are stored in this.manipulationHammers. This cleans them up.
   * @private
   */
  _cleanManipulatorHammers() {
    // _clean hammer bindings
    if (this.manipulationHammers.length != 0) {
      for (let i = 0; i < this.manipulationHammers.length; i++) {
        this.manipulationHammers[i].destroy();
      }
      this.manipulationHammers = [];
    }
  }


  /**
   * Remove all DOM elements created by this module.
   * @private
   */
  _removeManipulationDOM() {
    // removes all the bindings and overloads
    this._clean();

    // empty the manipulation divs
    util.recursiveDOMDelete(this.manipulationDiv);
    util.recursiveDOMDelete(this.editModeDiv);
    util.recursiveDOMDelete(this.closeDiv);

    // remove the manipulation divs
    if (this.manipulationDiv) {this.canvas.frame.removeChild(this.manipulationDiv);}
    if (this.editModeDiv)     {this.canvas.frame.removeChild(this.editModeDiv);}
    if (this.closeDiv)        {this.canvas.frame.removeChild(this.closeDiv);}

    // set the references to undefined
    this.manipulationDiv = undefined;
    this.editModeDiv = undefined;
    this.closeDiv = undefined;
  }


  /**
   * create a seperator line. the index is to differentiate in the manipulation dom
   * @param {number} [index=1]
   * @private
   */
  _createSeperator(index = 1) {
    this.manipulationDOM['seperatorLineDiv' + index] = document.createElement('div');
    this.manipulationDOM['seperatorLineDiv' + index].className = 'vis-separator-line';
    this.manipulationDiv.appendChild(this.manipulationDOM['seperatorLineDiv' + index]);
  }

  // ----------------------    DOM functions for buttons    --------------------------//

  /**
   *
   * @param {Locale} locale
   * @private
   */
  _createAddNodeButton(locale) {
    let button = this._createButton('addNode', 'vis-button vis-add', locale['addNode'] || this.options.locales['en']['addNode']);
    this.manipulationDiv.appendChild(button);
    this._bindHammerToDiv(button, this.addNodeMode.bind(this));
  }

  /**
   *
   * @param {Locale} locale
   * @private
   */
  _createAddEdgeButton(locale) {
    let button = this._createButton('addEdge', 'vis-button vis-connect',  locale['addEdge'] || this.options.locales['en']['addEdge']);
    this.manipulationDiv.appendChild(button);
    this._bindHammerToDiv(button, this.addEdgeMode.bind(this));
  }

  /**
   *
   * @param {Locale} locale
   * @private
   */
  _createEditNodeButton(locale) {
    let button = this._createButton('editNode', 'vis-button vis-edit', locale['editNode'] || this.options.locales['en']['editNode']);
    this.manipulationDiv.appendChild(button);
    this._bindHammerToDiv(button, this.editNode.bind(this));
  }

  /**
   *
   * @param {Locale} locale
   * @private
   */
  _createEditEdgeButton(locale) {
    let button = this._createButton('editEdge', 'vis-button vis-edit',  locale['editEdge'] || this.options.locales['en']['editEdge']);
    this.manipulationDiv.appendChild(button);
    this._bindHammerToDiv(button, this.editEdgeMode.bind(this));
  }

  /**
   *
   * @param {Locale} locale
   * @private
   */
  _createDeleteButton(locale) {
    var deleteBtnClass;
    if (this.options.rtl) {
      deleteBtnClass = 'vis-button vis-delete-rtl';
    } else {
      deleteBtnClass = 'vis-button vis-delete';
    }
    let button = this._createButton('delete', deleteBtnClass, locale['del'] || this.options.locales['en']['del']);
    this.manipulationDiv.appendChild(button);
    this._bindHammerToDiv(button, this.deleteSelected.bind(this));
  }

  /**
   *
   * @param {Locale} locale
   * @private
   */
  _createBackButton(locale) {
    let button = this._createButton('back', 'vis-button vis-back', locale['back'] || this.options.locales['en']['back']);
    this.manipulationDiv.appendChild(button);
    this._bindHammerToDiv(button, this.showManipulatorToolbar.bind(this));
  }

  /**
   *
   * @param {number|string} id
   * @param {string} className
   * @param {label} label
   * @param {string} labelClassName
   * @returns {HTMLElement}
   * @private
   */
  _createButton(id, className, label, labelClassName = 'vis-label') {

    this.manipulationDOM[id+'Div'] = document.createElement('div');
    this.manipulationDOM[id+'Div'].className = className;
    this.manipulationDOM[id+'Label'] = document.createElement('div');
    this.manipulationDOM[id+'Label'].className = labelClassName;
    this.manipulationDOM[id+'Label'].innerHTML = label;
    this.manipulationDOM[id+'Div'].appendChild(this.manipulationDOM[id+'Label']);
    return this.manipulationDOM[id+'Div'];
  }

  /**
   *
   * @param {Label} label
   * @private
   */
  _createDescription(label) {
    this.manipulationDiv.appendChild(
      this._createButton('description', 'vis-button vis-none', label)
    );
  }

  // -------------------------- End of DOM functions for buttons ------------------------------//

  /**
   * this binds an event until cleanup by the clean functions.
   * @param {Event}  event   The event
   * @param {function} newFunction
   * @private
   */
  _temporaryBindEvent(event, newFunction) {
    this.temporaryEventFunctions.push({event:event, boundFunction:newFunction});
    this.body.emitter.on(event, newFunction);
  }

  /**
   * this overrides an UI function until cleanup by the clean function
   * @param {string} UIfunctionName
   * @param {function} newFunction
   * @private
   */
  _temporaryBindUI(UIfunctionName, newFunction) {
    if (this.body.eventListeners[UIfunctionName] !== undefined) {
      this.temporaryUIFunctions[UIfunctionName] = this.body.eventListeners[UIfunctionName];
      this.body.eventListeners[UIfunctionName] = newFunction;
    }
    else {
      throw new Error('This UI function does not exist. Typo? You tried: ' + UIfunctionName + ' possible are: ' + JSON.stringify(Object.keys(this.body.eventListeners)));
    }
  }

  /**
   * Restore the overridden UI functions to their original state.
   *
   * @private
   */
  _unbindTemporaryUIs() {
    for (let functionName in this.temporaryUIFunctions) {
      if (this.temporaryUIFunctions.hasOwnProperty(functionName)) {
        this.body.eventListeners[functionName] = this.temporaryUIFunctions[functionName];
        delete this.temporaryUIFunctions[functionName];
      }
    }
    this.temporaryUIFunctions = {};
  }

  /**
   * Unbind the events created by _temporaryBindEvent
   * @private
   */
  _unbindTemporaryEvents() {
    for (let i = 0; i < this.temporaryEventFunctions.length; i++) {
      let eventName = this.temporaryEventFunctions[i].event;
      let boundFunction = this.temporaryEventFunctions[i].boundFunction;
      this.body.emitter.off(eventName, boundFunction);
    }
    this.temporaryEventFunctions = [];
  }

  /**
   * Bind an hammer instance to a DOM element.
   *
   * @param {Element} domElement
   * @param {function} boundFunction
   */
  _bindHammerToDiv(domElement, boundFunction) {
    let hammer = new Hammer(domElement, {});
    hammerUtil.onTouch(hammer, boundFunction);
    this.manipulationHammers.push(hammer);
  }


  /**
   * Neatly clean up temporary edges and nodes
   * @private
   */
  _cleanupTemporaryNodesAndEdges() {
    // _clean temporary edges
    for (let i = 0; i < this.temporaryIds.edges.length; i++) {
      this.body.edges[this.temporaryIds.edges[i]].disconnect();
      delete this.body.edges[this.temporaryIds.edges[i]];
      let indexTempEdge = this.body.edgeIndices.indexOf(this.temporaryIds.edges[i]);
      if (indexTempEdge !== -1) {this.body.edgeIndices.splice(indexTempEdge,1);}
    }

    // _clean temporary nodes
    for (let i = 0; i < this.temporaryIds.nodes.length; i++) {
      delete this.body.nodes[this.temporaryIds.nodes[i]];
      let indexTempNode = this.body.nodeIndices.indexOf(this.temporaryIds.nodes[i]);
      if (indexTempNode !== -1) {this.body.nodeIndices.splice(indexTempNode,1);}
    }

    this.temporaryIds = {nodes: [], edges: []};
  }

  // ------------------------------------------ EDIT EDGE FUNCTIONS -----------------------------------------//

  /**
   * the touch is used to get the position of the initial click
   * @param {Event}  event   The event
   * @private
   */
  _controlNodeTouch(event) {
    this.selectionHandler.unselectAll();
    this.lastTouch = this.body.functions.getPointer(event.center);
    this.lastTouch.translation = util.extend({},this.body.view.translation); // copy the object
  }


  /**
   * the drag start is used to mark one of the control nodes as selected.
   * @param {Event}  event   The event
   * @private
   */
  _controlNodeDragStart(event) {  // eslint-disable-line no-unused-vars
    let pointer = this.lastTouch;
    let pointerObj = this.selectionHandler._pointerToPositionObject(pointer);
    let from = this.body.nodes[this.temporaryIds.nodes[0]];
    let to   = this.body.nodes[this.temporaryIds.nodes[1]];
    let edge = this.body.edges[this.edgeBeingEditedId];
    this.selectedControlNode = undefined;

    let fromSelect = from.isOverlappingWith(pointerObj);
    let toSelect = to.isOverlappingWith(pointerObj);

    if (fromSelect === true) {
      this.selectedControlNode = from;
      edge.edgeType.from = from;
    }
    else if (toSelect === true) {
      this.selectedControlNode = to;
      edge.edgeType.to = to;
    }

    // we use the selection to find the node that is being dragged. We explicitly select it here.
    if (this.selectedControlNode !== undefined) {
      this.selectionHandler.selectObject(this.selectedControlNode)
    }

    this.body.emitter.emit('_redraw');
  }

  /**
   * dragging the control nodes or the canvas
   * @param {Event}  event   The event
   * @private
   */
  _controlNodeDrag(event) {
    this.body.emitter.emit('disablePhysics');
    let pointer = this.body.functions.getPointer(event.center);
    let pos = this.canvas.DOMtoCanvas(pointer);
    if (this.selectedControlNode !== undefined) {
      this.selectedControlNode.x = pos.x;
      this.selectedControlNode.y = pos.y;
    }
    else {
      // if the drag was not started properly because the click started outside the network div, start it now.
      let diffX = pointer.x - this.lastTouch.x;
      let diffY = pointer.y - this.lastTouch.y;
      this.body.view.translation = {x:this.lastTouch.translation.x + diffX, y:this.lastTouch.translation.y + diffY};
    }
    this.body.emitter.emit('_redraw');
  }


  /**
   * connecting or restoring the control nodes.
   * @param {Event}  event   The event
   * @private
   */
  _controlNodeDragEnd(event) {
    let pointer = this.body.functions.getPointer(event.center);
    let pointerObj = this.selectionHandler._pointerToPositionObject(pointer);
    let edge = this.body.edges[this.edgeBeingEditedId];
    // if the node that was dragged is not a control node, return
    if (this.selectedControlNode === undefined) {
      return;
    }

    // we use the selection to find the node that is being dragged. We explicitly DEselect the control node here.
    this.selectionHandler.unselectAll();
    let overlappingNodeIds = this.selectionHandler._getAllNodesOverlappingWith(pointerObj);
    let node = undefined;
    for (let i = overlappingNodeIds.length-1; i >= 0; i--) {
      if (overlappingNodeIds[i] !== this.selectedControlNode.id) {
        node = this.body.nodes[overlappingNodeIds[i]];
        break;
      }
    }
    // perform the connection
    if (node !== undefined && this.selectedControlNode !== undefined) {
      if (node.isCluster === true) {
        alert(this.options.locales[this.options.locale]['createEdgeError'] || this.options.locales['en']['createEdgeError'])
      }
      else {
        let from = this.body.nodes[this.temporaryIds.nodes[0]];
        if (this.selectedControlNode.id === from.id) {
          this._performEditEdge(node.id, edge.to.id);
        }
        else {
          this._performEditEdge(edge.from.id, node.id);
        }
      }
    }
    else {
      edge.updateEdgeType();
      this.body.emitter.emit('restorePhysics');
    }

    this.body.emitter.emit('_redraw');
  }

  // ------------------------------------ END OF EDIT EDGE FUNCTIONS -----------------------------------------//



  // ------------------------------------------- ADD EDGE FUNCTIONS -----------------------------------------//
  /**
   * the function bound to the selection event. It checks if you want to connect a cluster and changes the description
   * to walk the user through the process.
   *
   * @param {Event} event
   * @private
   */
  _handleConnect(event) {
    // check to avoid double fireing of this function.
    if (new Date().valueOf() - this.touchTime > 100) {
      this.lastTouch = this.body.functions.getPointer(event.center);
      this.lastTouch.translation = util.extend({},this.body.view.translation); // copy the object

      let pointer = this.lastTouch;
      let node = this.selectionHandler.getNodeAt(pointer);

      if (node !== undefined) {
        if (node.isCluster === true) {
          alert(this.options.locales[this.options.locale]['createEdgeError'] || this.options.locales['en']['createEdgeError'])
        }
        else {
          // create a node the temporary line can look at
          let targetNode = this._getNewTargetNode(node.x,node.y);
          this.body.nodes[targetNode.id] = targetNode;
          this.body.nodeIndices.push(targetNode.id);

          // create a temporary edge
          let connectionEdge = this.body.functions.createEdge({
            id: 'connectionEdge' + util.randomUUID(),
            from: node.id,
            to: targetNode.id,
            physics: false,
            smooth: {
              enabled: true,
              type: 'continuous',
              roundness: 0.5
            }
          });
          this.body.edges[connectionEdge.id] = connectionEdge;
          this.body.edgeIndices.push(connectionEdge.id);

          this.temporaryIds.nodes.push(targetNode.id);
          this.temporaryIds.edges.push(connectionEdge.id);
        }
      }
      this.touchTime = new Date().valueOf();
    }
  }

  /**
   *
   * @param {Event} event
   * @private
   */
  _dragControlNode(event) {
    let pointer = this.body.functions.getPointer(event.center);
    if (this.temporaryIds.nodes[0] !== undefined) {
      let targetNode = this.body.nodes[this.temporaryIds.nodes[0]]; // there is only one temp node in the add edge mode.
      targetNode.x = this.canvas._XconvertDOMtoCanvas(pointer.x);
      targetNode.y = this.canvas._YconvertDOMtoCanvas(pointer.y);
      this.body.emitter.emit('_redraw');
    }
    else {
      let diffX = pointer.x - this.lastTouch.x;
      let diffY = pointer.y - this.lastTouch.y;
      this.body.view.translation = {x:this.lastTouch.translation.x + diffX, y:this.lastTouch.translation.y + diffY};
    }

  }


  /**
   * Connect the new edge to the target if one exists, otherwise remove temp line
   * @param {Event}  event   The event
   * @private
   */
  _finishConnect(event) {
    let pointer = this.body.functions.getPointer(event.center);
    let pointerObj = this.selectionHandler._pointerToPositionObject(pointer);

    // remember the edge id
    let connectFromId = undefined;
    if (this.temporaryIds.edges[0] !== undefined) {
      connectFromId = this.body.edges[this.temporaryIds.edges[0]].fromId;
    }

    // get the overlapping node but NOT the temporary node;
    let overlappingNodeIds = this.selectionHandler._getAllNodesOverlappingWith(pointerObj);
    let node = undefined;
    for (let i = overlappingNodeIds.length-1; i >= 0; i--) {
      // if the node id is NOT a temporary node, accept the node.
      if (this.temporaryIds.nodes.indexOf(overlappingNodeIds[i]) === -1) {
        node = this.body.nodes[overlappingNodeIds[i]];
        break;
      }
    }

    // clean temporary nodes and edges.
    this._cleanupTemporaryNodesAndEdges();

    // perform the connection
    if (node !== undefined) {
      if (node.isCluster === true) {
        alert(this.options.locales[this.options.locale]['createEdgeError'] || this.options.locales['en']['createEdgeError']);
      }
      else {
        if (this.body.nodes[connectFromId] !== undefined && this.body.nodes[node.id] !== undefined) {
          this._performAddEdge(connectFromId, node.id);
        }
      }
    }


    // No need to do _generateclickevent('dragEnd') here, the regular dragEnd event fires.
    this.body.emitter.emit('_redraw');
  }


  /**
   *
   * @param {Event} event
   * @private
   */
  _dragStartEdge(event) {
    let pointer = this.lastTouch;
    this.selectionHandler._generateClickEvent('dragStart', event, pointer, undefined, true);
  }

  // --------------------------------------- END OF ADD EDGE FUNCTIONS -------------------------------------//


  // ------------------------------ Performing all the actual data manipulation ------------------------//

  /**
   * Adds a node on the specified location
   *
   * @param {Object} clickData
   * @private
   */
  _performAddNode(clickData) {
    let defaultData = {
      id: util.randomUUID(),
      x: clickData.pointer.canvas.x,
      y: clickData.pointer.canvas.y,
      label: 'new'
    };

    if (typeof this.options.addNode === 'function') {
      if (this.options.addNode.length === 2) {
        this.options.addNode(defaultData, (finalizedData) => {
          if (finalizedData !== null && finalizedData !== undefined && this.inMode === 'addNode') { // if for whatever reason the mode has changes (due to dataset change) disregard the callback
            this.body.data.nodes.getDataSet().add(finalizedData);
            this.showManipulatorToolbar();
          }
        });
      }
      else {
        this.showManipulatorToolbar();
        throw new Error('The function for add does not support two arguments (data,callback)');
      }
    }
    else {
      this.body.data.nodes.getDataSet().add(defaultData);
      this.showManipulatorToolbar();
    }
  }


  /**
   * connect two nodes with a new edge.
   *
   * @param {Node.id} sourceNodeId
   * @param {Node.id} targetNodeId
   * @private
   */
  _performAddEdge(sourceNodeId, targetNodeId) {
    let defaultData = {from: sourceNodeId, to: targetNodeId};
    if (typeof this.options.addEdge === 'function') {
      if (this.options.addEdge.length === 2) {
        this.options.addEdge(defaultData, (finalizedData) => {
          if (finalizedData !== null && finalizedData !== undefined && this.inMode === 'addEdge') { // if for whatever reason the mode has changes (due to dataset change) disregard the callback
            this.body.data.edges.getDataSet().add(finalizedData);
            this.selectionHandler.unselectAll();
            this.showManipulatorToolbar();
          }
        });
      }
      else {
        throw new Error('The function for connect does not support two arguments (data,callback)');
      }
    }
    else {
      this.body.data.edges.getDataSet().add(defaultData);
      this.selectionHandler.unselectAll();
      this.showManipulatorToolbar();
    }
  }

  /**
   * connect two nodes with a new edge.
   *
   * @param {Node.id} sourceNodeId
   * @param {Node.id} targetNodeId
   * @private
   */
  _performEditEdge(sourceNodeId, targetNodeId) {
    let defaultData = {id: this.edgeBeingEditedId, from: sourceNodeId, to: targetNodeId, label: this.body.data.edges._data[this.edgeBeingEditedId].label };
    let eeFunct = this.options.editEdge;
    if (typeof eeFunct === 'object') {
      eeFunct = eeFunct.editWithoutDrag;
    }
    if (typeof eeFunct === 'function') {
      if (eeFunct.length === 2) {
        eeFunct(defaultData, (finalizedData) => {
          if (finalizedData === null || finalizedData === undefined || this.inMode !== 'editEdge') { // if for whatever reason the mode has changes (due to dataset change) disregard the callback) {
            this.body.edges[defaultData.id].updateEdgeType();
            this.body.emitter.emit('_redraw');
            this.showManipulatorToolbar();
          }
          else {
            this.body.data.edges.getDataSet().update(finalizedData);
            this.selectionHandler.unselectAll();
            this.showManipulatorToolbar();
          }
        });
      }
      else {
        throw new Error('The function for edit does not support two arguments (data, callback)');
      }
    }
    else {
      this.body.data.edges.getDataSet().update(defaultData);
      this.selectionHandler.unselectAll();
      this.showManipulatorToolbar();
    }
  }


}

export default ManipulationSystem;
