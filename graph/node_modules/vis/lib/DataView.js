var util = require('./util');
var DataSet = require('./DataSet');

/**
 * DataView
 *
 * a dataview offers a filtered view on a dataset or an other dataview.
 *
 * @param {DataSet | DataView} data
 * @param {Object} [options]   Available options: see method get
 *
 * @constructor DataView
 */
function DataView (data, options) {
  this._data = null;
  this._ids = {}; // ids of the items currently in memory (just contains a boolean true)
  this.length = 0; // number of items in the DataView
  this._options = options || {};
  this._fieldId = 'id'; // name of the field containing id
  this._subscribers = {}; // event subscribers

  var me = this;
  this.listener = function () {
    me._onEvent.apply(me, arguments);
  };

  this.setData(data);
}

// TODO: implement a function .config() to dynamically update things like configured filter
// and trigger changes accordingly

/**
 * Set a data source for the view
 * @param {DataSet | DataView} data
 */
DataView.prototype.setData = function (data) {
  var ids, id, i, len, items;

  if (this._data) {
    // unsubscribe from current dataset
    if (this._data.off) {
      this._data.off('*', this.listener);
    }

    // trigger a remove of all items in memory
    ids = this._data.getIds({filter: this._options && this._options.filter});
    items = [];

    for (i = 0, len = ids.length; i < len; i++) {
      items.push(this._data._data[ids[i]]);
    }

    this._ids = {};
    this.length = 0;
    this._trigger('remove', {items: ids, oldData: items});
  }

  this._data = data;

  if (this._data) {
    // update fieldId
    this._fieldId = this._options.fieldId ||
        (this._data && this._data.options && this._data.options.fieldId) ||
        'id';

    // trigger an add of all added items
    ids = this._data.getIds({filter: this._options && this._options.filter});
    for (i = 0, len = ids.length; i < len; i++) {
      id = ids[i];
      this._ids[id] = true;
    }
    this.length = ids.length;
    this._trigger('add', {items: ids});

    // subscribe to new dataset
    if (this._data.on) {
      this._data.on('*', this.listener);
    }
  }
};

/**
 * Refresh the DataView. Useful when the DataView has a filter function
 * containing a variable parameter.
 */
DataView.prototype.refresh = function () {
  var id, i, len;
  var ids = this._data.getIds({filter: this._options && this._options.filter}),
      oldIds = Object.keys(this._ids),
      newIds = {},
      addedIds = [],
      removedIds = [],
      removedItems = [];

  // check for additions
  for (i = 0, len = ids.length; i < len; i++) {
    id = ids[i];
    newIds[id] = true;
    if (!this._ids[id]) {
      addedIds.push(id);
      this._ids[id] = true;
    }
  }

  // check for removals
  for (i = 0, len = oldIds.length; i < len; i++) {
    id = oldIds[i];
    if (!newIds[id]) {
      removedIds.push(id);
      removedItems.push(this._data._data[id]);
      delete this._ids[id];
    }
  }

  this.length += addedIds.length - removedIds.length;

  // trigger events
  if (addedIds.length) {
    this._trigger('add', {items: addedIds});
  }
  if (removedIds.length) {
    this._trigger('remove', {items: removedIds, oldData: removedItems});
  }
};

/**
 * Get data from the data view
 *
 * Usage:
 *
 *     get()
 *     get(options: Object)
 *     get(options: Object, data: Array | DataTable)
 *
 *     get(id: Number)
 *     get(id: Number, options: Object)
 *     get(id: Number, options: Object, data: Array | DataTable)
 *
 *     get(ids: Number[])
 *     get(ids: Number[], options: Object)
 *     get(ids: Number[], options: Object, data: Array | DataTable)
 *
 * Where:
 *
 * {number | string} id         The id of an item
 * {number[] | string{}} ids    An array with ids of items
 * {Object} options             An Object with options. Available options:
 *                              {string} [type] Type of data to be returned. Can
 *                                              be 'DataTable' or 'Array' (default)
 *                              {Object.<string, string>} [convert]
 *                              {string[]} [fields] field names to be returned
 *                              {function} [filter] filter items
 *                              {string | function} [order] Order the items by
 *                                  a field name or custom sort function.
 * {Array | DataTable} [data]   If provided, items will be appended to this
 *                              array or table. Required in case of Google
 *                              DataTable.
 * @param {Array} args
 * @return {DataSet|DataView}
 */
DataView.prototype.get = function (args) {  // eslint-disable-line no-unused-vars
  var me = this;

  // parse the arguments
  var ids, options, data;
  var firstType = util.getType(arguments[0]);
  if (firstType == 'String' || firstType == 'Number' || firstType == 'Array') {
    // get(id(s) [, options] [, data])
    ids = arguments[0];  // can be a single id or an array with ids
    options = arguments[1];
    data = arguments[2];
  }
  else {
    // get([, options] [, data])
    options = arguments[0];
    data = arguments[1];
  }

  // extend the options with the default options and provided options
  var viewOptions = util.extend({}, this._options, options);

  // create a combined filter method when needed
  if (this._options.filter && options && options.filter) {
    viewOptions.filter = function (item) {
      return me._options.filter(item) && options.filter(item);
    }
  }

  // build up the call to the linked data set
  var getArguments = [];
  if (ids != undefined) {
    getArguments.push(ids);
  }
  getArguments.push(viewOptions);
  getArguments.push(data);

  return this._data && this._data.get.apply(this._data, getArguments);
};

/**
 * Get ids of all items or from a filtered set of items.
 * @param {Object} [options]    An Object with options. Available options:
 *                              {function} [filter] filter items
 *                              {string | function} [order] Order the items by
 *                                  a field name or custom sort function.
 * @return {Array.<string|number>} ids
 */
DataView.prototype.getIds = function (options) {
  var ids;

  if (this._data) {
    var defaultFilter = this._options.filter;
    var filter;

    if (options && options.filter) {
      if (defaultFilter) {
        filter = function (item) {
          return defaultFilter(item) && options.filter(item);
        }
      }
      else {
        filter = options.filter;
      }
    }
    else {
      filter = defaultFilter;
    }

    ids = this._data.getIds({
      filter: filter,
      order: options && options.order
    });
  }
  else {
    ids = [];
  }

  return ids;
};

/**
 * Map every item in the dataset.
 * @param {function} callback
 * @param {Object} [options]    Available options:
 *                              {Object.<string, string>} [type]
 *                              {string[]} [fields] filter fields
 *                              {function} [filter] filter items
 *                              {string | function} [order] Order the items by
 *                                  a field name or custom sort function.
 * @return {Object[]} mappedItems
 */
DataView.prototype.map = function (callback,options) {
  var mappedItems = [];
  if (this._data) {
    var defaultFilter = this._options.filter;
    var filter;

    if (options && options.filter) {
      if (defaultFilter) {
        filter = function (item) {
          return defaultFilter(item) && options.filter(item);
        }
      }
      else {
        filter = options.filter;
      }
    }
    else {
      filter = defaultFilter;
    }

    mappedItems = this._data.map(callback,{
      filter: filter,
      order: options && options.order
    });
  }
  else {
    mappedItems = [];
  }

  return mappedItems;
};

/**
 * Get the DataSet to which this DataView is connected. In case there is a chain
 * of multiple DataViews, the root DataSet of this chain is returned.
 * @return {DataSet} dataSet
 */
DataView.prototype.getDataSet = function () {
  var dataSet = this;
  while (dataSet instanceof DataView) {
    dataSet = dataSet._data;
  }
  return dataSet || null;
};

/**
 * Event listener. Will propagate all events from the connected data set to
 * the subscribers of the DataView, but will filter the items and only trigger
 * when there are changes in the filtered data set.
 * @param {string} event
 * @param {Object | null} params
 * @param {string} senderId
 * @private
 */
DataView.prototype._onEvent = function (event, params, senderId) {
  var i, len, id, item;
  var ids = params && params.items;
  var addedIds = [],
      updatedIds = [],
      removedIds = [],
      oldItems = [],
      updatedItems = [],
      removedItems = [];

  if (ids && this._data) {
    switch (event) {
      case 'add':
        // filter the ids of the added items
        for (i = 0, len = ids.length; i < len; i++) {
          id = ids[i];
          item = this.get(id);
          if (item) {
            this._ids[id] = true;
            addedIds.push(id);
          }
        }

        break;

      case 'update':
        // determine the event from the views viewpoint: an updated
        // item can be added, updated, or removed from this view.
        for (i = 0, len = ids.length; i < len; i++) {
          id = ids[i];
          item = this.get(id);

          if (item) {
            if (this._ids[id]) {
              updatedIds.push(id);
              updatedItems.push(params.data[i]);
              oldItems.push(params.oldData[i]);
            }
            else {
              this._ids[id] = true;
              addedIds.push(id);
            }
          }
          else {
            if (this._ids[id]) {
              delete this._ids[id];
              removedIds.push(id);
              removedItems.push(params.oldData[i]);
            }
            else {
              // nothing interesting for me :-(
            }
          }
        }

        break;

      case 'remove':
        // filter the ids of the removed items
        for (i = 0, len = ids.length; i < len; i++) {
          id = ids[i];
          if (this._ids[id]) {
            delete this._ids[id];
            removedIds.push(id);
            removedItems.push(params.oldData[i]);
          }
        }

        break;
    }

    this.length += addedIds.length - removedIds.length;

    if (addedIds.length) {
      this._trigger('add', {items: addedIds}, senderId);
    }
    if (updatedIds.length) {
      this._trigger('update', {items: updatedIds, oldData: oldItems, data: updatedItems}, senderId);
    }
    if (removedIds.length) {
      this._trigger('remove', {items: removedIds, oldData: removedItems}, senderId);
    }
  }
};

// copy subscription functionality from DataSet
DataView.prototype.on = DataSet.prototype.on;
DataView.prototype.off = DataSet.prototype.off;
DataView.prototype._trigger = DataSet.prototype._trigger;

// TODO: make these functions deprecated (replaced with `on` and `off` since version 0.5)
DataView.prototype.subscribe = DataView.prototype.on;
DataView.prototype.unsubscribe = DataView.prototype.off;

module.exports = DataView;
