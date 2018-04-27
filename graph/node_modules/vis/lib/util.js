// utility functions

// first check if moment.js is already loaded in the browser window, if so,
// use this instance. Else, load via commonjs.


var moment = require('./module/moment');
var uuid = require('./module/uuid');

/**
 * Test whether given object is a number
 * @param {*} object
 * @return {Boolean} isNumber
 */
exports.isNumber = function (object) {
  return (object instanceof Number || typeof object == 'number');
};


/**
 * Remove everything in the DOM object
 * @param {Element} DOMobject
 */
exports.recursiveDOMDelete = function (DOMobject) {
  if (DOMobject) {
    while (DOMobject.hasChildNodes() === true) {
      exports.recursiveDOMDelete(DOMobject.firstChild);
      DOMobject.removeChild(DOMobject.firstChild);
    }
  }
};

/**
 * this function gives you a range between 0 and 1 based on the min and max values in the set, the total sum of all values and the current value.
 *
 * @param {number} min
 * @param {number} max
 * @param {number} total
 * @param {number} value
 * @returns {number}
 */
exports.giveRange = function (min, max, total, value) {
  if (max == min) {
    return 0.5;
  }
  else {
    var scale = 1 / (max - min);
    return Math.max(0, (value - min) * scale);
  }
};

/**
 * Test whether given object is a string
 * @param {*} object
 * @return {Boolean} isString
 */
exports.isString = function (object) {
  return (object instanceof String || typeof object == 'string');
};

/**
 * Test whether given object is a Date, or a String containing a Date
 * @param {Date | String} object
 * @return {Boolean} isDate
 */
exports.isDate = function (object) {
  if (object instanceof Date) {
    return true;
  }
  else if (exports.isString(object)) {
    // test whether this string contains a date
    var match = ASPDateRegex.exec(object);
    if (match) {
      return true;
    }
    else if (!isNaN(Date.parse(object))) {
      return true;
    }
  }

  return false;
};

/**
 * Create a semi UUID
 * source: http://stackoverflow.com/a/105074/1262753
 * @return {string} uuid
 */
exports.randomUUID = function () {
  return uuid.v4();
};

/**
 * assign all keys of an object that are not nested objects to a certain value (used for color objects).
 * @param {object} obj
 * @param {number} value
 */
exports.assignAllKeys = function (obj, value) {
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      if (typeof obj[prop] !== 'object') {
        obj[prop] = value;
      }
    }
  }
};


/**
 * Copy property from b to a if property present in a.
 * If property in b explicitly set to null, delete it if `allowDeletion` set.
 *
 * Internal helper routine, should not be exported. Not added to `exports` for that reason.
 *
 * @param {object} a  target object
 * @param {object} b  source object
 * @param {string} prop  name of property to copy to a
 * @param {boolean} allowDeletion  if true, delete property in a if explicitly set to null in b 
 * @private
 */
function copyOrDelete(a, b, prop, allowDeletion) {
  var doDeletion = false;
  if (allowDeletion === true) {
    doDeletion = (b[prop] === null && a[prop] !== undefined);
  }

  if (doDeletion) {
      delete a[prop];
  } else {
    a[prop] = b[prop];  // Remember, this is a reference copy!
  }
}


/**
 * Fill an object with a possibly partially defined other object.
 *
 * Only copies values for the properties already present in a.
 * That means an object is not created on a property if only the b object has it.
 *
 * @param {object} a
 * @param {object} b
 * @param {boolean} [allowDeletion=false]  if true, delete properties in a that are explicitly set to null in b 
 */
exports.fillIfDefined = function (a, b, allowDeletion = false) {
  // NOTE: iteration of properties of a
  // NOTE: prototype properties iterated over as well
  for (var prop in a) {
    if (b[prop] !== undefined) {
      if (b[prop] === null || typeof b[prop] !== 'object') { // Note: typeof null === 'object'
        copyOrDelete(a, b, prop, allowDeletion);
      } else {
        if (typeof a[prop] === 'object') {
          exports.fillIfDefined(a[prop], b[prop], allowDeletion);
        }
      }
    }
  }
};


/**
 * Extend object a with the properties of object b or a series of objects
 * Only properties with defined values are copied
 * @param {Object} a
 * @param {...Object} b
 * @return {Object} a
 */
exports.extend = function (a, b) {  // eslint-disable-line no-unused-vars
  for (var i = 1; i < arguments.length; i++) {
    var other = arguments[i];
    for (var prop in other) {
      if (other.hasOwnProperty(prop)) {
        a[prop] = other[prop];
      }
    }
  }
  return a;
};

/**
 * Extend object a with selected properties of object b or a series of objects
 * Only properties with defined values are copied
 * @param {Array.<string>} props
 * @param {Object} a
 * @param {Object} b
 * @return {Object} a
 */
exports.selectiveExtend = function (props, a, b) {  // eslint-disable-line no-unused-vars
  if (!Array.isArray(props)) {
    throw new Error('Array with property names expected as first argument');
  }

  for (var i = 2; i < arguments.length; i++) {
    var other = arguments[i];

    for (var p = 0; p < props.length; p++) {
      var prop = props[p];
      if (other && other.hasOwnProperty(prop)) {
        a[prop] = other[prop];
      }
    }
  }
  return a;
};


/**
 * Extend object a with selected properties of object b.
 * Only properties with defined values are copied.
 *
 * **Note:** Previous version of this routine implied that multiple source objects
 *           could be used; however, the implementation was **wrong**.
 *           Since multiple (>1) sources weren't used anywhere in the `vis.js` code,
 *           this has been removed
 *
 * @param {Array.<string>} props names of first-level properties to copy over
 * @param {object} a  target object
 * @param {object} b  source object
 * @param {boolean} [allowDeletion=false]  if true, delete property in a if explicitly set to null in b 
 * @returns {Object} a
 */
exports.selectiveDeepExtend = function (props, a, b, allowDeletion = false) {
  // TODO: add support for Arrays to deepExtend
  if (Array.isArray(b)) {
    throw new TypeError('Arrays are not supported by deepExtend');
  }

  for (var p = 0; p < props.length; p++) {
    var prop = props[p];
    if (b.hasOwnProperty(prop)) {
      if (b[prop] && b[prop].constructor === Object) {
        if (a[prop] === undefined) {
          a[prop] = {};
        }
        if (a[prop].constructor === Object) {
          exports.deepExtend(a[prop], b[prop], false, allowDeletion);
        }
        else {
          copyOrDelete(a, b, prop, allowDeletion);
        }
      } else if (Array.isArray(b[prop])) {
        throw new TypeError('Arrays are not supported by deepExtend');
      } else {
        copyOrDelete(a, b, prop, allowDeletion);
      }
    }
  }
  return a;
};


/**
 * Extend object `a` with properties of object `b`, ignoring properties which are explicitly 
 * specified to be excluded.
 * 
 * The properties of `b` are considered for copying.
 * Properties which are themselves objects are are also extended.
 * Only properties with defined values are copied
 *
 * @param {Array.<string>} propsToExclude  names of properties which should *not* be copied
 * @param {Object}                      a  object to extend
 * @param {Object}                      b  object to take properties from for extension
 * @param {boolean} [allowDeletion=false]  if true, delete properties in a that are explicitly set to null in b 
 * @return {Object} a
 */
exports.selectiveNotDeepExtend = function (propsToExclude, a, b, allowDeletion = false) {
  // TODO: add support for Arrays to deepExtend
  // NOTE: array properties have an else-below; apparently, there is a problem here. 
  if (Array.isArray(b)) {
    throw new TypeError('Arrays are not supported by deepExtend');
  }

  for (var prop in b) {
    if (!b.hasOwnProperty(prop)) continue;              // Handle local properties only 
    if (propsToExclude.indexOf(prop) !== -1) continue;  // In exclusion list, skip

    if (b[prop] && b[prop].constructor === Object) {
      if (a[prop] === undefined) {
        a[prop] = {};
      }
      if (a[prop].constructor === Object) {
        exports.deepExtend(a[prop], b[prop]);  // NOTE: allowDeletion not propagated!
      }
      else {
        copyOrDelete(a, b, prop, allowDeletion);
      }
    } else if (Array.isArray(b[prop])) {
      a[prop] = [];
      for (let i = 0; i < b[prop].length; i++) {
        a[prop].push(b[prop][i]);
      }
    } else {
      copyOrDelete(a, b, prop, allowDeletion);
    }
  }

  return a;
};


/**
 * Deep extend an object a with the properties of object b
 *
 * @param {Object} a
 * @param {Object} b
 * @param {boolean} [protoExtend=false]  If true, the prototype values will also be extended.
 *                          (ie. the options objects that inherit from others will also get the inherited options)
 * @param {boolean} [allowDeletion=false] If true, the values of fields that are null will be deleted
 * @returns {Object}
 */
exports.deepExtend = function (a, b, protoExtend=false, allowDeletion=false) {
  for (var prop in b) {
    if (b.hasOwnProperty(prop) || protoExtend === true) {
      if (b[prop] && b[prop].constructor === Object) {
        if (a[prop] === undefined) {
          a[prop] = {};
        }
        if (a[prop].constructor === Object) {
          exports.deepExtend(a[prop], b[prop], protoExtend);  // NOTE: allowDeletion not propagated!
        }
        else {
          copyOrDelete(a, b, prop, allowDeletion);
        }
      } else if (Array.isArray(b[prop])) {
        a[prop] = [];
        for (let i = 0; i < b[prop].length; i++) {
          a[prop].push(b[prop][i]);
        }
      } else {
        copyOrDelete(a, b, prop, allowDeletion);
      }
    }
  }
  return a;
};


/**
 * Test whether all elements in two arrays are equal.
 * @param {Array} a
 * @param {Array} b
 * @return {boolean} Returns true if both arrays have the same length and same
 *                   elements.
 */
exports.equalArray = function (a, b) {
  if (a.length != b.length) return false;

  for (var i = 0, len = a.length; i < len; i++) {
    if (a[i] != b[i]) return false;
  }

  return true;
};

/**
 * Convert an object to another type
 * @param {boolean | number | string | Date | Moment | Null | undefined} object
 * @param {string | undefined} type   Name of the type. Available types:
 *                                    'Boolean', 'Number', 'String',
 *                                    'Date', 'Moment', ISODate', 'ASPDate'.
 * @return {*} object
 * @throws Error
 */
exports.convert = function (object, type) {
  var match;

  if (object === undefined) {
    return undefined;
  }
  if (object === null) {
    return null;
  }

  if (!type) {
    return object;
  }
  if (!(typeof type === 'string') && !(type instanceof String)) {
    throw new Error('Type must be a string');
  }

  //noinspection FallthroughInSwitchStatementJS
  switch (type) {
    case 'boolean':
    case 'Boolean':
      return Boolean(object);

    case 'number':
    case 'Number':
      if (exports.isString(object) && !isNaN(Date.parse(object))) {
        return moment(object).valueOf();
      } else {
        return Number(object.valueOf());
      }
    case 'string':
    case 'String':
      return String(object);

    case 'Date':
      if (exports.isNumber(object)) {
        return new Date(object);
      }
      if (object instanceof Date) {
        return new Date(object.valueOf());
      }
      else if (moment.isMoment(object)) {
        return new Date(object.valueOf());
      }
      if (exports.isString(object)) {
        match = ASPDateRegex.exec(object);
        if (match) {
          // object is an ASP date
          return new Date(Number(match[1])); // parse number
        }
        else {
          return moment(new Date(object)).toDate(); // parse string
        }
      }
      else {
        throw new Error(
          'Cannot convert object of type ' + exports.getType(object) +
          ' to type Date');
      }

    case 'Moment':
      if (exports.isNumber(object)) {
        return moment(object);
      }
      if (object instanceof Date) {
        return moment(object.valueOf());
      }
      else if (moment.isMoment(object)) {
        return moment(object);
      }
      if (exports.isString(object)) {
        match = ASPDateRegex.exec(object);
        if (match) {
          // object is an ASP date
          return moment(Number(match[1])); // parse number
        }
        else {
          return moment(object); // parse string
        }
      }
      else {
        throw new Error(
          'Cannot convert object of type ' + exports.getType(object) +
          ' to type Date');
      }

    case 'ISODate':
      if (exports.isNumber(object)) {
        return new Date(object);
      }
      else if (object instanceof Date) {
        return object.toISOString();
      }
      else if (moment.isMoment(object)) {
        return object.toDate().toISOString();
      }
      else if (exports.isString(object)) {
        match = ASPDateRegex.exec(object);
        if (match) {
          // object is an ASP date
          return new Date(Number(match[1])).toISOString(); // parse number
        }
        else {
          return moment(object).format(); // ISO 8601
        }
      }
      else {
        throw new Error(
          'Cannot convert object of type ' + exports.getType(object) +
          ' to type ISODate');
      }

    case 'ASPDate':
      if (exports.isNumber(object)) {
        return '/Date(' + object + ')/';
      }
      else if (object instanceof Date) {
        return '/Date(' + object.valueOf() + ')/';
      }
      else if (exports.isString(object)) {
        match = ASPDateRegex.exec(object);
        var value;
        if (match) {
          // object is an ASP date
          value = new Date(Number(match[1])).valueOf(); // parse number
        }
        else {
          value = new Date(object).valueOf(); // parse string
        }
        return '/Date(' + value + ')/';
      }
      else {
        throw new Error(
          'Cannot convert object of type ' + exports.getType(object) +
          ' to type ASPDate');
      }

    default:
      throw new Error('Unknown type "' + type + '"');
  }
};

// parse ASP.Net Date pattern,
// for example '/Date(1198908717056)/' or '/Date(1198908717056-0700)/'
// code from http://momentjs.com/
var ASPDateRegex = /^\/?Date\((\-?\d+)/i;

/**
 * Get the type of an object, for example exports.getType([]) returns 'Array'
 * @param {*} object
 * @return {string} type
 */
exports.getType = function (object) {
  var type = typeof object;

  if (type == 'object') {
    if (object === null) {
      return 'null';
    }
    if (object instanceof Boolean) {
      return 'Boolean';
    }
    if (object instanceof Number) {
      return 'Number';
    }
    if (object instanceof String) {
      return 'String';
    }
    if (Array.isArray(object)) {
      return 'Array';
    }
    if (object instanceof Date) {
      return 'Date';
    }
    return 'Object';
  }
  else if (type == 'number') {
    return 'Number';
  }
  else if (type == 'boolean') {
    return 'Boolean';
  }
  else if (type == 'string') {
    return 'String';
  }
  else if (type === undefined) {
    return 'undefined';
  }


  return type;
};


/**
 * Used to extend an array and copy it. This is used to propagate paths recursively.
 *
 * @param {Array} arr
 * @param {*} newValue
 * @returns {Array}
 */
exports.copyAndExtendArray = function (arr, newValue) {
  let newArr = [];
  for (let i = 0; i < arr.length; i++) {
    newArr.push(arr[i]);
  }
  newArr.push(newValue);
  return newArr;
};

/**
 * Used to extend an array and copy it. This is used to propagate paths recursively.
 *
 * @param {Array} arr
 * @returns {Array}
 */
exports.copyArray = function (arr) {
  let newArr = [];
  for (let i = 0; i < arr.length; i++) {
    newArr.push(arr[i]);
  }
  return newArr;
};

/**
 * Retrieve the absolute left value of a DOM element
 * @param {Element} elem        A dom element, for example a div
 * @return {number} left        The absolute left position of this element
 *                              in the browser page.
 */
exports.getAbsoluteLeft = function (elem) {
  return elem.getBoundingClientRect().left;
};

exports.getAbsoluteRight = function (elem) {
  return elem.getBoundingClientRect().right;
};

/**
 * Retrieve the absolute top value of a DOM element
 * @param {Element} elem        A dom element, for example a div
 * @return {number} top        The absolute top position of this element
 *                              in the browser page.
 */
exports.getAbsoluteTop = function (elem) {
  return elem.getBoundingClientRect().top;
};

/**
 * add a className to the given elements style
 * @param {Element} elem
 * @param {string} classNames
 */
exports.addClassName = function (elem, classNames) {
  var classes = elem.className.split(' ');
  var newClasses = classNames.split(' ');
  classes = classes.concat(newClasses.filter(function(className) {
    return classes.indexOf(className) < 0;
  }));
  elem.className = classes.join(' ');
};

/**
 * add a className to the given elements style
 * @param {Element} elem
 * @param {string} classNames
 */
exports.removeClassName = function (elem, classNames) {
  var classes = elem.className.split(' ');
  var oldClasses = classNames.split(' ');
  classes = classes.filter(function(className) {
    return oldClasses.indexOf(className) < 0;
  });
  elem.className = classes.join(' ');
};

/**
 * For each method for both arrays and objects.
 * In case of an array, the built-in Array.forEach() is applied. (**No, it's not!**)
 * In case of an Object, the method loops over all properties of the object.
 * @param {Object | Array} object   An Object or Array
 * @param {function} callback       Callback method, called for each item in
 *                                  the object or array with three parameters:
 *                                  callback(value, index, object)
 */
exports.forEach = function (object, callback) {
  var i,
    len;
  if (Array.isArray(object)) {
    // array
    for (i = 0, len = object.length; i < len; i++) {
      callback(object[i], i, object);
    }
  }
  else {
    // object
    for (i in object) {
      if (object.hasOwnProperty(i)) {
        callback(object[i], i, object);
      }
    }
  }
};

/**
 * Convert an object into an array: all objects properties are put into the
 * array. The resulting array is unordered.
 * @param {Object} object
 * @returns {Array} array
 */
exports.toArray = function (object) {
  var array = [];

  for (var prop in object) {
    if (object.hasOwnProperty(prop)) array.push(object[prop]);
  }

  return array;
};

/**
 * Update a property in an object
 * @param {Object} object
 * @param {string} key
 * @param {*} value
 * @return {Boolean} changed
 */
exports.updateProperty = function (object, key, value) {
  if (object[key] !== value) {
    object[key] = value;
    return true;
  }
  else {
    return false;
  }
};

/**
 * Throttle the given function to be only executed once per animation frame
 * @param {function} fn
 * @returns {function} Returns the throttled function
 */
exports.throttle = function (fn) {
  var scheduled = false;

  return function throttled () {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(function () {
        scheduled = false;
        fn();
      });
    }
  }
};

/**
 * Add and event listener. Works for all browsers
 * @param {Element}     element    An html element
 * @param {string}      action     The action, for example "click",
 *                                 without the prefix "on"
 * @param {function}    listener   The callback function to be executed
 * @param {boolean}     [useCapture]
 */
exports.addEventListener = function (element, action, listener, useCapture) {
  if (element.addEventListener) {
    if (useCapture === undefined)
      useCapture = false;

    if (action === "mousewheel" && navigator.userAgent.indexOf("Firefox") >= 0) {
      action = "DOMMouseScroll";  // For Firefox
    }

    element.addEventListener(action, listener, useCapture);
  } else {
    element.attachEvent("on" + action, listener);  // IE browsers
  }
};

/**
 * Remove an event listener from an element
 * @param {Element}     element         An html dom element
 * @param {string}      action          The name of the event, for example "mousedown"
 * @param {function}    listener        The listener function
 * @param {boolean}     [useCapture]
 */
exports.removeEventListener = function (element, action, listener, useCapture) {
  if (element.removeEventListener) {
    // non-IE browsers
    if (useCapture === undefined)
      useCapture = false;

    if (action === "mousewheel" && navigator.userAgent.indexOf("Firefox") >= 0) {
      action = "DOMMouseScroll";  // For Firefox
    }

    element.removeEventListener(action, listener, useCapture);
  } else {
    // IE browsers
    element.detachEvent("on" + action, listener);
  }
};

/**
 * Cancels the event if it is cancelable, without stopping further propagation of the event.
 * @param {Event} event
 */
exports.preventDefault = function (event) {
  if (!event)
    event = window.event;

  if (event.preventDefault) {
    event.preventDefault();  // non-IE browsers
  }
  else {
    event.returnValue = false;  // IE browsers
  }
};

/**
 * Get HTML element which is the target of the event
 * @param {Event} event
 * @return {Element} target element
 */
exports.getTarget = function (event) {
  // code from http://www.quirksmode.org/js/events_properties.html
  if (!event) {
    event = window.event;
  }

  var target;

  if (event.target) {
    target = event.target;
  }
  else if (event.srcElement) {
    target = event.srcElement;
  }

  if (target.nodeType != undefined && target.nodeType == 3) {
    // defeat Safari bug
    target = target.parentNode;
  }

  return target;
};

/**
 * Check if given element contains given parent somewhere in the DOM tree
 * @param {Element} element
 * @param {Element} parent
 * @returns {boolean}
 */
exports.hasParent = function (element, parent) {
  var e = element;

  while (e) {
    if (e === parent) {
      return true;
    }
    e = e.parentNode;
  }

  return false;
};

exports.option = {};

/**
 * Convert a value into a boolean
 * @param {Boolean | function | undefined} value
 * @param {boolean} [defaultValue]
 * @returns {Boolean} bool
 */
exports.option.asBoolean = function (value, defaultValue) {
  if (typeof value == 'function') {
    value = value();
  }

  if (value != null) {
    return (value != false);
  }

  return defaultValue || null;
};

/**
 * Convert a value into a number
 * @param {Boolean | function | undefined} value
 * @param {number} [defaultValue]
 * @returns {number} number
 */
exports.option.asNumber = function (value, defaultValue) {
  if (typeof value == 'function') {
    value = value();
  }

  if (value != null) {
    return Number(value) || defaultValue || null;
  }

  return defaultValue || null;
};

/**
 * Convert a value into a string
 * @param {string | function | undefined} value
 * @param {string} [defaultValue]
 * @returns {String} str
 */
exports.option.asString = function (value, defaultValue) {
  if (typeof value == 'function') {
    value = value();
  }

  if (value != null) {
    return String(value);
  }

  return defaultValue || null;
};

/**
 * Convert a size or location into a string with pixels or a percentage
 * @param {string | number | function | undefined} value
 * @param {string} [defaultValue]
 * @returns {String} size
 */
exports.option.asSize = function (value, defaultValue) {
  if (typeof value == 'function') {
    value = value();
  }

  if (exports.isString(value)) {
    return value;
  }
  else if (exports.isNumber(value)) {
    return value + 'px';
  }
  else {
    return defaultValue || null;
  }
};

/**
 * Convert a value into a DOM element
 * @param {HTMLElement | function | undefined} value
 * @param {HTMLElement} [defaultValue]
 * @returns {HTMLElement | null} dom
 */
exports.option.asElement = function (value, defaultValue) {
  if (typeof value == 'function') {
    value = value();
  }

  return value || defaultValue || null;
};

/**
 * http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
 *
 * @param {string} hex
 * @returns {{r: *, g: *, b: *}} | 255 range
 */
exports.hexToRGB = function (hex) {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function (m, r, g, b) {
    return r + r + g + g + b + b;
  });
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

/**
 * This function takes color in hex format or rgb() or rgba() format and overrides the opacity. Returns rgba() string.
 * @param {string} color
 * @param {number} opacity
 * @returns {String}
 */
exports.overrideOpacity = function (color, opacity) {
  var rgb;
  if (color.indexOf("rgba") != -1) {
    return color;
  }
  else if (color.indexOf("rgb") != -1) {
    rgb = color.substr(color.indexOf("(") + 1).replace(")", "").split(",");
    return "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + opacity + ")"
  }
  else {
    rgb = exports.hexToRGB(color);
    if (rgb == null) {
      return color;
    }
    else {
      return "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + opacity + ")"
    }
  }
};

/**
 *
 * @param {number} red     0 -- 255
 * @param {number} green   0 -- 255
 * @param {number} blue    0 -- 255
 * @returns {String}
 * @constructor
 */
exports.RGBToHex = function (red, green, blue) {
  return "#" + ((1 << 24) + (red << 16) + (green << 8) + blue).toString(16).slice(1);
};

/**
 * Parse a color property into an object with border, background, and
 * highlight colors
 * @param {Object | String} color
 * @return {Object} colorObject
 */
exports.parseColor = function (color) {
  var c;
  if (exports.isString(color) === true) {
    if (exports.isValidRGB(color) === true) {
      var rgb = color.substr(4).substr(0, color.length - 5).split(',').map(function (value) { return parseInt(value) });
      color = exports.RGBToHex(rgb[0], rgb[1], rgb[2]);
    }
    if (exports.isValidHex(color) === true) {
      var hsv = exports.hexToHSV(color);
      var lighterColorHSV = { h: hsv.h, s: hsv.s * 0.8, v: Math.min(1, hsv.v * 1.02) };
      var darkerColorHSV = { h: hsv.h, s: Math.min(1, hsv.s * 1.25), v: hsv.v * 0.8 };
      var darkerColorHex = exports.HSVToHex(darkerColorHSV.h, darkerColorHSV.s, darkerColorHSV.v);
      var lighterColorHex = exports.HSVToHex(lighterColorHSV.h, lighterColorHSV.s, lighterColorHSV.v);
      c = {
        background: color,
        border: darkerColorHex,
        highlight: {
          background: lighterColorHex,
          border: darkerColorHex
        },
        hover: {
          background: lighterColorHex,
          border: darkerColorHex
        }
      };
    }
    else {
      c = {
        background: color,
        border: color,
        highlight: {
          background: color,
          border: color
        },
        hover: {
          background: color,
          border: color
        }
      };
    }
  }
  else {
    c = {};
    c.background = color.background || undefined;
    c.border = color.border || undefined;

    if (exports.isString(color.highlight)) {
      c.highlight = {
        border: color.highlight,
        background: color.highlight
      }
    }
    else {
      c.highlight = {};
      c.highlight.background = color.highlight && color.highlight.background || undefined;
      c.highlight.border = color.highlight && color.highlight.border || undefined;
    }

    if (exports.isString(color.hover)) {
      c.hover = {
        border: color.hover,
        background: color.hover
      }
    }
    else {
      c.hover = {};
      c.hover.background = color.hover && color.hover.background || undefined;
      c.hover.border = color.hover && color.hover.border || undefined;
    }
  }

  return c;
};



/**
 * http://www.javascripter.net/faq/rgb2hsv.htm
 *
 * @param {number} red
 * @param {number} green
 * @param {number} blue
 * @returns {{h: number, s: number, v: number}}
 * @constructor
 */
exports.RGBToHSV = function (red, green, blue) {
  red = red / 255; green = green / 255; blue = blue / 255;
  var minRGB = Math.min(red, Math.min(green, blue));
  var maxRGB = Math.max(red, Math.max(green, blue));

  // Black-gray-white
  if (minRGB == maxRGB) {
    return { h: 0, s: 0, v: minRGB };
  }

  // Colors other than black-gray-white:
  var d = (red == minRGB) ? green - blue : ((blue == minRGB) ? red - green : blue - red);
  var h = (red == minRGB) ? 3 : ((blue == minRGB) ? 1 : 5);
  var hue = 60 * (h - d / (maxRGB - minRGB)) / 360;
  var saturation = (maxRGB - minRGB) / maxRGB;
  var value = maxRGB;
  return { h: hue, s: saturation, v: value };
};

var cssUtil = {
  // split a string with css styles into an object with key/values
  split: function (cssText) {
    var styles = {};

    cssText.split(';').forEach(function (style) {
      if (style.trim() != '') {
        var parts = style.split(':');
        var key = parts[0].trim();
        var value = parts[1].trim();
        styles[key] = value;
      }
    });

    return styles;
  },

  // build a css text string from an object with key/values
  join: function (styles) {
    return Object.keys(styles)
      .map(function (key) {
        return key + ': ' + styles[key];
      })
      .join('; ');
  }
};

/**
 * Append a string with css styles to an element
 * @param {Element} element
 * @param {string} cssText
 */
exports.addCssText = function (element, cssText) {
  var currentStyles = cssUtil.split(element.style.cssText);
  var newStyles = cssUtil.split(cssText);
  var styles = exports.extend(currentStyles, newStyles);

  element.style.cssText = cssUtil.join(styles);
};

/**
 * Remove a string with css styles from an element
 * @param {Element} element
 * @param {string} cssText
 */
exports.removeCssText = function (element, cssText) {
  var styles = cssUtil.split(element.style.cssText);
  var removeStyles = cssUtil.split(cssText);

  for (var key in removeStyles) {
    if (removeStyles.hasOwnProperty(key)) {
      delete styles[key];
    }
  }

  element.style.cssText = cssUtil.join(styles);
};

/**
 * https://gist.github.com/mjijackson/5311256
 * @param {number} h
 * @param {number} s
 * @param {number} v
 * @returns {{r: number, g: number, b: number}}
 * @constructor
 */
exports.HSVToRGB = function (h, s, v) {
  var r, g, b;

  var i = Math.floor(h * 6);
  var f = h * 6 - i;
  var p = v * (1 - s);
  var q = v * (1 - f * s);
  var t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
  }

  return { r: Math.floor(r * 255), g: Math.floor(g * 255), b: Math.floor(b * 255) };
};

exports.HSVToHex = function (h, s, v) {
  var rgb = exports.HSVToRGB(h, s, v);
  return exports.RGBToHex(rgb.r, rgb.g, rgb.b);
};

exports.hexToHSV = function (hex) {
  var rgb = exports.hexToRGB(hex);
  return exports.RGBToHSV(rgb.r, rgb.g, rgb.b);
};

exports.isValidHex = function (hex) {
  var isOk = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(hex);
  return isOk;
};

exports.isValidRGB = function (rgb) {
  rgb = rgb.replace(" ", "");
  var isOk = /rgb\((\d{1,3}),(\d{1,3}),(\d{1,3})\)/i.test(rgb);
  return isOk;
};
exports.isValidRGBA = function (rgba) {
  rgba = rgba.replace(" ", "");
  var isOk = /rgba\((\d{1,3}),(\d{1,3}),(\d{1,3}),(.{1,3})\)/i.test(rgba);
  return isOk;
};

/**
 * This recursively redirects the prototype of JSON objects to the referenceObject
 * This is used for default options.
 *
 * @param {Array.<string>} fields
 * @param {Object} referenceObject
 * @returns {*}
 */
exports.selectiveBridgeObject = function (fields, referenceObject) {
  if (referenceObject !== null && typeof referenceObject === "object") {  // !!! typeof null === 'object'
    var objectTo = Object.create(referenceObject);
    for (var i = 0; i < fields.length; i++) {
      if (referenceObject.hasOwnProperty(fields[i])) {
        if (typeof referenceObject[fields[i]] == "object") {
          objectTo[fields[i]] = exports.bridgeObject(referenceObject[fields[i]]);
        }
      }
    }
    return objectTo;
  }
  else {
    return null;
  }
};

/**
 * This recursively redirects the prototype of JSON objects to the referenceObject
 * This is used for default options.
 *
 * @param {Object} referenceObject
 * @returns {*}
 */
exports.bridgeObject = function (referenceObject) {
  if (referenceObject !== null && typeof referenceObject === "object") {  // !!! typeof null === 'object'
    var objectTo = Object.create(referenceObject);
    if (referenceObject instanceof Element) {
      // Avoid bridging DOM objects
      objectTo = referenceObject;
    } else {
      objectTo = Object.create(referenceObject);
      for (var i in referenceObject) {
        if (referenceObject.hasOwnProperty(i)) {
          if (typeof referenceObject[i] == "object") {
            objectTo[i] = exports.bridgeObject(referenceObject[i]);
          }
        }
      }
    }
    return objectTo;
  }
  else {
    return null;
  }
};

/**
 * This method provides a stable sort implementation, very fast for presorted data
 *
 * @param {Array} a the array
 * @param {function} compare an order comparator
 * @returns {Array}
 */
exports.insertSort = function (a,compare) {
  for (var i = 0; i < a.length; i++) {
    var k = a[i];
    for (var j = i; j > 0 && compare(k,a[j - 1])<0; j--) {
      a[j] = a[j - 1];
    }
    a[j] = k;
  }
  return a;
}


/**
 * This is used to set the options of subobjects in the options object.
 *
 * A requirement of these subobjects is that they have an 'enabled' element
 * which is optional for the user but mandatory for the program.
 *
 * The added value here of the merge is that option 'enabled' is set as required.
 *
 *
 * @param {object} mergeTarget   | either this.options or the options used for the groups.
 * @param {object} options       | options
 * @param {string} option        | option key in the options argument
 * @param {object} globalOptions | global options, passed in to determine value of option 'enabled'
 */
exports.mergeOptions = function (mergeTarget, options, option, globalOptions = {}) {
  // Local helpers
  var isPresent = function(obj) {
    return obj !== null && obj !== undefined;
  }

  var isObject = function(obj) {
    return obj !== null && typeof obj === 'object';
  }

  // https://stackoverflow.com/a/34491287/1223531
  var isEmpty = function(obj) {
    for (var x in obj) { if (obj.hasOwnProperty(x)) return false; }
    return true;
  };

  // Guards
  if (!isObject(mergeTarget)) {
    throw new Error('Parameter mergeTarget must be an object');
  }

  if (!isObject(options)) {
    throw new Error('Parameter options must be an object');
  }

  if (!isPresent(option)) {
    throw new Error('Parameter option must have a value');
  }

  if (!isObject(globalOptions)) {
    throw new Error('Parameter globalOptions must be an object');
  }


  //
  // Actual merge routine, separated from main logic
  // Only a single level of options is merged. Deeper levels are ref'd. This may actually be an issue.
  //
  var doMerge = function(target, options, option) {
    if (!isObject(target[option])) {
      target[option] = {};
    }

    let src = options[option];
    let dst = target[option];
    for (var prop in src) {
      if (src.hasOwnProperty(prop)) {
        dst[prop] = src[prop];
      }
    }
  };


  // Local initialization
  var srcOption     = options[option];
  var globalPassed  = isObject(globalOptions) && !isEmpty(globalOptions);
  var globalOption  = globalPassed? globalOptions[option]: undefined;
  var globalEnabled = globalOption? globalOption.enabled: undefined;


  /////////////////////////////////////////
  // Main routine
  /////////////////////////////////////////
  if (srcOption === undefined) {
    return;  // Nothing to do
  }


  if ((typeof srcOption) === 'boolean') {
    if (!isObject(mergeTarget[option])) {
      mergeTarget[option] = {};
    }

    mergeTarget[option].enabled = srcOption;
    return;
  } 

  if (srcOption === null && !isObject(mergeTarget[option])) {
    // If possible, explicit copy from globals
    if (isPresent(globalOption)) {
      mergeTarget[option] = Object.create(globalOption);
    } else {
      return;  // Nothing to do
    }
  }

  if (!isObject(srcOption)) {
    return;
  }

  //
  // Ensure that 'enabled' is properly set. It is required internally
  // Note that the value from options will always overwrite the existing value
  //
  let enabled = true;  // default value

  if (srcOption.enabled !== undefined) {
    enabled = srcOption.enabled;
  } else {
    // Take from globals, if present
    if (globalEnabled !== undefined) {
      enabled = globalOption.enabled;
    }
  }

  doMerge(mergeTarget, options, option);
  mergeTarget[option].enabled = enabled;
}


/**
 * This function does a binary search for a visible item in a sorted list. If we find a visible item, the code that uses
 * this function will then iterate in both directions over this sorted list to find all visible items.
 *
 * @param {Item[]} orderedItems       | Items ordered by start
 * @param {function} comparator       | -1 is lower, 0 is equal, 1 is higher
 * @param {string} field
 * @param {string} field2
 * @returns {number}
 * @private
 */
exports.binarySearchCustom = function (orderedItems, comparator, field, field2) {
  var maxIterations = 10000;
  var iteration = 0;
  var low = 0;
  var high = orderedItems.length - 1;

  while (low <= high && iteration < maxIterations) {
    var middle = Math.floor((low + high) / 2);

    var item = orderedItems[middle];
    var value = (field2 === undefined) ? item[field] : item[field][field2];

    var searchResult = comparator(value);
    if (searchResult == 0) { // jihaa, found a visible item!
      return middle;
    }
    else if (searchResult == -1) {  // it is too small --> increase low
      low = middle + 1;
    }
    else {  // it is too big --> decrease high
      high = middle - 1;
    }

    iteration++;
  }

  return -1;
};

/**
 * This function does a binary search for a specific value in a sorted array. If it does not exist but is in between of
 * two values, we return either the one before or the one after, depending on user input
 * If it is found, we return the index, else -1.
 *
 * @param {Array} orderedItems
 * @param {{start: number, end: number}} target
 * @param {string} field
 * @param {string} sidePreference   'before' or 'after'
 * @param {function} comparator an optional comparator, returning -1,0,1 for <,==,>.
 * @returns {number}
 * @private
 */
exports.binarySearchValue = function (orderedItems, target, field, sidePreference, comparator) {
  var maxIterations = 10000;
  var iteration = 0;
  var low = 0;
  var high = orderedItems.length - 1;
  var prevValue, value, nextValue, middle;

  comparator = comparator != undefined ? comparator : function (a, b) {
    return a == b ? 0 : a < b ? -1 : 1
  };

  while (low <= high && iteration < maxIterations) {
    // get a new guess
    middle = Math.floor(0.5 * (high + low));
    prevValue = orderedItems[Math.max(0, middle - 1)][field];
    value = orderedItems[middle][field];
    nextValue = orderedItems[Math.min(orderedItems.length - 1, middle + 1)][field];

    if (comparator(value, target) == 0) { // we found the target
      return middle;
    }
    else if (comparator(prevValue, target) < 0 && comparator(value, target) > 0) {  // target is in between of the previous and the current
      return sidePreference == 'before' ? Math.max(0, middle - 1) : middle;
    }
    else if (comparator(value, target) < 0 && comparator(nextValue, target) > 0) { // target is in between of the current and the next
      return sidePreference == 'before' ? middle : Math.min(orderedItems.length - 1, middle + 1);
    }
    else {  // didnt find the target, we need to change our boundaries.
      if (comparator(value, target) < 0) { // it is too small --> increase low
        low = middle + 1;
      }
      else {  // it is too big --> decrease high
        high = middle - 1;
      }
    }
    iteration++;
  }

  // didnt find anything. Return -1.
  return -1;
};

/*
 * Easing Functions - inspired from http://gizma.com/easing/
 * only considering the t value for the range [0, 1] => [0, 1]
 * https://gist.github.com/gre/1650294
 */
exports.easingFunctions = {
  // no easing, no acceleration
  linear: function (t) {
    return t
  },
  // accelerating from zero velocity
  easeInQuad: function (t) {
    return t * t
  },
  // decelerating to zero velocity
  easeOutQuad: function (t) {
    return t * (2 - t)
  },
  // acceleration until halfway, then deceleration
  easeInOutQuad: function (t) {
    return t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  },
  // accelerating from zero velocity
  easeInCubic: function (t) {
    return t * t * t
  },
  // decelerating to zero velocity
  easeOutCubic: function (t) {
    return (--t) * t * t + 1
  },
  // acceleration until halfway, then deceleration
  easeInOutCubic: function (t) {
    return t < .5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
  },
  // accelerating from zero velocity
  easeInQuart: function (t) {
    return t * t * t * t
  },
  // decelerating to zero velocity
  easeOutQuart: function (t) {
    return 1 - (--t) * t * t * t
  },
  // acceleration until halfway, then deceleration
  easeInOutQuart: function (t) {
    return t < .5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t
  },
  // accelerating from zero velocity
  easeInQuint: function (t) {
    return t * t * t * t * t
  },
  // decelerating to zero velocity
  easeOutQuint: function (t) {
    return 1 + (--t) * t * t * t * t
  },
  // acceleration until halfway, then deceleration
  easeInOutQuint: function (t) {
    return t < .5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t
  }
};

exports.getScrollBarWidth = function () {
  var inner = document.createElement('p');
  inner.style.width = "100%";
  inner.style.height = "200px";

  var outer = document.createElement('div');
  outer.style.position = "absolute";
  outer.style.top = "0px";
  outer.style.left = "0px";
  outer.style.visibility = "hidden";
  outer.style.width = "200px";
  outer.style.height = "150px";
  outer.style.overflow = "hidden";
  outer.appendChild (inner);

  document.body.appendChild (outer);
  var w1 = inner.offsetWidth;
  outer.style.overflow = 'scroll';
  var w2 = inner.offsetWidth;
  if (w1 == w2) w2 = outer.clientWidth;

  document.body.removeChild (outer);

  return (w1 - w2);
};


exports.topMost = function (pile, accessors) {
  let candidate;
  if (!Array.isArray(accessors)) {
    accessors = [accessors];
  }
  for (const member of pile) {
    if (member) {
      candidate = member[accessors[0]];
      for (let i = 1; i < accessors.length; i++){
        if (candidate) {
          candidate = candidate[accessors[i]]
        } else {
          continue;
        }
      }
      if (typeof candidate != 'undefined') {
        break;
      }
    }
  }
  return candidate;
};
