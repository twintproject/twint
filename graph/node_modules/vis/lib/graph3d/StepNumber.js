/**
 * @prototype StepNumber
 * The class StepNumber is an iterator for Numbers. You provide a start and end
 * value, and a best step size. StepNumber itself rounds to fixed values and
 * a finds the step that best fits the provided step.
 *
 * If prettyStep is true, the step size is chosen as close as possible to the
 * provided step, but being a round value like 1, 2, 5, 10, 20, 50, ....
 *
 * Example usage:
 *   var step = new StepNumber(0, 10, 2.5, true);
 *   step.start();
 *   while (!step.end()) {
 *   alert(step.getCurrent());
 *   step.next();
 *   }
 *
 * Version: 1.0
 *
 * @param {number} start     The start value
 * @param {number} end     The end value
 * @param {number} step    Optional. Step size. Must be a positive value.
 * @param {boolean} prettyStep Optional. If true, the step size is rounded
 *               To a pretty step size (like 1, 2, 5, 10, 20, 50, ...)
 */
function StepNumber(start, end, step, prettyStep) {
  // set default values
  this._start = 0;
  this._end = 0;
  this._step = 1;
  this.prettyStep = true;
  this.precision = 5;

  this._current = 0;
  this.setRange(start, end, step, prettyStep);
}


/**
 * Check for input values, to prevent disasters from happening
 *
 * Source: http://stackoverflow.com/a/1830844
 *
 * @param {string} n
 * @returns {boolean}
 */
StepNumber.prototype.isNumeric = function(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
};


/**
 * Set a new range: start, end and step.
 *
 * @param {number} start     The start value
 * @param {number} end     The end value
 * @param {number} step    Optional. Step size. Must be a positive value.
 * @param {boolean} prettyStep Optional. If true, the step size is rounded
 *               To a pretty step size (like 1, 2, 5, 10, 20, 50, ...)
 */
StepNumber.prototype.setRange = function(start, end, step, prettyStep) {
  if (!this.isNumeric(start)) {
    throw new Error('Parameter \'start\' is not numeric; value: ' + start);
  }
  if (!this.isNumeric(end)) {
    throw new Error('Parameter \'end\' is not numeric; value: ' + start);
  }
  if (!this.isNumeric(step)) {
    throw new Error('Parameter \'step\' is not numeric; value: ' + start);
  }

  this._start = start ? start : 0;
  this._end = end ? end : 0;

  this.setStep(step, prettyStep);
};

/**
 * Set a new step size
 * @param {number} step    New step size. Must be a positive value
 * @param {boolean} prettyStep Optional. If true, the provided step is rounded
 *               to a pretty step size (like 1, 2, 5, 10, 20, 50, ...)
 */
StepNumber.prototype.setStep = function(step, prettyStep) {
  if (step === undefined || step <= 0)
    return;

  if (prettyStep !== undefined)
    this.prettyStep = prettyStep;

  if (this.prettyStep === true)
    this._step = StepNumber.calculatePrettyStep(step);
  else
    this._step = step;
};

/**
 * Calculate a nice step size, closest to the desired step size.
 * Returns a value in one of the ranges 1*10^n, 2*10^n, or 5*10^n, where n is an
 * integer Number. For example 1, 2, 5, 10, 20, 50, etc...
 * @param {number}  step  Desired step size
 * @return {number}     Nice step size
 */
StepNumber.calculatePrettyStep = function (step) {
  var log10 = function (x) {return Math.log(x) / Math.LN10;};

  // try three steps (multiple of 1, 2, or 5
  var step1 = Math.pow(10, Math.round(log10(step))),
      step2 = 2 * Math.pow(10, Math.round(log10(step / 2))),
      step5 = 5 * Math.pow(10, Math.round(log10(step / 5)));

  // choose the best step (closest to minimum step)
  var prettyStep = step1;
  if (Math.abs(step2 - step) <= Math.abs(prettyStep - step)) prettyStep = step2;
  if (Math.abs(step5 - step) <= Math.abs(prettyStep - step)) prettyStep = step5;

  // for safety
  if (prettyStep <= 0) {
    prettyStep = 1;
  }

  return prettyStep;
};

/**
 * returns the current value of the step
 * @return {number} current value
 */
StepNumber.prototype.getCurrent = function () {
  return parseFloat(this._current.toPrecision(this.precision));
};

/**
 * returns the current step size
 * @return {number} current step size
 */
StepNumber.prototype.getStep = function () {
  return this._step;
};

/**
 * Set the current to its starting value.
 *
 * By default, this will be the largest value smaller than start, which
 * is a multiple of the step size.
 *
 * Parameters checkFirst is optional, default false.
 * If set to true, move the current value one step if smaller than start.
 *
 * @param {boolean} [checkFirst=false]
 */
StepNumber.prototype.start = function(checkFirst) {
  if (checkFirst === undefined) {
    checkFirst = false;
  }

  this._current = this._start - this._start % this._step;

  if (checkFirst) {
    if (this.getCurrent() < this._start) {
      this.next();
    }
  }
};


/**
 * Do a step, add the step size to the current value
 */
StepNumber.prototype.next = function () {
  this._current += this._step;
};

/**
 * Returns true whether the end is reached
 * @return {boolean}  True if the current value has passed the end value.
 */
StepNumber.prototype.end = function () {
  return (this._current > this._end);
};

module.exports = StepNumber;
