/* ===========================================================================

# TODO

- `edgeReplacedById` not cleaned up yet on cluster edge removal
- allowSingleNodeCluster could be a global option as well; currently needs to always
  be passed to clustering methods

----------------------------------------------

# State Model for Clustering

The total state for clustering is non-trivial. It is useful to have a model
available as to how it works. The following documents the relevant state items.


## Network State

The following `network`-members are relevant to clustering:

- `body.nodes`       - all nodes actively participating in the network
- `body.edges`       - same for edges
- `body.nodeIndices` - id's of nodes that are visible at a given moment
- `body.edgeIndices` - same for edges

This includes:

- helper nodes for dragging in `manipulation`
- helper nodes for edge type `dynamic`
- cluster nodes and edges
- there may be more than this.

A node/edge may be missing in the `Indices` member if:

- it is a helper node
- the node or edge state has option `hidden` set
- It is not visible due to clustering


## Clustering State

For the hashes, the id's of the nodes/edges are used as key.

Member `network.clustering` contains the following items:

- `clusteredNodes` - hash with values: { clusterId: <id of cluster>, node: <node instance>}
- `clusteredEdges` - hash with values: restore information for given edge


Due to nesting of clusters, these members can contain cluster nodes and edges as well.

The important thing to note here, is that the clustered nodes and edges also
appear in the members of the cluster nodes. For data update, it is therefore 
important to scan these lists as well as the cluster nodes.


### Cluster Node

A cluster node has the following extra fields:

- `isCluster : true` - indication that this is a cluster node
- `containedNodes`   - hash of nodes contained in this cluster
- `containedEdges`   - same for edges
- `edges`            - array of cluster edges for this node 


**NOTE:**

- `containedEdges` can also contain edges which are not clustered; e.g. an edge
   connecting two nodes in the same cluster.


### Cluster Edge

These are the items in the `edges` member of a clustered node. They have the
following relevant members:

- 'clusteringEdgeReplacingIds` - array of id's of edges replaced by this edge

Note that it's possible to nest clusters, so that `clusteringEdgeReplacingIds`
can contain edge id's of other clusters.


### Clustered Edge

This is any edge contained by a cluster edge. It gets the following additional
member:

- `edgeReplacedById` - id of the cluster edge in which current edge is clustered


   =========================================================================== */
let util = require("../../util");
var NetworkUtil = require('../NetworkUtil').default;
var Cluster = require('./components/nodes/Cluster').default;
var Edge = require('./components/Edge').default;  // Only needed for check on type!
var Node = require('./components/Node').default;  // Only needed for check on type!

/**
 * The clustering engine
 */
class ClusterEngine {
  /**
   * @param {Object} body
   */
  constructor(body) {
    this.body = body;
    this.clusteredNodes = {};  // key: node id, value: { clusterId: <id of cluster>, node: <node instance>}
    this.clusteredEdges = {};  // key: edge id, value: restore information for given edge

    this.options = {};
    this.defaultOptions = {};
    util.extend(this.options, this.defaultOptions);

    this.body.emitter.on('_resetData', () => {this.clusteredNodes = {}; this.clusteredEdges = {};})
  }

  /**
  *
  * @param {number} hubsize
  * @param {Object} options
  */
  clusterByHubsize(hubsize, options) {
    if (hubsize === undefined) {
      hubsize = this._getHubSize();
    }
    else if (typeof(hubsize) === "object") {
      options = this._checkOptions(hubsize);
      hubsize = this._getHubSize();
    }

    let nodesToCluster = [];
    for (let i = 0; i < this.body.nodeIndices.length; i++) {
      let node = this.body.nodes[this.body.nodeIndices[i]];
      if (node.edges.length >= hubsize) {
        nodesToCluster.push(node.id);
      }
    }

    for (let i = 0; i < nodesToCluster.length; i++) {
      this.clusterByConnection(nodesToCluster[i],options,true);
    }

    this.body.emitter.emit('_dataChanged');
  }


  /**
   * loop over all nodes, check if they adhere to the condition and cluster if needed.
   * @param {Object} options
   * @param {boolean} [refreshData=true]
   */
  cluster(options = {}, refreshData = true) {
    if (options.joinCondition === undefined) {throw new Error("Cannot call clusterByNodeData without a joinCondition function in the options.");}

    // check if the options object is fine, append if needed
    options = this._checkOptions(options);

    let childNodesObj = {};
    let childEdgesObj = {};

    // collect the nodes that will be in the cluster
    util.forEach(this.body.nodes, (node, nodeId) => {
      let clonedOptions = NetworkUtil.cloneOptions(node);
      if (options.joinCondition(clonedOptions) === true) {
        childNodesObj[nodeId] = node;

        // collect the edges that will be in the cluster
        util.forEach(node.edges, (edge) => {
          if (this.clusteredEdges[edge.id] === undefined) {
            childEdgesObj[edge.id] = edge;
          }
        });
      }
    });

    this._cluster(childNodesObj, childEdgesObj, options, refreshData);
  }


  /**
   * Cluster all nodes in the network that have only X edges
   * @param {number} edgeCount
   * @param {Object} options
   * @param {boolean} [refreshData=true]
   */
  clusterByEdgeCount(edgeCount, options, refreshData = true) {
    options = this._checkOptions(options);
    let clusters = [];
    let usedNodes = {};
    let edge, edges, relevantEdgeCount;
    // collect the nodes that will be in the cluster
    for (let i = 0; i < this.body.nodeIndices.length; i++) {
      let childNodesObj = {};
      let childEdgesObj = {};
      let nodeId = this.body.nodeIndices[i];
      let node = this.body.nodes[nodeId];

      // if this node is already used in another cluster this session, we do not have to re-evaluate it.
      if (usedNodes[nodeId] === undefined) {
        relevantEdgeCount = 0;
        edges = [];
        for (let j = 0; j < node.edges.length; j++) {
          edge = node.edges[j];
          if (this.clusteredEdges[edge.id] === undefined) {
            if (edge.toId !== edge.fromId) {
              relevantEdgeCount++;
            }
            edges.push(edge);
          }
        }

        // this node qualifies, we collect its neighbours to start the clustering process.
        if (relevantEdgeCount === edgeCount) {
          var checkJoinCondition = function(node) {
            if (options.joinCondition === undefined || options.joinCondition === null) {
              return true;
            }

            let clonedOptions = NetworkUtil.cloneOptions(node);
            return options.joinCondition(clonedOptions);
          }

          let gatheringSuccessful = true;
          for (let j = 0; j < edges.length; j++) {
            edge = edges[j];
            let childNodeId = this._getConnectedId(edge, nodeId);
            // add the nodes to the list by the join condition.
            if (checkJoinCondition(node)) {
              childEdgesObj[edge.id] = edge;
              childNodesObj[nodeId] = node;
              childNodesObj[childNodeId] = this.body.nodes[childNodeId];
              usedNodes[nodeId] = true;
            } else {
              // this node does not qualify after all.
              gatheringSuccessful = false;
              break;
            }
          }

          // add to the cluster queue
          if (Object.keys(childNodesObj).length > 0 && Object.keys(childEdgesObj).length > 0 && gatheringSuccessful === true) {
            /**
             * Search for cluster data that contains any of the node id's
             * @returns {Boolean} true if no joinCondition, otherwise return value of joinCondition
             */
            var findClusterData = function() {
              for (let n = 0; n < clusters.length; ++n) {
                // Search for a cluster containing any of the node id's
                for (var m in childNodesObj) {
                  if (clusters[n].nodes[m] !== undefined) {
                    return clusters[n];
                  }
                }
              }

              return undefined;
            };


            // If any of the found nodes is part of a cluster found in this method,
            // add the current values to that cluster
            var foundCluster = findClusterData();
            if (foundCluster !== undefined) {
              // Add nodes to found cluster if not present
              for (let m in childNodesObj) {
                if (foundCluster.nodes[m] === undefined) {
                  foundCluster.nodes[m] = childNodesObj[m];
                }
              }

              // Add edges to found cluster, if not present
              for (let m in childEdgesObj) {
                if (foundCluster.edges[m] === undefined) {
                  foundCluster.edges[m] = childEdgesObj[m];
                }
              }
            } else {
              // Create a new cluster group
              clusters.push({nodes: childNodesObj, edges: childEdgesObj})
            }
          }
        }
      }
    }

    for (let i = 0; i < clusters.length; i++) {
      this._cluster(clusters[i].nodes, clusters[i].edges, options, false)
    }

    if (refreshData === true) {
      this.body.emitter.emit('_dataChanged');
    }
  }

  /**
   * Cluster all nodes in the network that have only 1 edge
   * @param {Object} options
   * @param {boolean} [refreshData=true]
   */
  clusterOutliers(options, refreshData = true) {
    this.clusterByEdgeCount(1,options,refreshData);
  }

  /**
   * Cluster all nodes in the network that have only 2 edge
   * @param {Object} options
   * @param {boolean} [refreshData=true]
   */
  clusterBridges(options, refreshData = true) {
    this.clusterByEdgeCount(2,options,refreshData);
  }



  /**
  * suck all connected nodes of a node into the node.
  * @param {Node.id} nodeId
  * @param {Object} options
  * @param {boolean} [refreshData=true]
  */
  clusterByConnection(nodeId, options, refreshData = true) {
    // kill conditions
    if (nodeId === undefined)             {throw new Error("No nodeId supplied to clusterByConnection!");}
    if (this.body.nodes[nodeId] === undefined) {throw new Error("The nodeId given to clusterByConnection does not exist!");}

    let node = this.body.nodes[nodeId];
    options = this._checkOptions(options, node);
    if (options.clusterNodeProperties.x === undefined) {options.clusterNodeProperties.x = node.x;}
    if (options.clusterNodeProperties.y === undefined) {options.clusterNodeProperties.y = node.y;}
    if (options.clusterNodeProperties.fixed === undefined) {
      options.clusterNodeProperties.fixed = {};
      options.clusterNodeProperties.fixed.x = node.options.fixed.x;
      options.clusterNodeProperties.fixed.y = node.options.fixed.y;
    }


    let childNodesObj = {};
    let childEdgesObj = {};
    let parentNodeId = node.id;
    let parentClonedOptions = NetworkUtil.cloneOptions(node);
    childNodesObj[parentNodeId] = node;

    // collect the nodes that will be in the cluster
    for (let i = 0; i < node.edges.length; i++) {
      let edge = node.edges[i];
      if (this.clusteredEdges[edge.id] === undefined) {
        let childNodeId = this._getConnectedId(edge, parentNodeId);

        // if the child node is not in a cluster
        if (this.clusteredNodes[childNodeId] === undefined) {
          if (childNodeId !== parentNodeId) {
            if (options.joinCondition === undefined) {
              childEdgesObj[edge.id] = edge;
              childNodesObj[childNodeId] = this.body.nodes[childNodeId];
            }
            else {
              // clone the options and insert some additional parameters that could be interesting.
              let childClonedOptions = NetworkUtil.cloneOptions(this.body.nodes[childNodeId]);
              if (options.joinCondition(parentClonedOptions, childClonedOptions) === true) {
                childEdgesObj[edge.id] = edge;
                childNodesObj[childNodeId] = this.body.nodes[childNodeId];
              }
            }
          }
          else {
            // swallow the edge if it is self-referencing.
            childEdgesObj[edge.id] = edge;
          }
        }
      }
    }
    var childNodeIDs = Object.keys(childNodesObj).map(function(childNode){
      return childNodesObj[childNode].id;
    })

    for (childNode in childNodesObj) {
      if (!childNodesObj.hasOwnProperty(childNode)) continue;

      var childNode = childNodesObj[childNode];
      for (var y=0; y < childNode.edges.length; y++){
        var childEdge = childNode.edges[y];
        if (childNodeIDs.indexOf(this._getConnectedId(childEdge,childNode.id)) > -1){
          childEdgesObj[childEdge.id] = childEdge;
        }
      }
    }
    this._cluster(childNodesObj, childEdgesObj, options, refreshData);
  }


  /**
  * This function creates the edges that will be attached to the cluster
  * It looks for edges that are connected to the nodes from the "outside' of the cluster.
  *
  * @param {{Node.id: vis.Node}} childNodesObj
  * @param {{vis.Edge.id: vis.Edge}} childEdgesObj
  * @param {Object} clusterNodeProperties
  * @param {Object} clusterEdgeProperties
  * @private
  */
  _createClusterEdges (childNodesObj, childEdgesObj, clusterNodeProperties, clusterEdgeProperties) {
    let edge, childNodeId, childNode, toId, fromId, otherNodeId;

    // loop over all child nodes and their edges to find edges going out of the cluster
    // these edges will be replaced by clusterEdges.
    let childKeys = Object.keys(childNodesObj);
    let createEdges = [];
    for (let i = 0; i < childKeys.length; i++) {
      childNodeId = childKeys[i];
      childNode = childNodesObj[childNodeId];

      // construct new edges from the cluster to others
      for (let j = 0; j < childNode.edges.length; j++) {
        edge = childNode.edges[j];
        // we only handle edges that are visible to the system, not the disabled ones from the clustering process.
        if (this.clusteredEdges[edge.id] === undefined) {
          // self-referencing edges will be added to the "hidden" list
          if (edge.toId == edge.fromId) {
            childEdgesObj[edge.id] = edge;
          }
          else {
            // set up the from and to.
            if (edge.toId == childNodeId) { // this is a double equals because ints and strings can be interchanged here.
              toId = clusterNodeProperties.id;
              fromId = edge.fromId;
              otherNodeId = fromId;
            }
            else {
              toId = edge.toId;
              fromId = clusterNodeProperties.id;
              otherNodeId = toId;
            }
          }

          // Only edges from the cluster outwards are being replaced.
          if (childNodesObj[otherNodeId] === undefined) {
            createEdges.push({edge: edge, fromId: fromId, toId: toId});
          }
        }
      }
    }


    //
    // Here we actually create the replacement edges.
    //
    // We could not do this in the loop above as the creation process
    // would add an edge to the edges array we are iterating over.
    //
    // NOTE: a clustered edge can have multiple base edges!
    //
    var newEdges = [];

    /**
     * Find a cluster edge which matches the given created edge.
     * @param {vis.Edge} createdEdge
     * @returns {vis.Edge}
     */
    var getNewEdge = function(createdEdge) {
      for (let j = 0; j < newEdges.length; j++) {
        let newEdge = newEdges[j];

        // We replace both to and from edges with a single cluster edge
        let matchToDirection   = (createdEdge.fromId === newEdge.fromId && createdEdge.toId === newEdge.toId);
        let matchFromDirection = (createdEdge.fromId === newEdge.toId && createdEdge.toId === newEdge.fromId);

        if (matchToDirection || matchFromDirection ) {
          return newEdge;
        }
      }

      return null;
    };


    for (let j = 0; j < createEdges.length; j++) {
      let createdEdge = createEdges[j];
      let edge        = createdEdge.edge;
      let newEdge     = getNewEdge(createdEdge);

      if (newEdge === null) {
        // Create a clustered edge for this connection
        newEdge = this._createClusteredEdge(
          createdEdge.fromId,
          createdEdge.toId,
          edge,
          clusterEdgeProperties);

        newEdges.push(newEdge);
      } else {
        newEdge.clusteringEdgeReplacingIds.push(edge.id);
      }

      // also reference the new edge in the old edge
      this.body.edges[edge.id].edgeReplacedById = newEdge.id;

      // hide the replaced edge
      this._backupEdgeOptions(edge);
      edge.setOptions({physics:false});
    }
  }

  /**
  * This function checks the options that can be supplied to the different cluster functions
  * for certain fields and inserts defaults if needed
  * @param {Object} options
  * @returns {*}
  * @private
  */
  _checkOptions(options = {}) {
    if (options.clusterEdgeProperties === undefined)    {options.clusterEdgeProperties = {};}
    if (options.clusterNodeProperties === undefined)    {options.clusterNodeProperties = {};}

    return options;
  }

  /**
  *
  * @param {Object}    childNodesObj         | object with node objects, id as keys, same as childNodes except it also contains a source node
  * @param {Object}    childEdgesObj         | object with edge objects, id as keys
  * @param {Array}     options               | object with {clusterNodeProperties, clusterEdgeProperties, processProperties}
  * @param {boolean}   refreshData | when true, do not wrap up
  * @private
  */
  _cluster(childNodesObj, childEdgesObj, options, refreshData = true) {
    // Remove nodes which are already clustered
    var tmpNodesToRemove = []
    for (let nodeId in childNodesObj) {
      if (childNodesObj.hasOwnProperty(nodeId)) {
        if (this.clusteredNodes[nodeId] !== undefined) {
          tmpNodesToRemove.push(nodeId);
        }
      }
    }

    for (var n = 0; n < tmpNodesToRemove.length; ++n) {
      delete childNodesObj[tmpNodesToRemove[n]];
    }

    // kill condition: no nodes don't bother
    if (Object.keys(childNodesObj).length == 0) {return;}

    // allow clusters of 1 if options allow
    if (Object.keys(childNodesObj).length == 1 && options.clusterNodeProperties.allowSingleNodeCluster != true) {return;}

    let clusterNodeProperties = util.deepExtend({},options.clusterNodeProperties);

    // construct the clusterNodeProperties
    if (options.processProperties !== undefined) {
      // get the childNode options
      let childNodesOptions = [];
      for (let nodeId in childNodesObj) {
        if (childNodesObj.hasOwnProperty(nodeId)) {
          let clonedOptions = NetworkUtil.cloneOptions(childNodesObj[nodeId]);
          childNodesOptions.push(clonedOptions);
        }
      }

      // get cluster properties based on childNodes
      let childEdgesOptions = [];
      for (let edgeId in childEdgesObj) {
        if (childEdgesObj.hasOwnProperty(edgeId)) {
          // these cluster edges will be removed on creation of the cluster.
          if (edgeId.substr(0, 12) !== "clusterEdge:") {
            let clonedOptions = NetworkUtil.cloneOptions(childEdgesObj[edgeId], 'edge');
            childEdgesOptions.push(clonedOptions);
          }
        }
      }

      clusterNodeProperties = options.processProperties(clusterNodeProperties, childNodesOptions, childEdgesOptions);
      if (!clusterNodeProperties) {
        throw new Error("The processProperties function does not return properties!");
      }
    }

    // check if we have an unique id;
    if (clusterNodeProperties.id === undefined) {clusterNodeProperties.id = 'cluster:' + util.randomUUID();}
    let clusterId = clusterNodeProperties.id;

    if (clusterNodeProperties.label === undefined) {
      clusterNodeProperties.label = 'cluster';
    }


    // give the clusterNode a position if it does not have one.
    let pos = undefined;
    if (clusterNodeProperties.x === undefined) {
      pos = this._getClusterPosition(childNodesObj);
      clusterNodeProperties.x = pos.x;
    }
    if (clusterNodeProperties.y === undefined) {
      if (pos === undefined) {pos = this._getClusterPosition(childNodesObj);}
      clusterNodeProperties.y = pos.y;
    }

    // force the ID to remain the same
    clusterNodeProperties.id = clusterId;

    // create the cluster Node
    // Note that allowSingleNodeCluster, if present, is stored in the options as well
    let clusterNode = this.body.functions.createNode(clusterNodeProperties, Cluster);
    clusterNode.containedNodes = childNodesObj;
    clusterNode.containedEdges = childEdgesObj;
    // cache a copy from the cluster edge properties if we have to reconnect others later on
    clusterNode.clusterEdgeProperties = options.clusterEdgeProperties;

    // finally put the cluster node into global
    this.body.nodes[clusterNodeProperties.id] = clusterNode;

    this._clusterEdges(childNodesObj, childEdgesObj, clusterNodeProperties, options.clusterEdgeProperties);

    // set ID to undefined so no duplicates arise
    clusterNodeProperties.id = undefined;

    // wrap up
    if (refreshData === true) {
      this.body.emitter.emit('_dataChanged');
    }
  }

  /**
   *
   * @param {Edge} edge
   * @private
   */
  _backupEdgeOptions(edge) {
    if (this.clusteredEdges[edge.id] === undefined) {
      this.clusteredEdges[edge.id] = {physics: edge.options.physics};
    }
  }

  /**
   *
   * @param {Edge} edge
   * @private
   */
  _restoreEdge(edge) {
    let originalOptions = this.clusteredEdges[edge.id];
    if (originalOptions !== undefined) {
      edge.setOptions({physics: originalOptions.physics});
      delete this.clusteredEdges[edge.id];
    }
  }


  /**
  * Check if a node is a cluster.
  * @param {Node.id} nodeId
  * @returns {*}
  */
  isCluster(nodeId) {
    if (this.body.nodes[nodeId] !== undefined) {
      return this.body.nodes[nodeId].isCluster === true;
    }
    else {
      console.log("Node does not exist.");
      return false;
    }
  }

  /**
  * get the position of the cluster node based on what's inside
  * @param {object} childNodesObj    | object with node objects, id as keys
  * @returns {{x: number, y: number}}
  * @private
  */
  _getClusterPosition(childNodesObj) {
    let childKeys = Object.keys(childNodesObj);
    let minX = childNodesObj[childKeys[0]].x;
    let maxX = childNodesObj[childKeys[0]].x;
    let minY = childNodesObj[childKeys[0]].y;
    let maxY = childNodesObj[childKeys[0]].y;
    let node;
    for (let i = 1; i < childKeys.length; i++) {
      node = childNodesObj[childKeys[i]];
      minX = node.x < minX ? node.x : minX;
      maxX = node.x > maxX ? node.x : maxX;
      minY = node.y < minY ? node.y : minY;
      maxY = node.y > maxY ? node.y : maxY;
    }


    return {x: 0.5*(minX + maxX), y: 0.5*(minY + maxY)};
  }



  /**
   * Open a cluster by calling this function.
   * @param {vis.Edge.id}  clusterNodeId | the ID of the cluster node
   * @param {Object} options
   * @param {boolean} refreshData | wrap up afterwards if not true
   */
  openCluster(clusterNodeId, options, refreshData = true) {
    // kill conditions
    if (clusterNodeId === undefined) {
      throw new Error("No clusterNodeId supplied to openCluster.");
    }

    let clusterNode = this.body.nodes[clusterNodeId];

    if (clusterNode === undefined) {
      throw new Error("The clusterNodeId supplied to openCluster does not exist.");
    }
    if (clusterNode.isCluster !== true
     || clusterNode.containedNodes === undefined
     || clusterNode.containedEdges === undefined) {
      throw new Error("The node:" + clusterNodeId + " is not a valid cluster.");
    }

    // Check if current cluster is clustered itself
    let stack = this.findNode(clusterNodeId);
    let parentIndex = stack.indexOf(clusterNodeId) - 1;
    if (parentIndex >= 0) {
      // Current cluster is clustered; transfer contained nodes and edges to parent
      let parentClusterNodeId = stack[parentIndex];
      let parentClusterNode   = this.body.nodes[parentClusterNodeId];

      // clustering.clusteredNodes and clustering.clusteredEdges remain unchanged
      parentClusterNode._openChildCluster(clusterNodeId);

      // All components of child cluster node have been transferred. It can die now.
      delete this.body.nodes[clusterNodeId];
      if (refreshData === true) {
        this.body.emitter.emit('_dataChanged');
      }

      return;
    }

    // main body 
    let containedNodes = clusterNode.containedNodes;
    let containedEdges = clusterNode.containedEdges;

    // allow the user to position the nodes after release.
    if (options !== undefined && options.releaseFunction !== undefined && typeof options.releaseFunction === 'function') {
      let positions = {};
      let clusterPosition = {x:clusterNode.x, y:clusterNode.y};
      for (let nodeId in containedNodes) {
        if (containedNodes.hasOwnProperty(nodeId)) {
          let containedNode = this.body.nodes[nodeId];
          positions[nodeId] = {x: containedNode.x, y: containedNode.y};
        }
      }
      let newPositions = options.releaseFunction(clusterPosition, positions);

      for (let nodeId in containedNodes) {
        if (containedNodes.hasOwnProperty(nodeId)) {
          let containedNode = this.body.nodes[nodeId];
          if (newPositions[nodeId] !== undefined) {
            containedNode.x = (newPositions[nodeId].x === undefined ? clusterNode.x : newPositions[nodeId].x);
            containedNode.y = (newPositions[nodeId].y === undefined ? clusterNode.y : newPositions[nodeId].y);
          }
        }
      }
    }
    else {
      // copy the position from the cluster
      util.forEach(containedNodes, function(containedNode) {
        // inherit position
        if (containedNode.options.fixed.x === false) {containedNode.x = clusterNode.x;}
        if (containedNode.options.fixed.y === false) {containedNode.y = clusterNode.y;}
      });
    }

    // release nodes
    for (let nodeId in containedNodes) {
      if (containedNodes.hasOwnProperty(nodeId)) {
        let containedNode = this.body.nodes[nodeId];

        // inherit speed
        containedNode.vx = clusterNode.vx;
        containedNode.vy = clusterNode.vy;

        containedNode.setOptions({physics:true});

        delete this.clusteredNodes[nodeId];
      }
    }

    // copy the clusterNode edges because we cannot iterate over an object that we add or remove from.
    let edgesToBeDeleted = [];
    for (let i = 0; i < clusterNode.edges.length; i++) {
      edgesToBeDeleted.push(clusterNode.edges[i]);
    }

    // actually handling the deleting.
    for (let i = 0; i < edgesToBeDeleted.length; i++) {
      let edge         = edgesToBeDeleted[i];
      let otherNodeId  = this._getConnectedId(edge, clusterNodeId);
      let otherNode    = this.clusteredNodes[otherNodeId];

      for (let j = 0; j < edge.clusteringEdgeReplacingIds.length; j++) {
        let transferId = edge.clusteringEdgeReplacingIds[j];
        let transferEdge = this.body.edges[transferId];
        if (transferEdge === undefined) continue; 

        // if the other node is in another cluster, we transfer ownership of this edge to the other cluster
        if (otherNode !== undefined) {
          // transfer ownership:
          let otherCluster = this.body.nodes[otherNode.clusterId];
          otherCluster.containedEdges[transferEdge.id] = transferEdge;

          // delete local reference
          delete containedEdges[transferEdge.id];

          // get to and from
          let fromId = transferEdge.fromId;
          let toId = transferEdge.toId;
          if (transferEdge.toId == otherNodeId) {
            toId = otherNode.clusterId;
          }
          else {
            fromId = otherNode.clusterId;
          }

          // create new cluster edge from the otherCluster
          this._createClusteredEdge(
            fromId,
            toId,
            transferEdge,
            otherCluster.clusterEdgeProperties,
            {hidden: false, physics: true});

        } else {
          this._restoreEdge(transferEdge);
        }
      }

      edge.remove();
    }

    // handle the releasing of the edges
    for (let edgeId in containedEdges) {
      if (containedEdges.hasOwnProperty(edgeId)) {
        this._restoreEdge(containedEdges[edgeId]);
      }
    }

    // remove clusterNode
    delete this.body.nodes[clusterNodeId];

    if (refreshData === true) {
      this.body.emitter.emit('_dataChanged');
    }
  }

  /**
   *
   * @param {Cluster.id} clusterId
   * @returns {Array.<Node.id>}
   */
  getNodesInCluster(clusterId) {
    let nodesArray = [];
    if (this.isCluster(clusterId) === true) {
      let containedNodes = this.body.nodes[clusterId].containedNodes;
      for (let nodeId in containedNodes) {
        if (containedNodes.hasOwnProperty(nodeId)) {
          nodesArray.push(this.body.nodes[nodeId].id)
        }
      }
    }

    return nodesArray;
  }

  /**
  * Get the stack clusterId's that a certain node resides in. cluster A -> cluster B -> cluster C -> node
  *
  * If a node can't be found in the chain, return an empty array.
  *
  * @param {string|number} nodeId
  * @returns {Array}
  */
  findNode(nodeId) {
    let stack = [];
    let max = 100;
    let counter = 0;
    let node;

    while (this.clusteredNodes[nodeId] !== undefined && counter < max) {
      node = this.body.nodes[nodeId]
      if (node === undefined) return [];
      stack.push(node.id);

      nodeId = this.clusteredNodes[nodeId].clusterId;
      counter++;
    }

    node = this.body.nodes[nodeId]
    if (node === undefined) return [];
    stack.push(node.id);

    stack.reverse();
    return stack;
  }

  /**
  * Using a clustered nodeId, update with the new options
  * @param {vis.Edge.id} clusteredNodeId
  * @param {object} newOptions
  */
  updateClusteredNode(clusteredNodeId, newOptions) {
    if (clusteredNodeId === undefined) {throw new Error("No clusteredNodeId supplied to updateClusteredNode.");}
    if (newOptions === undefined) {throw new Error("No newOptions supplied to updateClusteredNode.");}
    if (this.body.nodes[clusteredNodeId] === undefined)   {throw new Error("The clusteredNodeId supplied to updateClusteredNode does not exist.");}

    this.body.nodes[clusteredNodeId].setOptions(newOptions);
    this.body.emitter.emit('_dataChanged');
  }

  /**
  * Using a base edgeId, update all related clustered edges with the new options
  * @param {vis.Edge.id} startEdgeId
  * @param {object} newOptions
  */
  updateEdge(startEdgeId, newOptions) {
    if (startEdgeId === undefined) {throw new Error("No startEdgeId supplied to updateEdge.");}
    if (newOptions === undefined) {throw new Error("No newOptions supplied to updateEdge.");}
    if (this.body.edges[startEdgeId] === undefined)   {throw new Error("The startEdgeId supplied to updateEdge does not exist.");}

    let allEdgeIds = this.getClusteredEdges(startEdgeId);
    for (let i = 0; i < allEdgeIds.length; i++) {
      var edge = this.body.edges[allEdgeIds[i]];
      edge.setOptions(newOptions);
    }
    this.body.emitter.emit('_dataChanged');
  }

  /**
  * Get a stack of clusterEdgeId's (+base edgeid) that a base edge is the same as. cluster edge C -> cluster edge B -> cluster edge A -> base edge(edgeId)
  * @param {vis.Edge.id} edgeId
  * @returns {Array.<vis.Edge.id>}
  */
  getClusteredEdges(edgeId) {
    let stack = [];
    let max = 100;
    let counter = 0;

    while (edgeId !== undefined && this.body.edges[edgeId] !== undefined && counter < max) {
      stack.push(this.body.edges[edgeId].id);
      edgeId = this.body.edges[edgeId].edgeReplacedById;
      counter++;
    }
    stack.reverse();
    return stack;
  }

  /**
  * Get the base edge id of clusterEdgeId. cluster edge (clusteredEdgeId) -> cluster edge B -> cluster edge C -> base edge
  * @param {vis.Edge.id} clusteredEdgeId
  * @returns {vis.Edge.id} baseEdgeId
  *
  * TODO: deprecate in 5.0.0. Method getBaseEdges() is the correct one to use.
  */
  getBaseEdge(clusteredEdgeId) {
    // Just kludge this by returning the first base edge id found
    return this.getBaseEdges(clusteredEdgeId)[0];
  }


  /**
   * Get all regular edges for this clustered edge id.
   *
   * @param {vis.Edge.id} clusteredEdgeId
   * @returns {Array.<vis.Edge.id>} all baseEdgeId's under this clustered edge
   */
  getBaseEdges(clusteredEdgeId) {
    let IdsToHandle = [clusteredEdgeId];
    let doneIds     = [];
    let foundIds    = [];
    let max     = 100;
    let counter = 0;

    while (IdsToHandle.length > 0 && counter < max) {
      let nextId = IdsToHandle.pop();
      if (nextId === undefined) continue;     // Paranoia here and onwards
      let nextEdge = this.body.edges[nextId];
      if (nextEdge === undefined) continue;
      counter++;

      let replacingIds = nextEdge.clusteringEdgeReplacingIds;
      if (replacingIds === undefined) {
        // nextId is a base id
        foundIds.push(nextId);
      } else {
        // Another cluster edge, unravel this one as well
        for (let i = 0; i < replacingIds.length; ++i) {
          let replacingId = replacingIds[i];

          // Don't add if already handled
          // TODO: never triggers; find a test-case which does
          if (IdsToHandle.indexOf(replacingIds) !== -1 || doneIds.indexOf(replacingIds) !== -1) {
            continue;
          }

          IdsToHandle.push(replacingId);
        }
      }

      doneIds.push(nextId);
    }

    return foundIds;
  }


  /**
  * Get the Id the node is connected to
  * @param {vis.Edge} edge
  * @param {Node.id} nodeId
  * @returns {*}
  * @private
  */
  _getConnectedId(edge, nodeId) {
    if (edge.toId != nodeId) {
      return edge.toId;
    }
    else if (edge.fromId != nodeId) {
      return edge.fromId;
    }
    else {
      return edge.fromId;
    }
  }

  /**
  * We determine how many connections denote an important hub.
  * We take the mean + 2*std as the important hub size. (Assuming a normal distribution of data, ~2.2%)
  *
  * @returns {number}
  * @private
  */
  _getHubSize() {
    let average = 0;
    let averageSquared = 0;
    let hubCounter = 0;
    let largestHub = 0;

    for (let i = 0; i < this.body.nodeIndices.length; i++) {
      let node = this.body.nodes[this.body.nodeIndices[i]];
      if (node.edges.length > largestHub) {
        largestHub = node.edges.length;
      }
      average += node.edges.length;
      averageSquared += Math.pow(node.edges.length,2);
      hubCounter += 1;
    }
    average = average / hubCounter;
    averageSquared = averageSquared / hubCounter;

    let variance = averageSquared - Math.pow(average,2);
    let standardDeviation = Math.sqrt(variance);

    let hubThreshold = Math.floor(average + 2*standardDeviation);

    // always have at least one to cluster
    if (hubThreshold > largestHub) {
      hubThreshold = largestHub;
    }

    return hubThreshold;
  }


  /**
   * Create an edge for the cluster representation.
   *
   * @param {Node.id} fromId
   * @param {Node.id} toId
   * @param {vis.Edge} baseEdge
   * @param {Object} clusterEdgeProperties
   * @param {Object} extraOptions
   * @returns {Edge} newly created clustered edge
   * @private
   */
  _createClusteredEdge(fromId, toId, baseEdge, clusterEdgeProperties, extraOptions) {
    // copy the options of the edge we will replace
    let clonedOptions = NetworkUtil.cloneOptions(baseEdge, 'edge');
    // make sure the properties of clusterEdges are superimposed on it
    util.deepExtend(clonedOptions, clusterEdgeProperties);

    // set up the edge
    clonedOptions.from = fromId;
    clonedOptions.to   = toId;
    clonedOptions.id   = 'clusterEdge:' + util.randomUUID();

    // apply the edge specific options to it if specified
    if (extraOptions !== undefined) {
      util.deepExtend(clonedOptions, extraOptions);
    }

    let newEdge = this.body.functions.createEdge(clonedOptions);
    newEdge.clusteringEdgeReplacingIds = [baseEdge.id];
    newEdge.connect();

    // Register the new edge
    this.body.edges[newEdge.id] = newEdge;

    return newEdge;
  }


  /**
   * Add the passed child nodes and edges to the given cluster node.
   *
   * @param {Object|Node} childNodes  hash of nodes or single node to add in cluster
   * @param {Object|Edge} childEdges  hash of edges or single edge to take into account when clustering
   * @param {Node} clusterNode  cluster node to add nodes and edges to
   * @param {Object} [clusterEdgeProperties]
   * @private
   */
  _clusterEdges(childNodes, childEdges, clusterNode, clusterEdgeProperties) {
    if (childEdges instanceof Edge) {
      let edge = childEdges;
      let obj = {};
      obj[edge.id] = edge;
      childEdges = obj;
    }

    if (childNodes instanceof Node) {
      let node = childNodes;
      let obj = {};
      obj[node.id] = node;
      childNodes = obj;
    }

    if (clusterNode === undefined || clusterNode === null) {
      throw new Error("_clusterEdges: parameter clusterNode required");
    }

    if (clusterEdgeProperties === undefined) {
      // Take the required properties from the cluster node
      clusterEdgeProperties = clusterNode.clusterEdgeProperties;
    }

    // create the new edges that will connect to the cluster.
    // All self-referencing edges will be added to childEdges here.
    this._createClusterEdges(childNodes, childEdges, clusterNode, clusterEdgeProperties);

    // disable the childEdges
    for (let edgeId in childEdges) {
      if (childEdges.hasOwnProperty(edgeId)) {
        if (this.body.edges[edgeId] !== undefined) {
          let edge = this.body.edges[edgeId];
          // cache the options before changing
          this._backupEdgeOptions(edge);
          // disable physics and hide the edge
          edge.setOptions({physics:false});
        }
      }
    }

    // disable the childNodes
    for (let nodeId in childNodes) {
      if (childNodes.hasOwnProperty(nodeId)) {
        this.clusteredNodes[nodeId] = {clusterId:clusterNode.id, node: this.body.nodes[nodeId]};
        this.body.nodes[nodeId].setOptions({physics:false});
      }
    }
  }


  /**
   * Determine in which cluster given nodeId resides.
   *
   * If not in cluster, return undefined.
   *
   * NOTE: If you know a cleaner way to do this, please enlighten me (wimrijnders).
   *
   * @param {Node.id} nodeId
   * @returns {Node|undefined} Node instance for cluster, if present
   * @private
   */
  _getClusterNodeForNode(nodeId) {
    if (nodeId === undefined) return undefined;
    let clusteredNode = this.clusteredNodes[nodeId];

    // NOTE: If no cluster info found, it should actually be an error
    if (clusteredNode === undefined) return undefined;
    let clusterId = clusteredNode.clusterId;
    if (clusterId === undefined) return undefined;

    return this.body.nodes[clusterId];
  }


  /**
   * Internal helper function for conditionally removing items in array
   *
   * Done like this because Array.filter() is not fully supported by all IE's.
   *
   * @param {Array} arr
   * @param {function} callback
   * @returns {Array}
   * @private
   */
  _filter(arr, callback) {
    let ret = [];

    util.forEach(arr, (item) => {
      if (callback(item)) {
        ret.push(item);
      }
    });

    return ret;
  }


  /**
   * Scan all edges for changes in clustering and adjust this if necessary.
   *
   * Call this (internally) after there has been a change in node or edge data.
   *
   * Pre: States of this.body.nodes and this.body.edges consistent
   * Pre: this.clusteredNodes and this.clusteredEdge consistent with containedNodes and containedEdges
   *      of cluster nodes.
   */
  _updateState() {
    let nodeId;
    let deletedNodeIds = [];
    let deletedEdgeIds = [];

    /**
     * Utility function to iterate over clustering nodes only
     *
     * @param {Function} callback  function to call for each cluster node
     */
    let eachClusterNode = (callback) => {
      util.forEach(this.body.nodes, (node) => {
        if (node.isCluster === true) {
          callback(node);
        }
      });
    };


    //
    // Remove deleted regular nodes from clustering
    //

    // Determine the deleted nodes
    for (nodeId in this.clusteredNodes) {
      if (!this.clusteredNodes.hasOwnProperty(nodeId)) continue;
      let node = this.body.nodes[nodeId];

      if (node === undefined) {
        deletedNodeIds.push(nodeId);
      }
    }

    // Remove nodes from cluster nodes
    eachClusterNode(function(clusterNode) {
      for (let n = 0; n < deletedNodeIds.length; n++) {
        delete clusterNode.containedNodes[deletedNodeIds[n]];
      }
    });

    // Remove nodes from cluster list
    for (let n = 0; n < deletedNodeIds.length; n++) {
      delete this.clusteredNodes[deletedNodeIds[n]];
    }


    //
    // Remove deleted edges from clustering
    //

    // Add the deleted clustered edges to the list
    util.forEach(this.clusteredEdges, (edgeId) => {
      let edge = this.body.edges[edgeId];
      if (edge === undefined || !edge.endPointsValid()) {
        deletedEdgeIds.push(edgeId);
      }
    });

    // Cluster nodes can also contain edges which are not clustered, 
    // i.e. nodes 1-2 within cluster with an edge in between.
    // So the cluster nodes also need to be scanned for invalid edges
    eachClusterNode(function(clusterNode) {
      util.forEach(clusterNode.containedEdges, (edge, edgeId) => {
        if (!edge.endPointsValid() && deletedEdgeIds.indexOf(edgeId) === -1) {
          deletedEdgeIds.push(edgeId);
        }
      });
    });

    // Also scan for cluster edges which need to be removed in the active list.
    // Regular edges have been removed beforehand, so this only picks up the cluster edges.
    util.forEach(this.body.edges, (edge, edgeId) => {
      // Explicitly scan the contained edges for validity
      let isValid = true;
      let replacedIds = edge.clusteringEdgeReplacingIds;
      if (replacedIds !== undefined) {
        let numValid = 0;

        util.forEach(replacedIds, (containedEdgeId) => {
          let containedEdge   = this.body.edges[containedEdgeId];

          if (containedEdge !== undefined && containedEdge.endPointsValid()) {
            numValid += 1;
          }
        });

        isValid = (numValid > 0);
      }

      if (!edge.endPointsValid() || !isValid) {
        deletedEdgeIds.push(edgeId);
      }
    });

    // Remove edges from cluster nodes
    eachClusterNode((clusterNode) => {
      util.forEach(deletedEdgeIds, (deletedEdgeId) => {
        delete clusterNode.containedEdges[deletedEdgeId];

        util.forEach(clusterNode.edges, (edge, m) => {
          if (edge.id === deletedEdgeId) {
            clusterNode.edges[m] = null;  // Don't want to directly delete here, because in the loop
            return;
          }

          edge.clusteringEdgeReplacingIds = this._filter(edge.clusteringEdgeReplacingIds, function(id) {
            return deletedEdgeIds.indexOf(id) === -1;
          });
        });

        // Clean up the nulls
        clusterNode.edges = this._filter(clusterNode.edges, function(item) {return item !== null});
      });
    });


    // Remove from cluster list
    util.forEach(deletedEdgeIds, (edgeId) => {
      delete this.clusteredEdges[edgeId];
    });

    // Remove cluster edges from active list (this.body.edges).
    // deletedEdgeIds still contains id of regular edges, but these should all
    // be gone when you reach here.
    util.forEach(deletedEdgeIds, (edgeId) => {
      delete this.body.edges[edgeId];
    });


    //
    // Check changed cluster state of edges
    //

    // Iterating over keys here, because edges may be removed in the loop
    let ids = Object.keys(this.body.edges);
    util.forEach(ids, (edgeId) => {
      let edge = this.body.edges[edgeId];

      let shouldBeClustered = this._isClusteredNode(edge.fromId) || this._isClusteredNode(edge.toId);
      if (shouldBeClustered === this._isClusteredEdge(edge.id)) {
        return;  // all is well
      }

      if (shouldBeClustered) {
        // add edge to clustering
        let clusterFrom = this._getClusterNodeForNode(edge.fromId);
        if (clusterFrom !== undefined) {
          this._clusterEdges(this.body.nodes[edge.fromId], edge, clusterFrom);
        }

        let clusterTo = this._getClusterNodeForNode(edge.toId);
        if (clusterTo !== undefined) {
          this._clusterEdges(this.body.nodes[edge.toId], edge, clusterTo);
        }

				// TODO: check that it works for both edges clustered
        //       (This might be paranoia)
      } else {
        // This should not be happening, the state should
        // be properly updated at this point.
        // 
        // If it *is* reached during normal operation, then we have to implement
        // undo clustering for this edge here.
        throw new Error('remove edge from clustering not implemented!');
      }
    });


    // Clusters may be nested to any level. Keep on opening until nothing to open
    var changed = false;
    var continueLoop = true;
    while (continueLoop) {
      let clustersToOpen = [];

      // Determine the id's of clusters that need opening
      eachClusterNode(function(clusterNode) {
        let numNodes = Object.keys(clusterNode.containedNodes).length;
        let allowSingle = (clusterNode.options.allowSingleNodeCluster === true);
        if ((allowSingle && numNodes < 1) || (!allowSingle && numNodes < 2)) {
          clustersToOpen.push(clusterNode.id);
        }
      });

      // Open them
      for (let n = 0; n < clustersToOpen.length; ++n) {
        this.openCluster(clustersToOpen[n], {}, false /* Don't refresh, we're in an refresh/update already */);
      }

      continueLoop = (clustersToOpen.length > 0);
      changed = changed || continueLoop;
    }

    if (changed) {
      this._updateState() // Redo this method (recursion possible! should be safe)
    }
  }


 /**
  * Determine if node with given id is part of a cluster.
  *
  * @param {Node.id} nodeId
  * @return {boolean} true if part of a cluster.
  */
  _isClusteredNode(nodeId) {
    return this.clusteredNodes[nodeId] !== undefined;
  }


 /**
  * Determine if edge with given id is not visible due to clustering.
  *
  * An edge is considered clustered if:
  * - it is directly replaced by a clustering edge
  * - any of its connecting nodes is in a cluster
  *
  * @param {vis.Edge.id} edgeId
  * @return {boolean} true if part of a cluster.
  */
  _isClusteredEdge(edgeId) {
    return this.clusteredEdges[edgeId] !== undefined;
  }
}


export default ClusterEngine;
