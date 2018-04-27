// Load custom shapes into CanvasRenderingContext2D
require('./shapes');

let Emitter = require('emitter-component');
let util = require('../util');
let dotparser = require('./dotparser');
let gephiParser = require('./gephiParser');
let Activator = require('../shared/Activator');
let locales = require('./locales');

var Images = require('./Images').default;
var Groups = require('./modules/Groups').default;
var NodesHandler = require('./modules/NodesHandler').default;
var EdgesHandler = require('./modules/EdgesHandler').default;
var PhysicsEngine = require('./modules/PhysicsEngine').default;
var ClusterEngine = require('./modules/Clustering').default;
var CanvasRenderer = require('./modules/CanvasRenderer').default;
var Canvas = require('./modules/Canvas').default;
var View = require('./modules/View').default;
var InteractionHandler = require('./modules/InteractionHandler').default;
var SelectionHandler = require("./modules/SelectionHandler").default;
var LayoutEngine = require("./modules/LayoutEngine").default;
var ManipulationSystem = require("./modules/ManipulationSystem").default;
var Configurator = require("./../shared/Configurator").default;
var Validator = require("./../shared/Validator").default;
var {printStyle} = require('./../shared/Validator');
var {allOptions, configureOptions} = require('./options.js');
var KamadaKawai = require("./modules/KamadaKawai.js").default;


/**
 * Create a network visualization, displaying nodes and edges.
 *
 * @param {Element} container   The DOM element in which the Network will
 *                                  be created. Normally a div element.
 * @param {Object} data         An object containing parameters
 *                              {Array} nodes
 *                              {Array} edges
 * @param {Object} options      Options
 * @constructor Network
 */
function Network(container, data, options) {
  if (!(this instanceof Network)) {
    throw new SyntaxError('Constructor must be called with the new operator');
  }

  // set constant values
  this.options = {};
  this.defaultOptions = {
    locale: 'en',
    locales: locales,
    clickToUse: false
  };
  util.extend(this.options, this.defaultOptions);

  /**
   * Containers for nodes and edges.
   *
   * 'edges' and 'nodes' contain the full definitions of all the network elements.
   * 'nodeIndices' and 'edgeIndices' contain the id's of the active elements.
   *
   * The distinction is important, because a defined node need not be active, i.e.
   * visible on the canvas. This happens in particular when clusters are defined, in
   * that case there will be nodes and edges not displayed.
   * The bottom line is that all code with actions related to visibility, *must* use
   * 'nodeIndices' and 'edgeIndices', not 'nodes' and 'edges' directly.
   */
  this.body = {
    container: container,

    // See comment above for following fields
    nodes: {},
    nodeIndices: [],
    edges: {},
    edgeIndices: [],

    emitter: {
      on:   this.on.bind(this),
      off:  this.off.bind(this),
      emit: this.emit.bind(this),
      once: this.once.bind(this)
    },
    eventListeners: {
      onTap:        function() {},
      onTouch:      function() {},
      onDoubleTap:  function() {},
      onHold:       function() {},
      onDragStart:  function() {},
      onDrag:       function() {},
      onDragEnd:    function() {},
      onMouseWheel: function() {},
      onPinch:      function() {},
      onMouseMove:  function() {},
      onRelease:    function() {},
      onContext:    function() {}
    },
    data: {
      nodes: null,      // A DataSet or DataView
      edges: null       // A DataSet or DataView
    },
    functions: {
      createNode: function() {},
      createEdge: function() {},
      getPointer: function() {}
    },
    modules: {},
    view: {
      scale: 1,
      translation: {x: 0, y: 0}
    }
  };



  // bind the event listeners
  this.bindEventListeners();

  // setting up all modules
  this.images              = new Images(() => this.body.emitter.emit("_requestRedraw")); // object with images
  this.groups              = new Groups(); // object with groups
  this.canvas              = new Canvas(this.body);                         // DOM handler
  this.selectionHandler    = new SelectionHandler(this.body, this.canvas);  // Selection handler
  this.interactionHandler  = new InteractionHandler(this.body, this.canvas, this.selectionHandler);  // Interaction handler handles all the hammer bindings (that are bound by canvas), key
  this.view                = new View(this.body, this.canvas);              // camera handler, does animations and zooms
  this.renderer            = new CanvasRenderer(this.body, this.canvas);    // renderer, starts renderloop, has events that modules can hook into
  this.physics             = new PhysicsEngine(this.body);                  // physics engine, does all the simulations
  this.layoutEngine        = new LayoutEngine(this.body);                   // layout engine for inital layout and hierarchical layout
  this.clustering          = new ClusterEngine(this.body);                  // clustering api
  this.manipulation        = new ManipulationSystem(this.body, this.canvas, this.selectionHandler); // data manipulation system

  this.nodesHandler        = new NodesHandler(this.body, this.images, this.groups, this.layoutEngine);   // Handle adding, deleting and updating of nodes as well as global options
  this.edgesHandler        = new EdgesHandler(this.body, this.images, this.groups);   // Handle adding, deleting and updating of edges as well as global options

  this.body.modules["kamadaKawai"] = new KamadaKawai(this.body,150,0.05);   // Layouting algorithm.
  this.body.modules["clustering"] = this.clustering;

  // create the DOM elements
  this.canvas._create();

  // apply options
  this.setOptions(options);

  // load data (the disable start variable will be the same as the enabled clustering)
  this.setData(data);

}

// Extend Network with an Emitter mixin
Emitter(Network.prototype);


/**
 * Set options
 * @param {Object} options
 */
Network.prototype.setOptions = function (options) {
  if (options !== undefined) {
    let errorFound = Validator.validate(options, allOptions);
    if (errorFound === true) {
      console.log('%cErrors have been found in the supplied options object.', printStyle);
    }

    // copy the global fields over
    let fields = ['locale','locales','clickToUse'];
    util.selectiveDeepExtend(fields,this.options, options);

    // the hierarchical system can adapt the edges and the physics to it's own options because not all combinations work with the hierarichical system.
    options = this.layoutEngine.setOptions(options.layout, options);

    this.canvas.setOptions(options); // options for canvas are in globals

    // pass the options to the modules
    this.groups.setOptions(options.groups);
    this.nodesHandler.setOptions(options.nodes);
    this.edgesHandler.setOptions(options.edges);
    this.physics.setOptions(options.physics);
    this.manipulation.setOptions(options.manipulation, options, this.options); // manipulation uses the locales in the globals

    this.interactionHandler.setOptions(options.interaction);
    this.renderer.setOptions(options.interaction);            // options for rendering are in interaction
    this.selectionHandler.setOptions(options.interaction);    // options for selection are in interaction

    // reload the settings of the nodes to apply changes in groups that are not referenced by pointer.
    if (options.groups !== undefined) {
      this.body.emitter.emit("refreshNodes");
    }
    // these two do not have options at the moment, here for completeness
    //this.view.setOptions(options.view);
    //this.clustering.setOptions(options.clustering);

    if ('configure' in options) {
      if (!this.configurator) {
        this.configurator = new Configurator(this, this.body.container, configureOptions, this.canvas.pixelRatio);
      }

      this.configurator.setOptions(options.configure);
    }

    // if the configuration system is enabled, copy all options and put them into the config system
    if (this.configurator && this.configurator.options.enabled === true) {
      let networkOptions = {nodes:{},edges:{},layout:{},interaction:{},manipulation:{},physics:{},global:{}};
      util.deepExtend(networkOptions.nodes,        this.nodesHandler.options);
      util.deepExtend(networkOptions.edges,        this.edgesHandler.options);
      util.deepExtend(networkOptions.layout,       this.layoutEngine.options);
      // load the selectionHandler and render default options in to the interaction group
      util.deepExtend(networkOptions.interaction,  this.selectionHandler.options);
      util.deepExtend(networkOptions.interaction,  this.renderer.options);

      util.deepExtend(networkOptions.interaction,  this.interactionHandler.options);
      util.deepExtend(networkOptions.manipulation, this.manipulation.options);
      util.deepExtend(networkOptions.physics,      this.physics.options);

      // load globals into the global object
      util.deepExtend(networkOptions.global,       this.canvas.options);
      util.deepExtend(networkOptions.global,       this.options);

      this.configurator.setModuleOptions(networkOptions);
    }

    // handle network global options
    if (options.clickToUse !== undefined) {
      if (options.clickToUse === true) {
        if (this.activator === undefined) {
          this.activator = new Activator(this.canvas.frame);
          this.activator.on('change', () => {this.body.emitter.emit("activate")});
        }
      }
      else {
        if (this.activator !== undefined) {
          this.activator.destroy();
          delete this.activator;
        }
        this.body.emitter.emit("activate");
      }
    }
    else {
      this.body.emitter.emit("activate");
    }

    this.canvas.setSize();
    // start the physics simulation. Can be safely called multiple times.
    this.body.emitter.emit("startSimulation");
  }
};


/**
 * Update the visible nodes and edges list with the most recent node state.
 *
 * Visible nodes are stored in this.body.nodeIndices.
 * Visible edges are stored in this.body.edgeIndices.
 * A node or edges is visible if it is not hidden or clustered.
 *
 * @private
 */
Network.prototype._updateVisibleIndices = function () {
  let nodes = this.body.nodes;
  let edges = this.body.edges;
  this.body.nodeIndices = [];
  this.body.edgeIndices = [];

  for (let nodeId in nodes) {
    if (nodes.hasOwnProperty(nodeId)) {
      if (!this.clustering._isClusteredNode(nodeId) && nodes[nodeId].options.hidden === false) {
        this.body.nodeIndices.push(nodes[nodeId].id);
      }
    }
  }

  for (let edgeId in edges) {
    if (edges.hasOwnProperty(edgeId)) {
      let edge = edges[edgeId];

      // It can happen that this is executed *after* a node edge has been removed,
      // but *before* the edge itself has been removed. Taking this into account.
      let fromNode = nodes[edge.fromId];
      let toNode   = nodes[edge.toId];
      let edgeNodesPresent = (fromNode !== undefined) && (toNode !== undefined);

      let isVisible =
          !this.clustering._isClusteredEdge(edgeId)
        && edge.options.hidden === false
        && edgeNodesPresent
        && fromNode.options.hidden === false  // Also hidden if any of its connecting nodes are hidden
        && toNode.options.hidden === false;   // idem

      if (isVisible) {
        this.body.edgeIndices.push(edge.id);
      }
    }
  }
};


/**
 * Bind all events
 */
Network.prototype.bindEventListeners = function () {
  // This event will trigger a rebuilding of the cache everything.
  // Used when nodes or edges have been added or removed.
  this.body.emitter.on("_dataChanged", () => {
    this.edgesHandler._updateState();
    this.body.emitter.emit("_dataUpdated");
  });

  // this is called when options of EXISTING nodes or edges have changed.
  this.body.emitter.on("_dataUpdated", () => {
    // Order important in following block
    this.clustering._updateState();
    this._updateVisibleIndices();

    this._updateValueRange(this.body.nodes);
    this._updateValueRange(this.body.edges);
    // start simulation (can be called safely, even if already running)
    this.body.emitter.emit("startSimulation");
    this.body.emitter.emit("_requestRedraw");
  });
};


/**
 * Set nodes and edges, and optionally options as well.
 *
 * @param {Object} data              Object containing parameters:
 *                                   {Array | DataSet | DataView} [nodes] Array with nodes
 *                                   {Array | DataSet | DataView} [edges] Array with edges
 *                                   {String} [dot] String containing data in DOT format
 *                                   {String} [gephi] String containing data in gephi JSON format
 *                                   {Options} [options] Object with options
 */
Network.prototype.setData = function (data) {
  // reset the physics engine.
  this.body.emitter.emit("resetPhysics");
  this.body.emitter.emit("_resetData");

  // unselect all to ensure no selections from old data are carried over.
  this.selectionHandler.unselectAll();

  if (data && data.dot && (data.nodes || data.edges)) {
    throw new SyntaxError('Data must contain either parameter "dot" or ' +
      ' parameter pair "nodes" and "edges", but not both.');
  }

  // set options
  this.setOptions(data && data.options);
  // set all data
  if (data && data.dot) {
    console.log('The dot property has been deprecated. Please use the static convertDot method to convert DOT into vis.network format and use the normal data format with nodes and edges. This converter is used like this: var data = vis.network.convertDot(dotString);');
    // parse DOT file
    var dotData = dotparser.DOTToGraph(data.dot);
    this.setData(dotData);
    return;
  }
  else if (data && data.gephi) {
    // parse DOT file
    console.log('The gephi property has been deprecated. Please use the static convertGephi method to convert gephi into vis.network format and use the normal data format with nodes and edges. This converter is used like this: var data = vis.network.convertGephi(gephiJson);');
    var gephiData = gephiParser.parseGephi(data.gephi);
    this.setData(gephiData);
    return;
  }
  else {
    this.nodesHandler.setData(data && data.nodes, true);
    this.edgesHandler.setData(data && data.edges, true);
  }

  // emit change in data
  this.body.emitter.emit("_dataChanged");

  // emit data loaded
  this.body.emitter.emit("_dataLoaded");

  // find a stable position or start animating to a stable position
  this.body.emitter.emit("initPhysics");
};


/**
 * Cleans up all bindings of the network, removing it fully from the memory IF the variable is set to null after calling this function.
 * var network = new vis.Network(..);
 * network.destroy();
 * network = null;
 */
Network.prototype.destroy = function () {
  this.body.emitter.emit("destroy");
  // clear events
  this.body.emitter.off();
  this.off();

  // delete modules
  delete this.groups;
  delete this.canvas;
  delete this.selectionHandler;
  delete this.interactionHandler;
  delete this.view;
  delete this.renderer;
  delete this.physics;
  delete this.layoutEngine;
  delete this.clustering;
  delete this.manipulation;
  delete this.nodesHandler;
  delete this.edgesHandler;
  delete this.configurator;
  delete this.images;

  for (var nodeId in this.body.nodes) {
    if (!this.body.nodes.hasOwnProperty(nodeId)) continue;
    delete this.body.nodes[nodeId];
  }

  for (var edgeId in this.body.edges) {
    if (!this.body.edges.hasOwnProperty(edgeId)) continue;
    delete this.body.edges[edgeId];
  }

  // remove the container and everything inside it recursively
  util.recursiveDOMDelete(this.body.container);
};


/**
 * Update the values of all object in the given array according to the current
 * value range of the objects in the array.
 * @param {Object} obj    An object containing a set of Edges or Nodes
 *                        The objects must have a method getValue() and
 *                        setValueRange(min, max).
 * @private
 */
Network.prototype._updateValueRange = function (obj) {
  var id;

  // determine the range of the objects
  var valueMin = undefined;
  var valueMax = undefined;
  var valueTotal = 0;
  for (id in obj) {
    if (obj.hasOwnProperty(id)) {
      var value = obj[id].getValue();
      if (value !== undefined) {
        valueMin = (valueMin === undefined) ? value : Math.min(value, valueMin);
        valueMax = (valueMax === undefined) ? value : Math.max(value, valueMax);
        valueTotal += value;
      }
    }
  }

  // adjust the range of all objects
  if (valueMin !== undefined && valueMax !== undefined) {
    for (id in obj) {
      if (obj.hasOwnProperty(id)) {
        obj[id].setValueRange(valueMin, valueMax, valueTotal);
      }
    }
  }
};


/**
 * Returns true when the Network is active.
 * @returns {boolean}
 */
Network.prototype.isActive = function () {
  return !this.activator || this.activator.active;
};


Network.prototype.setSize             = function() {return this.canvas.setSize.apply(this.canvas,arguments);};
Network.prototype.canvasToDOM         = function() {return this.canvas.canvasToDOM.apply(this.canvas,arguments);};
Network.prototype.DOMtoCanvas         = function() {return this.canvas.DOMtoCanvas.apply(this.canvas,arguments);};
Network.prototype.findNode            = function() {return this.clustering.findNode.apply(this.clustering,arguments);};
Network.prototype.isCluster           = function() {return this.clustering.isCluster.apply(this.clustering,arguments);};
Network.prototype.openCluster         = function() {return this.clustering.openCluster.apply(this.clustering,arguments);};
Network.prototype.cluster             = function() {return this.clustering.cluster.apply(this.clustering,arguments);};
Network.prototype.getNodesInCluster   = function() {return this.clustering.getNodesInCluster.apply(this.clustering,arguments);};
Network.prototype.clusterByConnection = function() {return this.clustering.clusterByConnection.apply(this.clustering,arguments);};
Network.prototype.clusterByHubsize    = function() {return this.clustering.clusterByHubsize.apply(this.clustering,arguments);};
Network.prototype.clusterOutliers     = function() {return this.clustering.clusterOutliers.apply(this.clustering,arguments);};
Network.prototype.getSeed             = function() {return this.layoutEngine.getSeed.apply(this.layoutEngine,arguments);};
Network.prototype.enableEditMode      = function() {return this.manipulation.enableEditMode.apply(this.manipulation,arguments);};
Network.prototype.disableEditMode     = function() {return this.manipulation.disableEditMode.apply(this.manipulation,arguments);};
Network.prototype.addNodeMode         = function() {return this.manipulation.addNodeMode.apply(this.manipulation,arguments);};
Network.prototype.editNode            = function() {return this.manipulation.editNode.apply(this.manipulation,arguments);};
Network.prototype.editNodeMode        = function() {console.log("Deprecated: Please use editNode instead of editNodeMode."); return this.manipulation.editNode.apply(this.manipulation,arguments);};
Network.prototype.addEdgeMode         = function() {return this.manipulation.addEdgeMode.apply(this.manipulation,arguments);};
Network.prototype.editEdgeMode        = function() {return this.manipulation.editEdgeMode.apply(this.manipulation,arguments);};
Network.prototype.deleteSelected      = function() {return this.manipulation.deleteSelected.apply(this.manipulation,arguments);};
Network.prototype.getPositions        = function() {return this.nodesHandler.getPositions.apply(this.nodesHandler,arguments);};
Network.prototype.storePositions      = function() {return this.nodesHandler.storePositions.apply(this.nodesHandler,arguments);};
Network.prototype.moveNode            = function() {return this.nodesHandler.moveNode.apply(this.nodesHandler,arguments);};
Network.prototype.getBoundingBox      = function() {return this.nodesHandler.getBoundingBox.apply(this.nodesHandler,arguments);};
Network.prototype.getConnectedNodes   = function(objectId) {
  if (this.body.nodes[objectId] !== undefined) {
    return this.nodesHandler.getConnectedNodes.apply(this.nodesHandler,arguments);
  }
  else {
    return this.edgesHandler.getConnectedNodes.apply(this.edgesHandler,arguments);
  }
};
Network.prototype.getConnectedEdges   = function() {return this.nodesHandler.getConnectedEdges.apply(this.nodesHandler,arguments);};
Network.prototype.startSimulation     = function() {return this.physics.startSimulation.apply(this.physics,arguments);};
Network.prototype.stopSimulation      = function() {return this.physics.stopSimulation.apply(this.physics,arguments);};
Network.prototype.stabilize           = function() {return this.physics.stabilize.apply(this.physics,arguments);};
Network.prototype.getSelection        = function() {return this.selectionHandler.getSelection.apply(this.selectionHandler,arguments);};
Network.prototype.setSelection        = function() {return this.selectionHandler.setSelection.apply(this.selectionHandler,arguments);};
Network.prototype.getSelectedNodes    = function() {return this.selectionHandler.getSelectedNodes.apply(this.selectionHandler,arguments);};
Network.prototype.getSelectedEdges    = function() {return this.selectionHandler.getSelectedEdges.apply(this.selectionHandler,arguments);};
Network.prototype.getNodeAt           = function() {
  var node = this.selectionHandler.getNodeAt.apply(this.selectionHandler,arguments);
  if (node !== undefined && node.id !== undefined) {
    return node.id;
  }
  return node;
};
Network.prototype.getEdgeAt           = function() {
    var edge = this.selectionHandler.getEdgeAt.apply(this.selectionHandler,arguments);
    if (edge !== undefined && edge.id !== undefined) {
      return edge.id;
    }
    return edge;
  };
Network.prototype.selectNodes         = function() {return this.selectionHandler.selectNodes.apply(this.selectionHandler,arguments);};
Network.prototype.selectEdges         = function() {return this.selectionHandler.selectEdges.apply(this.selectionHandler,arguments);};
Network.prototype.unselectAll         = function() {
  this.selectionHandler.unselectAll.apply(this.selectionHandler,arguments);
  this.redraw();
};
Network.prototype.redraw              = function() {return this.renderer.redraw.apply(this.renderer,arguments);};
Network.prototype.getScale            = function() {return this.view.getScale.apply(this.view,arguments);};
Network.prototype.getViewPosition     = function() {return this.view.getViewPosition.apply(this.view,arguments);};
Network.prototype.fit                 = function() {return this.view.fit.apply(this.view,arguments);};
Network.prototype.moveTo              = function() {return this.view.moveTo.apply(this.view,arguments);};
Network.prototype.focus               = function() {return this.view.focus.apply(this.view,arguments);};
Network.prototype.releaseNode         = function() {return this.view.releaseNode.apply(this.view,arguments);};
Network.prototype.getOptionsFromConfigurator = function() {
  let options = {};
  if (this.configurator) {
    options = this.configurator.getOptions.apply(this.configurator);
  }
  return options;
};



module.exports = Network;
