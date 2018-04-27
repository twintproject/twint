let util = require("../../util");
let DataSet = require('../../DataSet');
let DataView = require('../../DataView');
var Node = require("./components/Node").default;


/**
 * Handler for Nodes
 */
class NodesHandler {
  /**
   * @param {Object} body
   * @param {Images} images
   * @param {Array.<Group>} groups
   * @param {LayoutEngine} layoutEngine
   */
  constructor(body, images, groups, layoutEngine) {
    this.body = body;
    this.images = images;
    this.groups = groups;
    this.layoutEngine = layoutEngine;

    // create the node API in the body container
    this.body.functions.createNode = this.create.bind(this);

    this.nodesListeners = {
      add: (event, params) => { this.add(params.items); },
      update: (event, params) => { this.update(params.items, params.data, params.oldData); },
      remove: (event, params) => { this.remove(params.items); }
    };

    this.defaultOptions = {
      borderWidth: 1,
      borderWidthSelected: 2,
      brokenImage: undefined,
      color: {
        border: '#2B7CE9',
        background: '#97C2FC',
        highlight: {
          border: '#2B7CE9',
          background: '#D2E5FF'
        },
        hover: {
          border: '#2B7CE9',
          background: '#D2E5FF'
        }
      },
      fixed: {
        x: false,
        y: false
      },
      font: {
        color: '#343434',
        size: 14, // px
        face: 'arial',
        background: 'none',
        strokeWidth: 0, // px
        strokeColor: '#ffffff',
        align: 'center',
        vadjust: 0,
        multi: false,
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
          face: 'monospace',
          vadjust: 2
        }
      },
      group: undefined,
      hidden: false,
      icon: {
        face: 'FontAwesome',  //'FontAwesome',
        code: undefined,  //'\uf007',
        size: 50,  //50,
        color: '#2B7CE9'   //'#aa00ff'
      },
      image: undefined, // --> URL
      label: undefined,
      labelHighlightBold: true,
      level: undefined,
      margin: {
        top: 5,
        right: 5,
        bottom: 5,
        left: 5
      },
      mass: 1,
      physics: true,
      scaling: {
        min: 10,
        max: 30,
        label: {
          enabled: false,
          min: 14,
          max: 30,
          maxVisible: 30,
          drawThreshold: 5
        },
        customScalingFunction: function (min, max, total, value) {
          if (max === min) {
            return 0.5;
          }
          else {
            let scale = 1 / (max - min);
            return Math.max(0, (value - min) * scale);
          }
        }
      },
      shadow: {
        enabled: false,
        color: 'rgba(0,0,0,0.5)',
        size: 10,
        x: 5,
        y: 5
      },
      shape: 'ellipse',
      shapeProperties: {
        borderDashes: false, // only for borders
        borderRadius: 6,     // only for box shape
        interpolation: true,  // only for image and circularImage shapes
        useImageSize: false,  // only for image and circularImage shapes
        useBorderWithImage: false  // only for image shape
      },
      size: 25,
      title: undefined,
      value: undefined,
      x: undefined,
      y: undefined
    };

    // Protect from idiocy
    if (this.defaultOptions.mass <= 0) {
      throw 'Internal error: mass in defaultOptions of NodesHandler may not be zero or negative';
    }

    this.options = util.bridgeObject(this.defaultOptions);

    this.bindEventListeners();
  }

  /**
   * Binds event listeners
   */
  bindEventListeners() {
    // refresh the nodes. Used when reverting from hierarchical layout
    this.body.emitter.on('refreshNodes', this.refresh.bind(this));
    this.body.emitter.on('refresh', this.refresh.bind(this));
    this.body.emitter.on('destroy', () => {
      util.forEach(this.nodesListeners, (callback, event) => {
        if (this.body.data.nodes)
          this.body.data.nodes.off(event, callback);
      });
      delete this.body.functions.createNode;
      delete this.nodesListeners.add;
      delete this.nodesListeners.update;
      delete this.nodesListeners.remove;
      delete this.nodesListeners;
    });
  }

  /**
   *
   * @param {Object} options
   */
  setOptions(options) {
    if (options !== undefined) {
      Node.parseOptions(this.options, options);

      // update the shape in all nodes
      if (options.shape !== undefined) {
        for (let nodeId in this.body.nodes) {
          if (this.body.nodes.hasOwnProperty(nodeId)) {
            this.body.nodes[nodeId].updateShape();
          }
        }
      }

      // update the font in all nodes
      if (options.font !== undefined) {
        for (let nodeId in this.body.nodes) {
          if (this.body.nodes.hasOwnProperty(nodeId)) {
            this.body.nodes[nodeId].updateLabelModule();
            this.body.nodes[nodeId].needsRefresh();
          }
        }
      }

      // update the shape size in all nodes
      if (options.size !== undefined) {
        for (let nodeId in this.body.nodes) {
          if (this.body.nodes.hasOwnProperty(nodeId)) {
            this.body.nodes[nodeId].needsRefresh();
          }
        }
      }

      // update the state of the variables if needed
      if (options.hidden !== undefined || options.physics !== undefined) {
        this.body.emitter.emit('_dataChanged');
      }
    }
  }

  /**
   * Set a data set with nodes for the network
   * @param {Array | DataSet | DataView} nodes         The data containing the nodes.
   * @param {boolean} [doNotEmit=false]
   * @private
   */
  setData(nodes, doNotEmit = false) {
    let oldNodesData = this.body.data.nodes;

    if (nodes instanceof DataSet || nodes instanceof DataView) {
      this.body.data.nodes = nodes;
    }
    else if (Array.isArray(nodes)) {
      this.body.data.nodes = new DataSet();
      this.body.data.nodes.add(nodes);
    }
    else if (!nodes) {
      this.body.data.nodes = new DataSet();
    }
    else {
      throw new TypeError('Array or DataSet expected');
    }

    if (oldNodesData) {
      // unsubscribe from old dataset
      util.forEach(this.nodesListeners, function (callback, event) {
        oldNodesData.off(event, callback);
      });
    }

    // remove drawn nodes
    this.body.nodes = {};

    if (this.body.data.nodes) {
      // subscribe to new dataset
      let me = this;
      util.forEach(this.nodesListeners, function (callback, event) {
        me.body.data.nodes.on(event, callback);
      });

      // draw all new nodes
      let ids = this.body.data.nodes.getIds();
      this.add(ids, true);
    }

    if (doNotEmit === false) {
      this.body.emitter.emit("_dataChanged");
    }
  }


  /**
   * Add nodes
   * @param {number[] | string[]} ids
   * @param {boolean} [doNotEmit=false]
   * @private
   */
  add(ids, doNotEmit = false) {
    let id;
    let newNodes = [];
    for (let i = 0; i < ids.length; i++) {
      id = ids[i];
      let properties = this.body.data.nodes.get(id);
      let node = this.create(properties);
      newNodes.push(node);
      this.body.nodes[id] = node; // note: this may replace an existing node
    }

    this.layoutEngine.positionInitially(newNodes);

    if (doNotEmit === false) {
      this.body.emitter.emit("_dataChanged");
    }
  }

  /**
   * Update existing nodes, or create them when not yet existing
   * @param {number[] | string[]} ids id's of changed nodes
   * @param {Array} changedData array with changed data
   * @param {Array|undefined} oldData optional; array with previous data
   * @private
   */
  update(ids, changedData, oldData) {
    let nodes = this.body.nodes;
    let dataChanged = false;
    for (let i = 0; i < ids.length; i++) {
      let id = ids[i];
      let node = nodes[id];
      let data = changedData[i];
      if (node !== undefined) {
        // update node
        if (node.setOptions(data)) {
          dataChanged = true;
        }
      }
      else {
        dataChanged = true;
        // create node
        node = this.create(data);
        nodes[id] = node;
      }
    }

    if (!dataChanged && oldData !== undefined) {
      // Check for any changes which should trigger a layout recalculation
      // For now, this is just 'level' for hierarchical layout
      // Assumption: old and new data arranged in same order; at time of writing, this holds.
      dataChanged = changedData.some(function(newValue, index) {
        let oldValue = oldData[index];
        return (oldValue && oldValue.level !== newValue.level);
      });
    }

    if (dataChanged === true) {
      this.body.emitter.emit("_dataChanged");
    }
    else {
      this.body.emitter.emit("_dataUpdated");
    }
  }

  /**
   * Remove existing nodes. If nodes do not exist, the method will just ignore it.
   * @param {number[] | string[]} ids
   * @private
   */
  remove(ids) {
    let nodes = this.body.nodes;

    for (let i = 0; i < ids.length; i++) {
      let id = ids[i];
      delete nodes[id];
    }

    this.body.emitter.emit("_dataChanged");
  }


  /**
   * create a node
   * @param {Object} properties
   * @param {class} [constructorClass=Node.default]
   * @returns {*}
   */
  create(properties, constructorClass = Node) {
    return new constructorClass(properties, this.body, this.images, this.groups, this.options, this.defaultOptions)
  }


  /**
   *
   * @param {boolean} [clearPositions=false]
   */
  refresh(clearPositions = false) {
    util.forEach(this.body.nodes, (node, nodeId) => {
      let data = this.body.data.nodes.get(nodeId);
      if (data !== undefined) {
        if (clearPositions === true) {
          node.setOptions({x:null, y:null});
        }
        node.setOptions({ fixed: false });
        node.setOptions(data);
      }
    });
  }


  /**
   * Returns the positions of the nodes.
   * @param {Array.<Node.id>|String} [ids]  --> optional, can be array of nodeIds, can be string
   * @returns {{}}
   */
  getPositions(ids) {
    let dataArray = {};
    if (ids !== undefined) {
      if (Array.isArray(ids) === true) {
        for (let i = 0; i < ids.length; i++) {
          if (this.body.nodes[ids[i]] !== undefined) {
            let node = this.body.nodes[ids[i]];
            dataArray[ids[i]] = { x: Math.round(node.x), y: Math.round(node.y) };
          }
        }
      }
      else {
        if (this.body.nodes[ids] !== undefined) {
          let node = this.body.nodes[ids];
          dataArray[ids] = { x: Math.round(node.x), y: Math.round(node.y) };
        }
      }
    }
    else {
      for (let i = 0; i < this.body.nodeIndices.length; i++) {
        let node = this.body.nodes[this.body.nodeIndices[i]];
        dataArray[this.body.nodeIndices[i]] = { x: Math.round(node.x), y: Math.round(node.y) };
      }
    }
    return dataArray;
  }


  /**
   * Load the XY positions of the nodes into the dataset.
   */
  storePositions() {
    // todo: add support for clusters and hierarchical.
    let dataArray = [];
    var dataset = this.body.data.nodes.getDataSet();

    for (let nodeId in dataset._data) {
      if (dataset._data.hasOwnProperty(nodeId)) {
        let node = this.body.nodes[nodeId];
        if (dataset._data[nodeId].x != Math.round(node.x) || dataset._data[nodeId].y != Math.round(node.y)) {
          dataArray.push({ id: node.id, x: Math.round(node.x), y: Math.round(node.y) });
        }
      }
    }
    dataset.update(dataArray);
  }

  /**
   * get the bounding box of a node.
   * @param {Node.id} nodeId
   * @returns {j|*}
   */
  getBoundingBox(nodeId) {
    if (this.body.nodes[nodeId] !== undefined) {
      return this.body.nodes[nodeId].shape.boundingBox;
    }
  }


  /**
   * Get the Ids of nodes connected to this node.
   * @param {Node.id} nodeId
   * @param {'to'|'from'|undefined} direction values 'from' and 'to' select respectively parent and child nodes only.
   *                                          Any other value returns both parent and child nodes.
   * @returns {Array}
   */
  getConnectedNodes(nodeId, direction) {
    let nodeList = [];
    if (this.body.nodes[nodeId] !== undefined) {
      let node = this.body.nodes[nodeId];
      let nodeObj = {}; // used to quickly check if node already exists
      for (let i = 0; i < node.edges.length; i++) {
        let edge = node.edges[i];
        if (direction !== 'to' && edge.toId == node.id) { // these are double equals since ids can be numeric or string
          if (nodeObj[edge.fromId] === undefined) {
            nodeList.push(edge.fromId);
            nodeObj[edge.fromId] = true;
          }
        }
        else if (direction !== 'from' && edge.fromId == node.id) { // these are double equals since ids can be numeric or string
          if (nodeObj[edge.toId] === undefined) {
            nodeList.push(edge.toId);
            nodeObj[edge.toId] = true;
          }
        }
      }
    }
    return nodeList;
  }

  /**
   * Get the ids of the edges connected to this node.
   * @param {Node.id} nodeId
   * @returns {*}
   */
  getConnectedEdges(nodeId) {
    let edgeList = [];
    if (this.body.nodes[nodeId] !== undefined) {
      let node = this.body.nodes[nodeId];
      for (let i = 0; i < node.edges.length; i++) {
        edgeList.push(node.edges[i].id)
      }
    }
    else {
      console.log("NodeId provided for getConnectedEdges does not exist. Provided: ", nodeId);
    }
    return edgeList;
  }


  /**
   * Move a node.
   *
   * @param {Node.id} nodeId
   * @param {number} x
   * @param {number} y
   */
  moveNode(nodeId, x, y) {
    if (this.body.nodes[nodeId] !== undefined) {
      this.body.nodes[nodeId].x = Number(x);
      this.body.nodes[nodeId].y = Number(y);
      setTimeout(() => {this.body.emitter.emit("startSimulation")},0);
    }
    else {
      console.log("Node id supplied to moveNode does not exist. Provided: ", nodeId);
    }
  }
}

export default NodesHandler;
