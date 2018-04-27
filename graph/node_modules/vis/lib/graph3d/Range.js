/**
 * @prototype Range
 *
 * Helper class to make working with related min and max values easier.
 *
 * The range is inclusive; a given value is considered part of the range if:
 *
 *    this.min <= value <= this.max
 */
function Range() {
  this.min = undefined;
  this.max = undefined;
}


/**
 * Adjust the range so that the passed value fits in it.
 *
 * If the value is outside of the current extremes, adjust
 * the min or max so that the value is within the range.
 *
 * @param {number} value Numeric value to fit in range
 */
Range.prototype.adjust = function(value) {
  if (value === undefined) return;

  if (this.min === undefined || this.min > value ) {
    this.min = value;
  }

  if (this.max === undefined || this.max < value) {
    this.max = value;
  }
};


/**
 * Adjust the current range so that the passed range fits in it.
 *
 * @param {Range} range Range instance to fit in current instance
 */
Range.prototype.combine = function(range) {
   this.add(range.min);
   this.add(range.max);
};


/**
 * Expand the range by the given value
 *
 * min will be lowered by given value;
 * max will be raised by given value
 *
 * Shrinking by passing a negative value is allowed.
 *
 * @param {number} val Amount by which to expand or shrink current range with
 */
Range.prototype.expand = function(val) {
  if (val === undefined) {
    return;
  }

  var newMin = this.min - val;
  var newMax = this.max + val;

  // Note that following allows newMin === newMax.
  // This should be OK, since method expand() allows this also.
  if (newMin > newMax) {
    throw new Error('Passed expansion value makes range invalid');
  }

  this.min = newMin;
  this.max = newMax;
};


/**
 * Determine the full range width of current instance.
 *
 * @returns {num} The calculated width of this range
 */
Range.prototype.range = function() {
  return this.max - this.min;
};


/**
 * Determine the central point of current instance.
 *
 * @returns {number} the value in the middle of min and max
 */
Range.prototype.center = function() {
 return (this.min + this.max) / 2;
};


module.exports = Range;
