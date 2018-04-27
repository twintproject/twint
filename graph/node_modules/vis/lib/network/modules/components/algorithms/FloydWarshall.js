/**
 *  The Floyd–Warshall algorithm is an algorithm for finding shortest paths in
 *  a weighted graph with positive or negative edge weights (but with no negative
 *  cycles). - https://en.wikipedia.org/wiki/Floyd–Warshall_algorithm
 */
class FloydWarshall {
  /**
   * @ignore
   */
  constructor() {
  }

  /**
   *
   * @param {Object} body
   * @param {Array.<Node>} nodesArray
   * @param {Array.<Edge>} edgesArray
   * @returns {{}}
   */
  getDistances(body, nodesArray, edgesArray) {
    let D_matrix = {};
    let edges = body.edges;

    // prepare matrix with large numbers
    for (let i = 0; i < nodesArray.length; i++) {
      let node = nodesArray[i];
      let cell = {};
      D_matrix[node] = cell;
      for (let j = 0; j < nodesArray.length; j++) {
        cell[nodesArray[j]] = (i == j ? 0 : 1e9);
      }
    }

    // put the weights for the edges in. This assumes unidirectionality.
    for (let i = 0; i < edgesArray.length; i++) {
      let edge = edges[edgesArray[i]];
      // edge has to be connected if it counts to the distances. If it is connected to inner clusters it will crash so we also check if it is in the D_matrix
      if (edge.connected === true && D_matrix[edge.fromId] !== undefined && D_matrix[edge.toId] !== undefined) {
        D_matrix[edge.fromId][edge.toId] = 1;
        D_matrix[edge.toId][edge.fromId] = 1;
      }
    }

    let nodeCount = nodesArray.length;

    // Adapted FloydWarshall based on unidirectionality to greatly reduce complexity.
    for (let k = 0; k < nodeCount; k++) {
      let knode = nodesArray[k];
      let kcolm = D_matrix[knode];
      for (let i = 0; i < nodeCount - 1; i++) {
        let inode = nodesArray[i];
        let icolm = D_matrix[inode];
        for (let j = i + 1; j < nodeCount; j++) {
          let jnode = nodesArray[j];
          let jcolm = D_matrix[jnode];

          let val = Math.min(icolm[jnode], icolm[knode] + kcolm[jnode]);
          icolm[jnode] = val;
          jcolm[inode] = val;
        }
      }
    }

    return D_matrix;
  }
}

export default FloydWarshall;