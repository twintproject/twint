/**
 * Spring Solver
 */
class SpringSolver {
  /**
   * @param {Object} body
   * @param {{physicsNodeIndices: Array, physicsEdgeIndices: Array, forces: {}, velocities: {}}} physicsBody
   * @param {Object} options
   */
  constructor(body, physicsBody, options) {
    this.body = body;
    this.physicsBody = physicsBody;
    this.setOptions(options);
  }

  /**
   *
   * @param {Object} options
   */
  setOptions(options) {
    this.options = options;
  }

  /**
   * This function calculates the springforces on the nodes, accounting for the support nodes.
   *
   * @private
   */
  solve() {
    let edgeLength, edge;
    let edgeIndices = this.physicsBody.physicsEdgeIndices;
    let edges = this.body.edges;
    let node1, node2, node3;

    // forces caused by the edges, modelled as springs
    for (let i = 0; i < edgeIndices.length; i++) {
      edge = edges[edgeIndices[i]];
      if (edge.connected === true && edge.toId !== edge.fromId) {
        // only calculate forces if nodes are in the same sector
        if (this.body.nodes[edge.toId] !== undefined && this.body.nodes[edge.fromId] !== undefined) {
          if (edge.edgeType.via !== undefined) {
            edgeLength = edge.options.length === undefined ? this.options.springLength : edge.options.length;
            node1 = edge.to;
            node2 = edge.edgeType.via;
            node3 = edge.from;

            this._calculateSpringForce(node1, node2, 0.5 * edgeLength);
            this._calculateSpringForce(node2, node3, 0.5 * edgeLength);
          }
          else {
            // the * 1.5 is here so the edge looks as large as a smooth edge. It does not initially because the smooth edges use
            // the support nodes which exert a repulsive force on the to and from nodes, making the edge appear larger.
            edgeLength = edge.options.length === undefined ? this.options.springLength * 1.5: edge.options.length;
            this._calculateSpringForce(edge.from, edge.to, edgeLength);
          }
        }
      }
    }
  }


  /**
   * This is the code actually performing the calculation for the function above.
   *
   * @param {Node} node1
   * @param {Node} node2
   * @param {number} edgeLength
   * @private
   */
  _calculateSpringForce(node1, node2, edgeLength) {
    let dx = (node1.x - node2.x);
    let dy = (node1.y - node2.y);
    let distance = Math.max(Math.sqrt(dx * dx + dy * dy),0.01);

    // the 1/distance is so the fx and fy can be calculated without sine or cosine.
    let springForce = this.options.springConstant * (edgeLength - distance) / distance;

    let fx = dx * springForce;
    let fy = dy * springForce;

    // handle the case where one node is not part of the physcis
    if (this.physicsBody.forces[node1.id] !== undefined) {
      this.physicsBody.forces[node1.id].x += fx;
      this.physicsBody.forces[node1.id].y += fy;
    }

    if (this.physicsBody.forces[node2.id] !== undefined) {
      this.physicsBody.forces[node2.id].x -= fx;
      this.physicsBody.forces[node2.id].y -= fy;
    }
  }
}

export default SpringSolver;