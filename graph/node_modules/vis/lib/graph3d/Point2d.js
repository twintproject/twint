/**
 * @prototype Point2d
 * @param {number} [x]
 * @param {number} [y]
 */
function Point2d (x, y) {
  this.x = x !== undefined ? x : 0;
  this.y = y !== undefined ? y : 0;
}

module.exports = Point2d;
