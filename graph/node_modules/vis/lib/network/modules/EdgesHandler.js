var util = require("../../util");
var DataSet = require('../../DataSet');
var DataView = require('../../DataView');
var Edge = require("./components/Edge").default;

/**
 * Handler for Edges
 */
class EdgesHandler {
  /**
   * @param {Object} body
   * @param {Array.<Image>} images
   * @param {Array.<Group>} groups
   */
  constructor(body, images, groups) {
    this.body = body;
    this.images = images;
    this.groups = groups;

    // create the edge API in the body container
    this.body.functions.createEdge = this.create.bind(this);

    this.edgesListeners = {
      add:    (event, params) => {this.add(params.items);},
      update: (event, params) => {this.update(params.items);},
      remove: (event, params) => {this.remove(params.items);}
    };

    this.options = {};
    this.defaultOptions = {
      arrows: {
        to:     {enabled: false, scaleFactor:1, type: 'arrow'},// boolean / {arrowScaleFactor:1} / {enabled: false, arrowScaleFactor:1}
        middle: {enabled: false, scaleFactor:1, type: 'arrow'},
        from:   {enabled: false, scaleFactor:1, type: 'arrow'}
      },
      arrowStrikethrough: true,
      color: {
        color:'#848484',
        highlight:'#848484',
        hover: '#848484',
        inherit: 'from',
        opacity:1.0
      },
      dashes: false,
      font: {
        color: '#343434',
        size: 14, // px
        face: 'arial',
        background: 'none',
        strokeWidth: 2, // px
        strokeColor: '#ffffff',
        align:'horizontal',
        multi: false,
        vadjust: 0,
        bold: {
          mod: 'bold'
        },
        boldital: {
          mod: 'bold italic'
        },
        ital: {
          mod: 'italic'
        },
        mono: {
          mod: '',
          size: 15, // px
          face: 'courier new',
          vadjust: 2
        }
      },
      hidden: false,
      hoverWidth: 1.5,
      label: undefined,
      labelHighlightBold: true,
      length: undefined,
      physics: true,
      scaling:{
        min: 1,
        max: 15,
        label: {
          enabled: true,
          min: 14,
          max: 30,
          maxVisible: 30,
          drawThreshold: 5
        },
        customScalingFunction: function (min,max,total,value) {
          if (max === min) {
            return 0.5;
          }
          else {
            var scale = 1 / (max - min);
            return Math.max(0,(value - min)*scale);
          }
        }
      },
      selectionWidth: 1.5,
      selfReferenceSize:20,
      shadow:{
        enabled: false,
        color: 'rgba(0,0,0,0.5)',
        size:10,
        x:5,
        y:5
      },
      smooth: {
        enabled: true,
        type: "dynamic",
        forceDirection:'none',
        roundness: 0.5
      },
      title:undefined,
      width: 1,
      value: undefined
    };

    util.deepExtend(this.options, this.defaultOptions);

    this.bindEventListeners();
  }

  /**
   * Binds event listeners
   */
  bindEventListeners() {
    // this allows external modules to force all dynamic curves to turn static.
    this.body.emitter.on("_forceDisableDynamicCurves", (type, emit = true) => {
      if (type === 'dynamic') {
        type = 'continuous';
      }
      let dataChanged = false;
      for (let edgeId in this.body.edges) {
        if (this.body.edges.hasOwnProperty(edgeId)) {
          let edge = this.body.edges[edgeId];
          let edgeData = this.body.data.edges._data[edgeId];

          // only forcibly remove the smooth curve if the data has been set of the edge has the smooth curves defined.
          // this is because a change in the global would not affect these curves.
          if (edgeData !== undefined) {
            let smoothOptions = edgeData.smooth;
            if (smoothOptions !== undefined) {
              if (smoothOptions.enabled === true && smoothOptions.type === 'dynamic') {
                if (type === undefined) {
                  edge.setOptions({smooth: false});
                }
                else {
                  edge.setOptions({smooth: {type: type}});
                }
                dataChanged = true;
              }
            }
          }
        }
      }
      if (emit === true && dataChanged === true) {
        this.body.emitter.emit("_dataChanged");
      }
    });

    // this is called when options of EXISTING nodes or edges have changed.
    //
    // NOTE: Not true, called when options have NOT changed, for both existing as well as new nodes.
    //       See update() for logic.
    // TODO: Verify and examine the consequences of this. It might still trigger when
    //       non-option fields have changed, but then reconnecting edges is still useless.
    //       Alternatively, it might also be called when edges are removed.
    //
    this.body.emitter.on("_dataUpdated", () => {
      this.reconnectEdges();
    });

    // refresh the edges. Used when reverting from hierarchical layout
    this.body.emitter.on("refreshEdges", this.refresh.bind(this));
    this.body.emitter.on("refresh",      this.refresh.bind(this));
    this.body.emitter.on("destroy",      () => {
      util.forEach(this.edgesListeners, (callback, event) => {
        if (this.body.data.edges)
          this.body.data.edges.off(event, callback);
      });
      delete this.body.functions.createEdge;
      delete this.edgesListeners.add;
      delete this.edgesListeners.update;
      delete this.edgesListeners.remove;
      delete this.edgesListeners;
    });

  }

  /**
   *
   * @param {Object} options
   */
  setOptions(options) {
    if (options !== undefined) {
      // use the parser from the Edge class to fill in all shorthand notations
      Edge.parseOptions(this.options, options, true, this.defaultOptions, true);

      // update smooth settings in all edges
      let dataChanged = false;
      if (options.smooth !== undefined) {
        for (let edgeId in this.body.edges) {
          if (this.body.edges.hasOwnProperty(edgeId)) {
            dataChanged = this.body.edges[edgeId].updateEdgeType() || dataChanged;
          }
        }
      }

      // update fonts in all edges
      if (options.font !== undefined) {
        for (let edgeId in this.body.edges) {
          if (this.body.edges.hasOwnProperty(edgeId)) {
            this.body.edges[edgeId].updateLabelModule();
          }
        }
      }

      // update the state of the variables if needed
      if (options.hidden !== undefined || options.physics !== undefined  || dataChanged === true) {
        this.body.emitter.emit('_dataChanged');
      }
    }
  }


  /**
   * Load edges by reading the data table
   * @param {Array | DataSet | DataView} edges    The data containing the edges.
   * @param {boolean} [doNotEmit=false]
   * @private
   */
  setData(edges, doNotEmit = false) {
    var oldEdgesData = this.body.data.edges;

    if (edges instanceof DataSet || edges instanceof DataView) {
      this.body.data.edges = edges;
    }
    else if (Array.isArray(edges)) {
      this.body.data.edges = new DataSet();
      this.body.data.edges.add(edges);
    }
    else if (!edges) {
      this.body.data.edges = new DataSet();
    }
    else {
      throw new TypeError('Array or DataSet expected');
    }

    // TODO: is this null or undefined or false?
    if (oldEdgesData) {
      // unsubscribe from old dataset
      util.forEach(this.edgesListeners, (callback, event) => {oldEdgesData.off(event, callback);});
    }

    // remove drawn edges
    this.body.edges = {};

    // TODO: is this null or undefined or false?
    if (this.body.data.edges) {
      // subscribe to new dataset
      util.forEach(this.edgesListeners, (callback, event) =>  {this.body.data.edges.on(event, callback);});

      // draw all new nodes
      var ids = this.body.data.edges.getIds();
      this.add(ids, true);
    }

    this.body.emitter.emit('_adjustEdgesForHierarchicalLayout');
    if (doNotEmit === false) {
      this.body.emitter.emit("_dataChanged");
    }
  }


  /**
   * Add edges
   * @param {number[] | string[]} ids
   * @param {boolean} [doNotEmit=false]
   * @private
   */
  add(ids, doNotEmit = false) {
    var edges = this.body.edges;
    var edgesData = this.body.data.edges;

    for (let i = 0; i < ids.length; i++) {
      var id = ids[i];

      var oldEdge = edges[id];
      if (oldEdge) {
        oldEdge.disconnect();
      }

      var data = edgesData.get(id, {"showInternalIds" : true});
      edges[id] = this.create(data);
    }

    this.body.emitter.emit('_adjustEdgesForHierarchicalLayout');

    if (doNotEmit === false) {
      this.body.emitter.emit("_dataChanged");
    }
  }



  /**
   * Update existing edges, or create them when not yet existing
   * @param {number[] | string[]} ids
   * @private
   */
  update(ids) {
    var edges = this.body.edges;
    var edgesData = this.body.data.edges;
    var dataChanged = false;
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var data = edgesData.get(id);
      var edge = edges[id];
      if (edge !== undefined) {
        // update edge
        edge.disconnect();
        dataChanged = edge.setOptions(data) || dataChanged; // if a support node is added, data can be changed.
        edge.connect();
      }
      else {
        // create edge
        this.body.edges[id] = this.create(data);
        dataChanged = true;
      }
    }

    if (dataChanged === true) {
      this.body.emitter.emit('_adjustEdgesForHierarchicalLayout');
      this.body.emitter.emit("_dataChanged");
    }
    else {
      this.body.emitter.emit("_dataUpdated");
    }
  }


  /**
   * Remove existing edges. Non existing ids will be ignored
   * @param {number[] | string[]} ids
   * @param {boolean} [emit=true]
   * @private
   */
  remove(ids, emit = true) {
    if (ids.length === 0) return;  // early out

    var edges = this.body.edges;
    util.forEach(ids, (id) => {
      var edge = edges[id];
      if (edge !== undefined) {
        edge.remove();
      }
    });

    if (emit) {
      this.body.emitter.emit("_dataChanged");
    }
  }

  /**
   * Refreshes Edge Handler
   */
  refresh() {
    util.forEach(this.body.edges, (edge, edgeId) => {
      let data = this.body.data.edges._data[edgeId];
      if (data !== undefined) {
        edge.setOptions(data);
      }
    });
  }

  /**
   *
   * @param {Object} properties
   * @returns {Edge}
   */
  create(properties) {
    return new Edge(properties, this.body, this.options, this.defaultOptions)
  }

  /**
   * Reconnect all edges
   * @private
   */
  reconnectEdges() {
    var id;
    var nodes = this.body.nodes;
    var edges = this.body.edges;

    for (id in nodes) {
      if (nodes.hasOwnProperty(id)) {
        nodes[id].edges = [];
      }
    }

    for (id in edges) {
      if (edges.hasOwnProperty(id)) {
        var edge = edges[id];
        edge.from = null;
        edge.to = null;
        edge.connect();
      }
    }
  }

  /**
   *
   * @param {Edge.id} edgeId
   * @returns {Array}
   */
  getConnectedNodes(edgeId) {
    let nodeList = [];
    if (this.body.edges[edgeId] !== undefined) {
      let edge = this.body.edges[edgeId];
      if (edge.fromId !== undefined) {nodeList.push(edge.fromId);}
      if (edge.toId !== undefined)   {nodeList.push(edge.toId);}
    }
    return nodeList;
  }

  /**
   * There is no direct relation between the nodes and the edges DataSet,
   * so the right place to do call this is in the handler for event `_dataUpdated`.
   */
  _updateState() {
    this._addMissingEdges();
    this._removeInvalidEdges();
  }

  /**
   * Scan for missing nodes and remove corresponding edges, if any.
   * @private
   */
  _removeInvalidEdges() {
    
    let edgesToDelete = [];

    util.forEach(this.body.edges, (edge, id) => {
      let toNode = this.body.nodes[edge.toId];
      let fromNode = this.body.nodes[edge.fromId];

      // Skip clustering edges here, let the Clustering module handle those
      if ((toNode   !== undefined && toNode.isCluster   === true)
       || (fromNode !== undefined && fromNode.isCluster === true)) {
        return;
      }

      if (toNode === undefined || fromNode === undefined) {
        edgesToDelete.push(id);
      }
    });

    this.remove(edgesToDelete, false);
  }

  /**
   * add all edges from dataset that are not in the cached state
   * @private
   */ 
  _addMissingEdges() {
     let edges = this.body.edges;
     let edgesData = this.body.data.edges;
     let addIds = [];

     edgesData.forEach((edgeData, edgeId) => {
         let edge = edges[edgeId];
         if(edge===undefined) {
           addIds.push(edgeId);
         }
     });
     
     this.add(addIds,true);
   }  
}

export default EdgesHandler;
