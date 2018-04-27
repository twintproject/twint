let Hammer = require('../module/hammer');
let hammerUtil = require('../hammerUtil');
let util = require('../util');

/**
 * @param {number} [pixelRatio=1]
 */
class ColorPicker {
  /**
   * @param {number} [pixelRatio=1]
   */
  constructor(pixelRatio = 1) {
    this.pixelRatio = pixelRatio;
    this.generated = false;
    this.centerCoordinates = {x:289/2, y:289/2};
    this.r = 289 * 0.49;
    this.color = {r:255,g:255,b:255,a:1.0};
    this.hueCircle = undefined;
    this.initialColor = {r:255,g:255,b:255,a:1.0};
    this.previousColor= undefined;
    this.applied = false;

    // bound by
    this.updateCallback = () => {};
    this.closeCallback = () => {};

    // create all DOM elements
    this._create();
  }


  /**
   * this inserts the colorPicker into a div from the DOM
   * @param {Element} container
   */
  insertTo(container) {
    if (this.hammer !== undefined) {
      this.hammer.destroy();
      this.hammer = undefined;
    }
    this.container = container;
    this.container.appendChild(this.frame);
    this._bindHammer();

    this._setSize();
  }

  /**
   * the callback is executed on apply and save. Bind it to the application
   * @param {function} callback
   */
  setUpdateCallback(callback) {
    if (typeof callback === 'function') {
      this.updateCallback = callback;
    }
    else {
      throw new Error("Function attempted to set as colorPicker update callback is not a function.");
    }
  }

  /**
   * the callback is executed on apply and save. Bind it to the application
   * @param {function} callback
   */
  setCloseCallback(callback) {
    if (typeof callback === 'function') {
      this.closeCallback = callback;
    }
    else {
      throw new Error("Function attempted to set as colorPicker closing callback is not a function.");
    }
  }

  /**
   *
   * @param {string} color
   * @returns {String}
   * @private
   */
  _isColorString(color) {
    var htmlColors = {black: '#000000',navy: '#000080',darkblue: '#00008B',mediumblue: '#0000CD',blue: '#0000FF',darkgreen: '#006400',green: '#008000',teal: '#008080',darkcyan: '#008B8B',deepskyblue: '#00BFFF',darkturquoise: '#00CED1',mediumspringgreen: '#00FA9A',lime: '#00FF00',springgreen: '#00FF7F',aqua: '#00FFFF',cyan: '#00FFFF',midnightblue: '#191970',dodgerblue: '#1E90FF',lightseagreen: '#20B2AA',forestgreen: '#228B22',seagreen: '#2E8B57',darkslategray: '#2F4F4F',limegreen: '#32CD32',mediumseagreen: '#3CB371',turquoise: '#40E0D0',royalblue: '#4169E1',steelblue: '#4682B4',darkslateblue: '#483D8B',mediumturquoise: '#48D1CC',indigo: '#4B0082',darkolivegreen: '#556B2F',cadetblue: '#5F9EA0',cornflowerblue: '#6495ED',mediumaquamarine: '#66CDAA',dimgray: '#696969',slateblue: '#6A5ACD',olivedrab: '#6B8E23',slategray: '#708090',lightslategray: '#778899',mediumslateblue: '#7B68EE',lawngreen: '#7CFC00',chartreuse: '#7FFF00',aquamarine: '#7FFFD4',maroon: '#800000',purple: '#800080',olive: '#808000',gray: '#808080',skyblue: '#87CEEB',lightskyblue: '#87CEFA',blueviolet: '#8A2BE2',darkred: '#8B0000',darkmagenta: '#8B008B',saddlebrown: '#8B4513',darkseagreen: '#8FBC8F',lightgreen: '#90EE90',mediumpurple: '#9370D8',darkviolet: '#9400D3',palegreen: '#98FB98',darkorchid: '#9932CC',yellowgreen: '#9ACD32',sienna: '#A0522D',brown: '#A52A2A',darkgray: '#A9A9A9',lightblue: '#ADD8E6',greenyellow: '#ADFF2F',paleturquoise: '#AFEEEE',lightsteelblue: '#B0C4DE',powderblue: '#B0E0E6',firebrick: '#B22222',darkgoldenrod: '#B8860B',mediumorchid: '#BA55D3',rosybrown: '#BC8F8F',darkkhaki: '#BDB76B',silver: '#C0C0C0',mediumvioletred: '#C71585',indianred: '#CD5C5C',peru: '#CD853F',chocolate: '#D2691E',tan: '#D2B48C',lightgrey: '#D3D3D3',palevioletred: '#D87093',thistle: '#D8BFD8',orchid: '#DA70D6',goldenrod: '#DAA520',crimson: '#DC143C',gainsboro: '#DCDCDC',plum: '#DDA0DD',burlywood: '#DEB887',lightcyan: '#E0FFFF',lavender: '#E6E6FA',darksalmon: '#E9967A',violet: '#EE82EE',palegoldenrod: '#EEE8AA',lightcoral: '#F08080',khaki: '#F0E68C',aliceblue: '#F0F8FF',honeydew: '#F0FFF0',azure: '#F0FFFF',sandybrown: '#F4A460',wheat: '#F5DEB3',beige: '#F5F5DC',whitesmoke: '#F5F5F5',mintcream: '#F5FFFA',ghostwhite: '#F8F8FF',salmon: '#FA8072',antiquewhite: '#FAEBD7',linen: '#FAF0E6',lightgoldenrodyellow: '#FAFAD2',oldlace: '#FDF5E6',red: '#FF0000',fuchsia: '#FF00FF',magenta: '#FF00FF',deeppink: '#FF1493',orangered: '#FF4500',tomato: '#FF6347',hotpink: '#FF69B4',coral: '#FF7F50',darkorange: '#FF8C00',lightsalmon: '#FFA07A',orange: '#FFA500',lightpink: '#FFB6C1',pink: '#FFC0CB',gold: '#FFD700',peachpuff: '#FFDAB9',navajowhite: '#FFDEAD',moccasin: '#FFE4B5',bisque: '#FFE4C4',mistyrose: '#FFE4E1',blanchedalmond: '#FFEBCD',papayawhip: '#FFEFD5',lavenderblush: '#FFF0F5',seashell: '#FFF5EE',cornsilk: '#FFF8DC',lemonchiffon: '#FFFACD',floralwhite: '#FFFAF0',snow: '#FFFAFA',yellow: '#FFFF00',lightyellow: '#FFFFE0',ivory: '#FFFFF0',white: '#FFFFFF'};
    if (typeof color === 'string') {
      return htmlColors[color];
    }
  }


  /**
   * Set the color of the colorPicker
   * Supported formats:
   * 'red'                   --> HTML color string
   * '#ffffff'               --> hex string
   * 'rbg(255,255,255)'      --> rgb string
   * 'rgba(255,255,255,1.0)' --> rgba string
   * {r:255,g:255,b:255}     --> rgb object
   * {r:255,g:255,b:255,a:1.0} --> rgba object
   * @param {string|Object} color
   * @param {boolean} [setInitial=true]
   */
  setColor(color, setInitial = true) {
    if (color === 'none') {
      return;
    }

    let rgba;

    // if a html color shorthand is used, convert to hex
    var htmlColor = this._isColorString(color);
    if (htmlColor !== undefined) {
      color = htmlColor;
    }

    // check format
    if (util.isString(color) === true) {
      if (util.isValidRGB(color) === true) {
        let rgbaArray = color.substr(4).substr(0, color.length - 5).split(',');
        rgba = {r:rgbaArray[0], g:rgbaArray[1], b:rgbaArray[2], a:1.0};
      }
      else if (util.isValidRGBA(color) === true) {
        let rgbaArray = color.substr(5).substr(0, color.length - 6).split(',');
        rgba = {r:rgbaArray[0], g:rgbaArray[1], b:rgbaArray[2], a:rgbaArray[3]};
      }
      else if (util.isValidHex(color) === true) {
        let rgbObj = util.hexToRGB(color);
        rgba = {r:rgbObj.r, g:rgbObj.g, b:rgbObj.b, a:1.0};
      }
    }
    else {
      if (color instanceof Object) {
        if (color.r !== undefined && color.g !== undefined && color.b !== undefined) {
          let alpha = color.a !== undefined ? color.a : '1.0';
          rgba = {r:color.r, g:color.g, b:color.b, a:alpha};
        }
      }
    }

    // set color
    if (rgba === undefined) {
      throw new Error("Unknown color passed to the colorPicker. Supported are strings: rgb, hex, rgba. Object: rgb ({r:r,g:g,b:b,[a:a]}). Supplied: " + JSON.stringify(color));
    }
    else {
      this._setColor(rgba, setInitial);
    }
  }


  /**
   * this shows the color picker.
   * The hue circle is constructed once and stored.
   */
  show() {
    if (this.closeCallback !== undefined) {
      this.closeCallback();
      this.closeCallback = undefined;
    }

    this.applied = false;
    this.frame.style.display = 'block';
    this._generateHueCircle();
  }

  // ------------------------------------------ PRIVATE ----------------------------- //

  /**
   * Hide the picker. Is called by the cancel button.
   * Optional boolean to store the previous color for easy access later on.
   * @param {boolean} [storePrevious=true]
   * @private
   */
  _hide(storePrevious = true) {
    // store the previous color for next time;
    if (storePrevious === true) {
      this.previousColor = util.extend({}, this.color);
    }

    if (this.applied === true) {
      this.updateCallback(this.initialColor);
    }

    this.frame.style.display = 'none';

    // call the closing callback, restoring the onclick method.
    // this is in a setTimeout because it will trigger the show again before the click is done.
    setTimeout(() => {
      if (this.closeCallback !== undefined) {
        this.closeCallback();
        this.closeCallback = undefined;
      }
    },0);
  }


  /**
   * bound to the save button. Saves and hides.
   * @private
   */
  _save() {
    this.updateCallback(this.color);
    this.applied = false;
    this._hide();
  }


  /**
   * Bound to apply button. Saves but does not close. Is undone by the cancel button.
   * @private
   */
  _apply() {
    this.applied = true;
    this.updateCallback(this.color);
    this._updatePicker(this.color);
  }


  /**
   * load the color from the previous session.
   * @private
   */
  _loadLast() {
    if (this.previousColor !== undefined) {
      this.setColor(this.previousColor, false);
    }
    else {
      alert("There is no last color to load...");
    }
  }


  /**
   * set the color, place the picker
   * @param {Object} rgba
   * @param {boolean} [setInitial=true]
   * @private
   */
  _setColor(rgba, setInitial = true) {
    // store the initial color
    if (setInitial === true) {
      this.initialColor = util.extend({}, rgba);
    }

    this.color = rgba;
    let hsv = util.RGBToHSV(rgba.r, rgba.g, rgba.b);

    let angleConvert = 2 * Math.PI;
    let radius = this.r * hsv.s;
    let x = this.centerCoordinates.x + radius * Math.sin(angleConvert * hsv.h);
    let y = this.centerCoordinates.y + radius * Math.cos(angleConvert * hsv.h);

    this.colorPickerSelector.style.left = x - 0.5 * this.colorPickerSelector.clientWidth + 'px';
    this.colorPickerSelector.style.top = y - 0.5 * this.colorPickerSelector.clientHeight + 'px';

    this._updatePicker(rgba);
  }


  /**
   * bound to opacity control
   * @param {number} value
   * @private
   */
  _setOpacity(value) {
    this.color.a = value / 100;
    this._updatePicker(this.color);
  }


  /**
   * bound to brightness control
   * @param {number} value
   * @private
   */
  _setBrightness(value) {
    let hsv = util.RGBToHSV(this.color.r, this.color.g, this.color.b);
    hsv.v = value / 100;
    let rgba = util.HSVToRGB(hsv.h, hsv.s, hsv.v);
    rgba['a'] = this.color.a;
    this.color = rgba;
    this._updatePicker();
  }


  /**
   * update the color picker. A black circle overlays the hue circle to mimic the brightness decreasing.
   * @param {Object} rgba
   * @private
   */
  _updatePicker(rgba = this.color) {
    let hsv = util.RGBToHSV(rgba.r, rgba.g, rgba.b);
    let ctx = this.colorPickerCanvas.getContext('2d');
    if (this.pixelRation === undefined) {
      this.pixelRatio = (window.devicePixelRatio || 1) / (ctx.webkitBackingStorePixelRatio ||
      ctx.mozBackingStorePixelRatio ||
      ctx.msBackingStorePixelRatio ||
      ctx.oBackingStorePixelRatio ||
      ctx.backingStorePixelRatio || 1);
    }
    ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);

    // clear the canvas
    let w = this.colorPickerCanvas.clientWidth;
    let h = this.colorPickerCanvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    ctx.putImageData(this.hueCircle, 0,0);
    ctx.fillStyle = 'rgba(0,0,0,' + (1- hsv.v) + ')';
    ctx.circle(this.centerCoordinates.x, this.centerCoordinates.y, this.r);
    ctx.fill();

    this.brightnessRange.value = 100 * hsv.v;
    this.opacityRange.value    = 100 * rgba.a;

    this.initialColorDiv.style.backgroundColor = 'rgba(' + this.initialColor.r + ',' + this.initialColor.g + ',' + this.initialColor.b + ',' + this.initialColor.a + ')';
    this.newColorDiv.style.backgroundColor = 'rgba(' + this.color.r + ',' + this.color.g + ',' + this.color.b + ',' + this.color.a + ')';
  }


  /**
   * used by create to set the size of the canvas.
   * @private
   */
  _setSize() {
    this.colorPickerCanvas.style.width = '100%';
    this.colorPickerCanvas.style.height = '100%';

    this.colorPickerCanvas.width = 289 * this.pixelRatio;
    this.colorPickerCanvas.height = 289 * this.pixelRatio;
  }


  /**
   * create all dom elements
   * TODO: cleanup, lots of similar dom elements
   * @private
   */
  _create() {
    this.frame = document.createElement('div');
    this.frame.className = 'vis-color-picker';

    this.colorPickerDiv = document.createElement('div');
    this.colorPickerSelector = document.createElement('div');
    this.colorPickerSelector.className = 'vis-selector';
    this.colorPickerDiv.appendChild(this.colorPickerSelector);

    this.colorPickerCanvas = document.createElement('canvas');
    this.colorPickerDiv.appendChild(this.colorPickerCanvas);

    if (!this.colorPickerCanvas.getContext) {
      let noCanvas = document.createElement( 'DIV' );
      noCanvas.style.color = 'red';
      noCanvas.style.fontWeight =  'bold' ;
      noCanvas.style.padding =  '10px';
      noCanvas.innerHTML =  'Error: your browser does not support HTML canvas';
      this.colorPickerCanvas.appendChild(noCanvas);
    }
    else {
      let ctx = this.colorPickerCanvas.getContext("2d");
      this.pixelRatio = (window.devicePixelRatio || 1) / (ctx.webkitBackingStorePixelRatio ||
      ctx.mozBackingStorePixelRatio ||
      ctx.msBackingStorePixelRatio ||
      ctx.oBackingStorePixelRatio ||
      ctx.backingStorePixelRatio || 1);

      this.colorPickerCanvas.getContext("2d").setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    }

    this.colorPickerDiv.className = 'vis-color';

    this.opacityDiv = document.createElement('div');
    this.opacityDiv.className = 'vis-opacity';

    this.brightnessDiv = document.createElement('div');
    this.brightnessDiv.className = 'vis-brightness';

    this.arrowDiv = document.createElement('div');
    this.arrowDiv.className = 'vis-arrow';

    this.opacityRange = document.createElement('input');
    try {
      this.opacityRange.type = 'range'; // Not supported on IE9
      this.opacityRange.min = '0';
      this.opacityRange.max = '100';
    }
    // TODO: Add some error handling and remove this lint exception
    catch (err) {}  // eslint-disable-line no-empty
    this.opacityRange.value = '100';
    this.opacityRange.className = 'vis-range';

    this.brightnessRange = document.createElement('input');
    try {
      this.brightnessRange.type = 'range'; // Not supported on IE9
      this.brightnessRange.min = '0';
      this.brightnessRange.max = '100';
    }
    // TODO: Add some error handling and remove this lint exception
    catch (err) {}  // eslint-disable-line no-empty
    this.brightnessRange.value = '100';
    this.brightnessRange.className = 'vis-range';

    this.opacityDiv.appendChild(this.opacityRange);
    this.brightnessDiv.appendChild(this.brightnessRange);

    var me = this;
    this.opacityRange.onchange = function () {me._setOpacity(this.value);};
    this.opacityRange.oninput  = function () {me._setOpacity(this.value);};
    this.brightnessRange.onchange = function () {me._setBrightness(this.value);};
    this.brightnessRange.oninput  = function () {me._setBrightness(this.value);};

    this.brightnessLabel = document.createElement("div");
    this.brightnessLabel.className = "vis-label vis-brightness";
    this.brightnessLabel.innerHTML = 'brightness:';

    this.opacityLabel = document.createElement("div");
    this.opacityLabel.className = "vis-label vis-opacity";
    this.opacityLabel.innerHTML = 'opacity:';

    this.newColorDiv = document.createElement("div");
    this.newColorDiv.className = "vis-new-color";
    this.newColorDiv.innerHTML = 'new';

    this.initialColorDiv = document.createElement("div");
    this.initialColorDiv.className = "vis-initial-color";
    this.initialColorDiv.innerHTML = 'initial';

    this.cancelButton = document.createElement("div");
    this.cancelButton.className = "vis-button vis-cancel";
    this.cancelButton.innerHTML = 'cancel';
    this.cancelButton.onclick = this._hide.bind(this, false);

    this.applyButton = document.createElement("div");
    this.applyButton.className = "vis-button vis-apply";
    this.applyButton.innerHTML = 'apply';
    this.applyButton.onclick = this._apply.bind(this);

    this.saveButton = document.createElement("div");
    this.saveButton.className = "vis-button vis-save";
    this.saveButton.innerHTML = 'save';
    this.saveButton.onclick = this._save.bind(this);

    this.loadButton = document.createElement("div");
    this.loadButton.className = "vis-button vis-load";
    this.loadButton.innerHTML = 'load last';
    this.loadButton.onclick = this._loadLast.bind(this);

    this.frame.appendChild(this.colorPickerDiv);
    this.frame.appendChild(this.arrowDiv);
    this.frame.appendChild(this.brightnessLabel);
    this.frame.appendChild(this.brightnessDiv);
    this.frame.appendChild(this.opacityLabel);
    this.frame.appendChild(this.opacityDiv);
    this.frame.appendChild(this.newColorDiv);
    this.frame.appendChild(this.initialColorDiv);

    this.frame.appendChild(this.cancelButton);
    this.frame.appendChild(this.applyButton);
    this.frame.appendChild(this.saveButton);
    this.frame.appendChild(this.loadButton);
  }


  /**
   * bind hammer to the color picker
   * @private
   */
  _bindHammer() {
    this.drag = {};
    this.pinch = {};
    this.hammer = new Hammer(this.colorPickerCanvas);
    this.hammer.get('pinch').set({enable: true});

    hammerUtil.onTouch(this.hammer, (event) => {this._moveSelector(event)});
    this.hammer.on('tap',       (event) => {this._moveSelector(event)});
    this.hammer.on('panstart',  (event) => {this._moveSelector(event)});
    this.hammer.on('panmove',   (event) => {this._moveSelector(event)});
    this.hammer.on('panend',    (event) => {this._moveSelector(event)});
  }


  /**
   * generate the hue circle. This is relatively heavy (200ms) and is done only once on the first time it is shown.
   * @private
   */
  _generateHueCircle() {
    if (this.generated === false) {
      let ctx = this.colorPickerCanvas.getContext('2d');
      if (this.pixelRation === undefined) {
        this.pixelRatio = (window.devicePixelRatio || 1) / (ctx.webkitBackingStorePixelRatio ||
        ctx.mozBackingStorePixelRatio ||
        ctx.msBackingStorePixelRatio ||
        ctx.oBackingStorePixelRatio ||
        ctx.backingStorePixelRatio || 1);
      }
      ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);

      // clear the canvas
      let w = this.colorPickerCanvas.clientWidth;
      let h = this.colorPickerCanvas.clientHeight;
      ctx.clearRect(0, 0, w, h);


      // draw hue circle
      let x, y, hue, sat;
      this.centerCoordinates = {x: w * 0.5, y: h * 0.5};
      this.r = 0.49 * w;
      let angleConvert = (2 * Math.PI) / 360;
      let hfac = 1 / 360;
      let sfac = 1 / this.r;
      let rgb;
      for (hue = 0; hue < 360; hue++) {
        for (sat = 0; sat < this.r; sat++) {
          x = this.centerCoordinates.x + sat * Math.sin(angleConvert * hue);
          y = this.centerCoordinates.y + sat * Math.cos(angleConvert * hue);
          rgb = util.HSVToRGB(hue * hfac, sat * sfac, 1);
          ctx.fillStyle = 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')';
          ctx.fillRect(x - 0.5, y - 0.5, 2, 2);
        }
      }
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.circle(this.centerCoordinates.x, this.centerCoordinates.y, this.r);
      ctx.stroke();

      this.hueCircle = ctx.getImageData(0,0,w,h);
    }
    this.generated = true;
  }


  /**
   * move the selector. This is called by hammer functions.
   *
   * @param {Event}  event   The event
   * @private
   */
  _moveSelector(event) {
    let rect = this.colorPickerDiv.getBoundingClientRect();
    let left = event.center.x - rect.left;
    let top = event.center.y - rect.top;

    let centerY = 0.5 * this.colorPickerDiv.clientHeight;
    let centerX = 0.5 * this.colorPickerDiv.clientWidth;

    let x = left - centerX;
    let y = top - centerY;

    let angle = Math.atan2(x,y);
    let radius = 0.98 * Math.min(Math.sqrt(x * x + y * y), centerX);

    let newTop = Math.cos(angle) * radius + centerY;
    let newLeft = Math.sin(angle) * radius + centerX;

    this.colorPickerSelector.style.top = newTop - 0.5 * this.colorPickerSelector.clientHeight + 'px';
    this.colorPickerSelector.style.left = newLeft - 0.5 * this.colorPickerSelector.clientWidth + 'px';

    // set color
    let h = angle / (2 * Math.PI);
    h = h < 0 ? h + 1 : h;
    let s = radius / this.r;
    let hsv = util.RGBToHSV(this.color.r, this.color.g, this.color.b);
    hsv.h = h;
    hsv.s = s;
    let rgba = util.HSVToRGB(hsv.h, hsv.s, hsv.v);
    rgba['a'] = this.color.a;
    this.color = rgba;

    // update previews
    this.initialColorDiv.style.backgroundColor = 'rgba(' + this.initialColor.r + ',' + this.initialColor.g + ',' + this.initialColor.b + ',' + this.initialColor.a + ')';
    this.newColorDiv.style.backgroundColor = 'rgba(' + this.color.r + ',' + this.color.g + ',' + this.color.b + ',' + this.color.a + ')';
  }
}

export default ColorPicker;