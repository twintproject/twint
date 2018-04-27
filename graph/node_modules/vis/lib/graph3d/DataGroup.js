var DataSet  = require('../DataSet');
var DataView = require('../DataView');
var Range    = require('./Range');
var Filter = require('./Filter');
var Settings = require('./Settings');
var Point3d = require('./Point3d');


/**
 * Creates a container for all data of one specific 3D-graph.
 *
 * On construction, the container is totally empty; the data
 * needs to be initialized with method initializeData().
 * Failure to do so will result in the following exception begin thrown
 * on instantiation of Graph3D:
 *
 *     Error: Array, DataSet, or DataView expected
 *
 * @constructor DataGroup
 */
function DataGroup() {
  this.dataTable = null;  // The original data table
}


/**
 * Initializes the instance from the passed data.
 *
 * Calculates minimum and maximum values and column index values.
 *
 * The graph3d instance is used internally to access the settings for
 * the given instance.
 * TODO: Pass settings only instead.
 *
 * @param {vis.Graph3d}  graph3d Reference to the calling Graph3D instance.
 * @param {Array | DataSet | DataView} rawData The data containing the items for
 *                                             the Graph.
 * @param {number}   style   Style Number
 * @returns {Array.<Object>}
 */
DataGroup.prototype.initializeData = function(graph3d, rawData, style) {
  if (rawData === undefined) return;

  if (Array.isArray(rawData)) {
    rawData = new DataSet(rawData);
  }

  var data;
  if (rawData instanceof DataSet || rawData instanceof DataView) {
    data = rawData.get();
  }
  else {
    throw new Error('Array, DataSet, or DataView expected');
  }

  if (data.length == 0) return;

  this.style = style;

  // unsubscribe from the dataTable
  if (this.dataSet) {
    this.dataSet.off('*', this._onChange);
  }

  this.dataSet = rawData;
  this.dataTable = data;

  // subscribe to changes in the dataset
  var me = this;
  this._onChange = function () {
    graph3d.setData(me.dataSet);
  };
  this.dataSet.on('*', this._onChange);

  // determine the location of x,y,z,value,filter columns
  this.colX = 'x';
  this.colY = 'y';
  this.colZ = 'z';


  var withBars = graph3d.hasBars(style);

  // determine barWidth from data
  if (withBars) {
    if (graph3d.defaultXBarWidth !== undefined) {
      this.xBarWidth = graph3d.defaultXBarWidth;
    }
    else {
      this.xBarWidth = this.getSmallestDifference(data, this.colX) || 1;
    }

    if (graph3d.defaultYBarWidth !== undefined) {
      this.yBarWidth = graph3d.defaultYBarWidth;
    }
    else {
      this.yBarWidth = this.getSmallestDifference(data, this.colY) || 1;
    }
  }

  // calculate minima and maxima
  this._initializeRange(data, this.colX, graph3d, withBars);
  this._initializeRange(data, this.colY, graph3d, withBars);
  this._initializeRange(data, this.colZ, graph3d, false);

  if (data[0].hasOwnProperty('style')) {
    this.colValue = 'style';
    var valueRange = this.getColumnRange(data, this.colValue);
    this._setRangeDefaults(valueRange, graph3d.defaultValueMin, graph3d.defaultValueMax);
    this.valueRange = valueRange;
  }

  // Initialize data filter if a filter column is provided
  var table = this.getDataTable();
  if (table[0].hasOwnProperty('filter')) {
    if (this.dataFilter === undefined) {
      this.dataFilter = new Filter(this, 'filter', graph3d);
      this.dataFilter.setOnLoadCallback(function() { graph3d.redraw(); });
    }
  }


  var dataPoints;
  if (this.dataFilter) {
    // apply filtering
    dataPoints = this.dataFilter._getDataPoints();
  }
  else {
    // no filtering. load all data
    dataPoints = this._getDataPoints(this.getDataTable());
  }
  return dataPoints;
};


/**
 * Collect the range settings for the given data column.
 *
 * This internal method is intended to make the range 
 * initalization more generic.
 *
 * TODO: if/when combined settings per axis defined, get rid of this.
 *
 * @private
 *
 * @param {'x'|'y'|'z'} column  The data column to process
 * @param {vis.Graph3d} graph3d Reference to the calling Graph3D instance;
 *                              required for access to settings
 * @returns {Object}
 */
DataGroup.prototype._collectRangeSettings = function(column, graph3d) {
  var index = ['x', 'y', 'z'].indexOf(column);

  if (index == -1) {
    throw new Error('Column \'' + column + '\' invalid');
  }

  var upper = column.toUpperCase();

  return {
    barWidth   : this[column + 'BarWidth'],
    min        : graph3d['default' + upper + 'Min'],
    max        : graph3d['default' + upper + 'Max'],
    step       : graph3d['default' + upper + 'Step'],
    range_label: column + 'Range', // Name of instance field to write to
    step_label : column + 'Step'   // Name of instance field to write to
  };
};


/**
 * Initializes the settings per given column.
 *
 * TODO: if/when combined settings per axis defined, rewrite this.
 *
 * @private
 *
 * @param {DataSet | DataView} data     The data containing the items for the Graph
 * @param {'x'|'y'|'z'}        column   The data column to process
 * @param {vis.Graph3d}        graph3d  Reference to the calling Graph3D instance;
 *                                      required for access to settings
 * @param {boolean}            withBars True if initializing for bar graph
 */
DataGroup.prototype._initializeRange = function(data, column, graph3d, withBars) {
  var NUMSTEPS = 5;
  var settings = this._collectRangeSettings(column, graph3d);

  var range = this.getColumnRange(data, column);
  if (withBars && column != 'z') {          // Safeguard for 'z'; it doesn't have a bar width
    range.expand(settings.barWidth / 2);
  }

  this._setRangeDefaults(range, settings.min, settings.max);
  this[settings.range_label] = range;
  this[settings.step_label ] = (settings.step !== undefined) ? settings.step : range.range()/NUMSTEPS;
}


/**
 * Creates a list with all the different values in the data for the given column.
 *
 * If no data passed, use the internal data of this instance.
 *
 * @param {'x'|'y'|'z'}                column The data column to process
 * @param {DataSet|DataView|undefined} data   The data containing the items for the Graph
 *
 * @returns {Array} All distinct values in the given column data, sorted ascending.
 */
DataGroup.prototype.getDistinctValues = function(column, data) {
  if (data === undefined) {
    data = this.dataTable;
  }

  var values = [];

  for (var i = 0; i < data.length; i++) {
    var value = data[i][column] || 0;
    if (values.indexOf(value) === -1) {
      values.push(value);
    }
  }

  return values.sort(function(a,b) { return a - b; });
};


/**
 * Determine the smallest difference between the values for given
 * column in the passed data set.
 *
 * @param {DataSet|DataView|undefined} data   The data containing the items for the Graph
 * @param {'x'|'y'|'z'}                column The data column to process
 *
 * @returns {number|null} Smallest difference value or
 *                        null, if it can't be determined.
 */
DataGroup.prototype.getSmallestDifference = function(data, column) {
  var values = this.getDistinctValues(data, column);

  // Get all the distinct diffs
  // Array values is assumed to be sorted here
  var smallest_diff = null;

  for (var i = 1; i < values.length; i++) {
    var diff = values[i] - values[i - 1];

    if (smallest_diff == null || smallest_diff > diff ) {
      smallest_diff = diff;
    }
  }

  return smallest_diff;
}


/**
 * Get the absolute min/max values for the passed data column.
 *
 * @param {DataSet|DataView|undefined} data   The data containing the items for the Graph
 * @param {'x'|'y'|'z'}                column The data column to process
 *
 * @returns {Range} A Range instance with min/max members properly set.
 */
DataGroup.prototype.getColumnRange = function(data, column) {
  var range  = new Range();

  // Adjust the range so that it covers all values in the passed data elements.
  for (var i = 0; i < data.length; i++) {
    var item = data[i][column];
    range.adjust(item);
  }

  return range;
};


/**
 * Determines the number of rows in the current data.
 *
 * @returns {number}
 */
DataGroup.prototype.getNumberOfRows = function() {
  return this.dataTable.length;
};


/**
 * Set default values for range
 *
 * The default values override the range values, if defined.
 *
 * Because it's possible that only defaultMin or defaultMax is set, it's better
 * to pass in a range already set with the min/max set from the data. Otherwise,
 * it's quite hard to process the min/max properly.
 *
 * @param {vis.Range} range
 * @param {number} [defaultMin=range.min]
 * @param {number} [defaultMax=range.max]
 * @private
 */
DataGroup.prototype._setRangeDefaults = function (range, defaultMin, defaultMax) {
  if (defaultMin !== undefined) {
    range.min = defaultMin;
  }

  if (defaultMax !== undefined) {
    range.max = defaultMax;
  }

  // This is the original way that the default min/max values were adjusted.
  // TODO: Perhaps it's better if an error is thrown if the values do not agree.
  //       But this will change the behaviour.
  if (range.max <= range.min) range.max = range.min + 1;
};


DataGroup.prototype.getDataTable = function() {
  return this.dataTable;
};


DataGroup.prototype.getDataSet = function() {
  return this.dataSet;
};


/**
 * Return all data values as a list of Point3d objects
 * @param {Array.<Object>} data
 * @returns {Array.<Object>}
 */
DataGroup.prototype.getDataPoints = function(data) {
  var dataPoints = [];

  for (var i = 0; i < data.length; i++) {
    var point = new Point3d();
    point.x = data[i][this.colX] || 0;
    point.y = data[i][this.colY] || 0;
    point.z = data[i][this.colZ] || 0;
    point.data = data[i];

    if (this.colValue !== undefined) {
      point.value = data[i][this.colValue] || 0;
    }

    var obj = {};
    obj.point = point;
    obj.bottom = new Point3d(point.x, point.y, this.zRange.min);
    obj.trans = undefined;
    obj.screen = undefined;

    dataPoints.push(obj);
  }

  return dataPoints;
};


/**
 * Copy all values from the data table to a matrix.
 *
 * The provided values are supposed to form a grid of (x,y) positions.
 * @param {Array.<Object>} data
 * @returns {Array.<Object>}
 * @private
 */
DataGroup.prototype.initDataAsMatrix = function(data) {
  // TODO: store the created matrix dataPoints in the filters instead of
  //       reloading each time.
  var x, y, i, obj;

  // create two lists with all present x and y values
  var dataX = this.getDistinctValues(this.colX, data);
  var dataY = this.getDistinctValues(this.colY, data);

  var dataPoints = this.getDataPoints(data);

  // create a grid, a 2d matrix, with all values.
  var dataMatrix = [];   // temporary data matrix
  for (i = 0; i < dataPoints.length; i++) {
    obj = dataPoints[i];

    // TODO: implement Array().indexOf() for Internet Explorer
    var xIndex = dataX.indexOf(obj.point.x);
    var yIndex = dataY.indexOf(obj.point.y);

    if (dataMatrix[xIndex] === undefined) {
      dataMatrix[xIndex] = [];
    }

    dataMatrix[xIndex][yIndex] = obj;
  }

  // fill in the pointers to the neighbors.
  for (x = 0; x < dataMatrix.length; x++) {
    for (y = 0; y < dataMatrix[x].length; y++) {
      if (dataMatrix[x][y]) {
        dataMatrix[x][y].pointRight = (x < dataMatrix.length-1) ? dataMatrix[x+1][y] : undefined;
        dataMatrix[x][y].pointTop   = (y < dataMatrix[x].length-1) ? dataMatrix[x][y+1] : undefined;
        dataMatrix[x][y].pointCross =
          (x < dataMatrix.length-1 && y < dataMatrix[x].length-1) ?
            dataMatrix[x+1][y+1] :
            undefined;
      }
    }
  }

  return dataPoints;
};


/**
 * Return common information, if present
 *
 * @returns {string}
 */
DataGroup.prototype.getInfo = function() {
  var dataFilter = this.dataFilter;
  if (!dataFilter) return undefined;

  return dataFilter.getLabel() + ': ' + dataFilter.getSelectedValue();
};


/**
 * Reload the data
 */
DataGroup.prototype.reload = function() {
  if (this.dataTable) {
    this.setData(this.dataTable);
  }
};


/**
 * Filter the data based on the current filter
 *
 * @param   {Array} data
 * @returns {Array} dataPoints Array with point objects which can be drawn on
 *                             screen
 */
DataGroup.prototype._getDataPoints = function (data) {
  var dataPoints = [];

  if (this.style === Settings.STYLE.GRID || this.style === Settings.STYLE.SURFACE) {
    dataPoints = this.initDataAsMatrix(data);
  }
  else {  // 'dot', 'dot-line', etc.
    this._checkValueField(data);
    dataPoints = this.getDataPoints(data);

    if (this.style === Settings.STYLE.LINE) {
      // Add next member points for line drawing
      for (var i = 0; i < dataPoints.length; i++) {
        if (i > 0) {
          dataPoints[i - 1].pointNext = dataPoints[i];
        }
      }
    }
  }

  return dataPoints;
};


/**
 * Check if the state is consistent for the use of the value field.
 *
 * Throws if a problem is detected.
 *
 * @param {Array.<Object>} data
 * @private
 */
DataGroup.prototype._checkValueField = function (data) {

  var hasValueField = this.style === Settings.STYLE.BARCOLOR
                   || this.style === Settings.STYLE.BARSIZE
                   || this.style === Settings.STYLE.DOTCOLOR
                   || this.style === Settings.STYLE.DOTSIZE;

  if (!hasValueField) {
    return;   // No need to check further
  }


  // Following field must be present for the current graph style
  if (this.colValue === undefined) {
    throw new Error('Expected data to have '
      + ' field \'style\' '
      + ' for graph style \'' + this.style + '\''
    );
  }

  // The data must also contain this field.
  // Note that only first data element is checked.
  if (data[0][this.colValue] === undefined) {
    throw new Error('Expected data to have '
      + ' field \'' + this.colValue + '\' '
      + ' for graph style \'' + this.style + '\''
    );
  }
};


module.exports = DataGroup;
