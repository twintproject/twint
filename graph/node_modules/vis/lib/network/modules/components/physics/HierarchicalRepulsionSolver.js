/**
 * Hierarchical Repulsion Solver
 */
class HierarchicalRepulsionSolver {
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
   * Calculate the forces the nodes apply on each other based on a repulsion field.
   * This field is linearly approximated.
   *
   * @private
   */
  solve() {
    var dx, dy, distance, fx, fy, repulsingForce, node1, node2, i, j;

    var nodes = this.body.nodes;
    var nodeIndices = this.physicsBody.physicsNodeIndices;
    var forces = this.physicsBody.forces;

    // repulsing forces between nodes
    var nodeDistance = this.options.nodeDistance;

    // we loop from i over all but the last entree in the array
    // j loops from i+1 to the last. This way we do not double count any of the indices, nor i === j
    for (i = 0; i < nodeIndices.length - 1; i++) {
      node1 = nodes[nodeIndices[i]];
      for (j = i + 1; j < nodeIndices.length; j++) {
        node2 = nodes[nodeIndices[j]];

        // nodes only affect nodes on their level
        if (node1.level === node2.level) {
          dx = node2.x - node1.x;
          dy = node2.y - node1.y;
          distance = Math.sqrt(dx * dx + dy * dy);

          var steepness = 0.05;
          if (distance < nodeDistance) {
            repulsingForce = -Math.pow(steepness * distance, 2) + Math.pow(steepness * nodeDistance, 2);
          }
          else {
            repulsingForce = 0;
          }
          // normalize force with
          if (distance === 0) {
            distance = 0.01;
          }
          else {
            repulsingForce = repulsingForce / distance;
          }
          fx = dx * repulsingForce;
          fy = dy * repulsingForce;

          forces[node1.id].x -= fx;
          forces[node1.id].y -= fy;
          forces[node2.id].x += fx;
          forces[node2.id].y += fy;
        }
      }
    }
  }
}


export default HierarchicalRepulsionSolver;