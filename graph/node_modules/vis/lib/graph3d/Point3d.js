/**
 * @prototype Point3d
 * @param {number} [x]
 * @param {number} [y]
 * @param {number} [z]
 */
function Point3d(x, y, z) {
  this.x = x !== undefined ? x : 0;
  this.y = y !== undefined ? y : 0;
  this.z = z !== undefined ? z : 0;
}

/**
 * Subtract the two provided points, returns a-b
 * @param {Point3d} a
 * @param {Point3d} b
 * @return {Point3d} a-b
 */
Point3d.subtract = function(a, b) {
  var sub = new Point3d();
  sub.x = a.x - b.x;
  sub.y = a.y - b.y;
  sub.z = a.z - b.z;
  return sub;
};

/**
 * Add the two provided points, returns a+b
 * @param {Point3d} a
 * @param {Point3d} b
 * @return {Point3d} a+b
 */
Point3d.add = function(a, b) {
  var sum = new Point3d();
  sum.x = a.x + b.x;
  sum.y = a.y + b.y;
  sum.z = a.z + b.z;
  return sum;
};

/**
 * Calculate the average of two 3d points
 * @param {Point3d} a
 * @param {Point3d} b
 * @return {Point3d} The average, (a+b)/2
 */
Point3d.avg = function(a, b) {
  return new Point3d(
          (a.x + b.x) / 2,
          (a.y + b.y) / 2,
          (a.z + b.z) / 2
  );
};

/**
 * Calculate the cross product of the two provided points, returns axb
 * Documentation: http://en.wikipedia.org/wiki/Cross_product
 * @param {Point3d} a
 * @param {Point3d} b
 * @return {Point3d} cross product axb
 */
Point3d.crossProduct = function(a, b) {
  var crossproduct = new Point3d();

  crossproduct.x = a.y * b.z - a.z * b.y;
  crossproduct.y = a.z * b.x - a.x * b.z;
  crossproduct.z = a.x * b.y - a.y * b.x;

  return crossproduct;
};


/**
 * Rtrieve the length of the vector (or the distance from this point to the origin
 * @return {number}  length
 */
Point3d.prototype.length = function() {
  return Math.sqrt(
          this.x * this.x +
          this.y * this.y +
          this.z * this.z
  );
};

module.exports = Point3d;
