let util = require("../../../../util");
let Node = require("../Node").default;

/**
 * A Cluster is a special Node that allows a group of Nodes positioned closely together
 * to be represented by a single Cluster Node.
 *
 * @extends Node
 */
class Cluster extends Node {
  /**
   * @param {Object} options
   * @param {Object} body
   * @param {Array.<HTMLImageElement>}imagelist
   * @param {Array} grouplist
   * @param {Object} globalOptions
   * @param {Object} defaultOptions     Global default options for nodes
   */
  constructor(options, body, imagelist, grouplist, globalOptions, defaultOptions) {
    super(options, body, imagelist, grouplist, globalOptions, defaultOptions);

    this.isCluster = true;
    this.containedNodes = {};
    this.containedEdges = {};
  }


  /**
   * Transfer child cluster data to current and disconnect the child cluster.
   *
   * Please consult the header comment in 'Clustering.js' for the fields set here.
   *
   * @param {string|number} childClusterId  id of child cluster to open
   */
  _openChildCluster(childClusterId) {
    let childCluster = this.body.nodes[childClusterId];
    if (this.containedNodes[childClusterId] === undefined) {
      throw new Error('node with id: ' + childClusterId + ' not in current cluster');
    }
    if (!childCluster.isCluster) {
      throw new Error('node with id: ' + childClusterId + ' is not a cluster');
    }

    // Disconnect child cluster from current cluster
    delete this.containedNodes[childClusterId];
    util.forEach(childCluster.edges, (edge) => {
      delete this.containedEdges[edge.id];
    });

    // Transfer nodes and edges
    util.forEach(childCluster.containedNodes, (node, nodeId) => {
      this.containedNodes[nodeId] = node;
    });
    childCluster.containedNodes = {};

    util.forEach(childCluster.containedEdges, (edge, edgeId) => {
      this.containedEdges[edgeId] = edge;
    });
    childCluster.containedEdges = {};

    // Transfer edges within cluster edges which are clustered
    util.forEach(childCluster.edges, (clusterEdge) => {
      util.forEach(this.edges, (parentClusterEdge) => {
        // Assumption: a clustered edge can only be present in a single clustering edge
        // Not tested here
        let index = parentClusterEdge.clusteringEdgeReplacingIds.indexOf(clusterEdge.id);
        if (index === -1) return;

        util.forEach(clusterEdge.clusteringEdgeReplacingIds, (srcId) => {
          parentClusterEdge.clusteringEdgeReplacingIds.push(srcId);

          // Maintain correct bookkeeping for transferred edge
          this.body.edges[srcId].edgeReplacedById = parentClusterEdge.id;
        });

        // Remove cluster edge from parent cluster edge
        parentClusterEdge.clusteringEdgeReplacingIds.splice(index, 1);
      });
    });
    childCluster.edges = [];
  }
}


export default Cluster;
