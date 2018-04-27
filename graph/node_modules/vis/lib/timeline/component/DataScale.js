/**
 *
 * @param {number} start
 * @param {number} end
 * @param {boolean} autoScaleStart
 * @param {boolean} autoScaleEnd
 * @param {number} containerHeight
 * @param {number} majorCharHeight
 * @param {boolean} zeroAlign
 * @param {function} formattingFunction
 * @constructor DataScale
 */
function DataScale(start, end, autoScaleStart, autoScaleEnd, containerHeight, majorCharHeight, zeroAlign = false, formattingFunction=false) {
  this.majorSteps = [1, 2, 5, 10];
  this.minorSteps = [0.25, 0.5, 1, 2];
  this.customLines = null;

  this.containerHeight = containerHeight;
  this.majorCharHeight = majorCharHeight;
  this._start = start;
  this._end = end;

  this.scale = 1;
  this.minorStepIdx = -1;
  this.magnitudefactor = 1;
  this.determineScale();

  this.zeroAlign = zeroAlign;
  this.autoScaleStart = autoScaleStart;
  this.autoScaleEnd = autoScaleEnd;

  this.formattingFunction = formattingFunction;

  if (autoScaleStart || autoScaleEnd) {
    var me = this;
    var roundToMinor = function (value) {
      var rounded = value - (value % (me.magnitudefactor * me.minorSteps[me.minorStepIdx]));
      if (value % (me.magnitudefactor * me.minorSteps[me.minorStepIdx]) > 0.5 * (me.magnitudefactor * me.minorSteps[me.minorStepIdx])) {
        return rounded + (me.magnitudefactor * me.minorSteps[me.minorStepIdx]);
      }
      else {
        return rounded;
      }
    };
    if (autoScaleStart) {
      this._start -= this.magnitudefactor * 2 * this.minorSteps[this.minorStepIdx];
      this._start = roundToMinor(this._start);
    }

    if (autoScaleEnd) {
      this._end += this.magnitudefactor * this.minorSteps[this.minorStepIdx];
      this._end = roundToMinor(this._end);
    }
    this.determineScale();
  }
}

DataScale.prototype.setCharHeight = function (majorCharHeight) {
  this.majorCharHeight = majorCharHeight;
};

DataScale.prototype.setHeight = function (containerHeight) {
  this.containerHeight = containerHeight;
};

DataScale.prototype.determineScale = function () {
  var range = this._end - this._start;
  this.scale = this.containerHeight / range;
  var minimumStepValue = this.majorCharHeight / this.scale;
  var orderOfMagnitude = (range > 0)
      ? Math.round(Math.log(range) / Math.LN10)
      : 0;

  this.minorStepIdx = -1;
  this.magnitudefactor = Math.pow(10, orderOfMagnitude);

  var start = 0;
  if (orderOfMagnitude < 0) {
    start = orderOfMagnitude;
  }

  var solutionFound = false;
  for (var l = start; Math.abs(l) <= Math.abs(orderOfMagnitude); l++) {
    this.magnitudefactor = Math.pow(10, l);
    for (var j = 0; j < this.minorSteps.length; j++) {
      var stepSize = this.magnitudefactor * this.minorSteps[j];
      if (stepSize >= minimumStepValue) {
        solutionFound = true;
        this.minorStepIdx = j;
        break;
      }
    }
    if (solutionFound === true) {
      break;
    }
  }
};

DataScale.prototype.is_major = function (value) {
  return (value % (this.magnitudefactor * this.majorSteps[this.minorStepIdx]) === 0);
};

DataScale.prototype.getStep = function(){
  return this.magnitudefactor * this.minorSteps[this.minorStepIdx];
};

DataScale.prototype.getFirstMajor = function(){
  var majorStep = this.magnitudefactor * this.majorSteps[this.minorStepIdx];
  return this.convertValue(this._start + ((majorStep - (this._start % majorStep)) % majorStep));
};

DataScale.prototype.formatValue = function(current) {
  var returnValue = current.toPrecision(5);
  if (typeof this.formattingFunction === 'function') {
    returnValue = this.formattingFunction(current);
  }

  if (typeof returnValue === 'number') {
    return '' + returnValue;
  }
  else if (typeof returnValue === 'string') {
    return returnValue;
  }
  else {
    return current.toPrecision(5);
  }

};

DataScale.prototype.getLines = function () {
  var lines = [];
  var step = this.getStep();
  var bottomOffset = (step - (this._start % step)) % step;
  for (var i = (this._start + bottomOffset); this._end-i > 0.00001; i += step) {
    if (i != this._start) { //Skip the bottom line
      lines.push({major: this.is_major(i), y: this.convertValue(i), val: this.formatValue(i)});
    }
  }
  return lines;
};

DataScale.prototype.followScale = function (other) {
  var oldStepIdx = this.minorStepIdx;
  var oldStart = this._start;
  var oldEnd = this._end;

  var me = this;
  var increaseMagnitude = function () {
    me.magnitudefactor *= 2;
  };
  var decreaseMagnitude = function () {
    me.magnitudefactor /= 2;
  };

  if ((other.minorStepIdx <= 1 && this.minorStepIdx <= 1) || (other.minorStepIdx > 1 && this.minorStepIdx > 1)) {
    //easy, no need to change stepIdx nor multiplication factor
  } else if (other.minorStepIdx < this.minorStepIdx) {
    //I'm 5, they are 4 per major.
    this.minorStepIdx = 1;
    if (oldStepIdx == 2) {
      increaseMagnitude();
    } else {
      increaseMagnitude();
      increaseMagnitude();
    }
  } else {
    //I'm 4, they are 5 per major
    this.minorStepIdx = 2;
    if (oldStepIdx == 1) {
      decreaseMagnitude();
    } else {
      decreaseMagnitude();
      decreaseMagnitude();
    }
  }

  //Get masters stats:
  var otherZero = other.convertValue(0);
  var otherStep = other.getStep() * other.scale;

  var done = false;
  var count = 0;
  //Loop until magnitude is correct for given constrains.
  while (!done && count++ <5) {

    //Get my stats:
    this.scale = otherStep / (this.minorSteps[this.minorStepIdx] * this.magnitudefactor);
    var newRange = this.containerHeight / this.scale;

    //For the case the magnitudefactor has changed:
    this._start = oldStart;
    this._end = this._start + newRange;

    var myOriginalZero = this._end * this.scale;
    var majorStep = this.magnitudefactor * this.majorSteps[this.minorStepIdx];
    var majorOffset = this.getFirstMajor() - other.getFirstMajor();

    if (this.zeroAlign) {
      var zeroOffset = otherZero - myOriginalZero;
      this._end += (zeroOffset / this.scale);
      this._start = this._end - newRange;
    } else {
      if (!this.autoScaleStart) {
        this._start += majorStep - (majorOffset / this.scale);
        this._end = this._start + newRange;
      } else {
        this._start -= majorOffset / this.scale;
        this._end = this._start + newRange;
      }
    }
    if (!this.autoScaleEnd && this._end > oldEnd+0.00001) {
      //Need to decrease magnitude to prevent scale overshoot! (end)
      decreaseMagnitude();
      done = false;
      continue;
    }
    if (!this.autoScaleStart && this._start < oldStart-0.00001) {
      if (this.zeroAlign && oldStart >= 0) {
        console.warn("Can't adhere to given 'min' range, due to zeroalign");
      } else {
        //Need to decrease magnitude to prevent scale overshoot! (start)
        decreaseMagnitude();
        done = false;
        continue;
      }
    }
    if (this.autoScaleStart && this.autoScaleEnd && newRange < (oldEnd-oldStart)){
      increaseMagnitude();
      done = false;
      continue;
    }
    done = true;
  }
};

DataScale.prototype.convertValue = function (value) {
  return this.containerHeight - ((value - this._start) * this.scale);
};

DataScale.prototype.screenToValue = function (pixels) {
  return ((this.containerHeight - pixels) / this.scale) + this._start;
};

module.exports = DataScale;