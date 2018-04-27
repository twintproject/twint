var DataView = require('../DataView');

/**
 * @class Filter
 *
 * @param {DataGroup} dataGroup the data group 
 * @param {number}  column             The index of the column to be filtered
 * @param {Graph3d} graph              The graph
 */
function Filter (dataGroup, column, graph) {
  this.dataGroup = dataGroup;
  this.column = column;
  this.graph = graph; // the parent graph

  this.index = undefined;
  this.value = undefined;

  // read all distinct values and select the first one
  this.values = dataGroup.getDistinctValues(this.column);

  if (this.values.length > 0) {
    this.selectValue(0);
  }

  // create an array with the filtered datapoints. this will be loaded afterwards
  this.dataPoints = [];

  this.loaded = false;
  this.onLoadCallback = undefined;

  if (graph.animationPreload) {
    this.loaded = false;
    this.loadInBackground();
  }
  else {
    this.loaded = true;
  }
}


/**
 * Return the label
 * @return {string} label
 */
Filter.prototype.isLoaded = function() {
  return this.loaded;
};


/**
 * Return the loaded progress
 * @return {number} percentage between 0 and 100
 */
Filter.prototype.getLoadedProgress = function() {
  var len = this.values.length;

  var i = 0;
  while (this.dataPoints[i]) {
    i++;
  }

  return Math.round(i / len * 100);
};


/**
 * Return the label
 * @return {string} label
 */
Filter.prototype.getLabel = function() {
  return this.graph.filterLabel;
};


/**
 * Return the columnIndex of the filter
 * @return {number} columnIndex
 */
Filter.prototype.getColumn = function() {
  return this.column;
};

/**
 * Return the currently selected value. Returns undefined if there is no selection
 * @return {*} value
 */
Filter.prototype.getSelectedValue = function() {
  if (this.index === undefined)
    return undefined;

  return this.values[this.index];
};

/**
 * Retrieve all values of the filter
 * @return {Array} values
 */
Filter.prototype.getValues = function() {
  return this.values;
};

/**
 * Retrieve one value of the filter
 * @param {number}  index
 * @return {*} value
 */
Filter.prototype.getValue = function(index) {
  if (index >= this.values.length)
    throw new Error('Index out of range');

  return this.values[index];
};


/**
 * Retrieve the (filtered) dataPoints for the currently selected filter index
 * @param {number} [index] (optional)
 * @return {Array} dataPoints
 */
Filter.prototype._getDataPoints = function(index) {
  if (index === undefined)
    index = this.index;

  if (index === undefined)
    return [];

  var dataPoints;
  if (this.dataPoints[index]) {
    dataPoints = this.dataPoints[index];
  }
  else {
    var f = {};
    f.column = this.column;
    f.value = this.values[index];

    var dataView = new DataView(this.dataGroup.getDataSet(), {filter: function (item) {return (item[f.column] == f.value);}}).get();
    dataPoints = this.dataGroup._getDataPoints(dataView);

    this.dataPoints[index] = dataPoints;
  }

  return dataPoints;
};



/**
 * Set a callback function when the filter is fully loaded.
 *
 * @param {function} callback
 */
Filter.prototype.setOnLoadCallback = function(callback) {
  this.onLoadCallback = callback;
};


/**
 * Add a value to the list with available values for this filter
 * No double entries will be created.
 * @param {number} index
 */
Filter.prototype.selectValue = function(index) {
  if (index >= this.values.length)
    throw new Error('Index out of range');

  this.index = index;
  this.value = this.values[index];
};

/**
 * Load all filtered rows in the background one by one
 * Start this method without providing an index!
 *
 * @param {number} [index=0]
 */
Filter.prototype.loadInBackground = function(index) {
  if (index === undefined)
    index = 0;

  var frame = this.graph.frame;

  if (index < this.values.length) {
    // create a progress box
    if (frame.progress === undefined) {
      frame.progress = document.createElement('DIV');
      frame.progress.style.position = 'absolute';
      frame.progress.style.color = 'gray';
      frame.appendChild(frame.progress);
    }
    var progress = this.getLoadedProgress();
    frame.progress.innerHTML = 'Loading animation... ' + progress + '%';
    // TODO: this is no nice solution...
    frame.progress.style.bottom = 60 + 'px'; // TODO: use height of slider
    frame.progress.style.left = 10 + 'px';

    var me = this;
    setTimeout(function() {me.loadInBackground(index+1);}, 10);
    this.loaded = false;
  }
  else {
    this.loaded = true;

    // remove the progress box
    if (frame.progress !== undefined) {
      frame.removeChild(frame.progress);
      frame.progress = undefined;
    }

    if (this.onLoadCallback)
      this.onLoadCallback();
  }
};

module.exports = Filter;
