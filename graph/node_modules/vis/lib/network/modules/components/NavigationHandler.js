var Hammer = require('../../../module/hammer');
var hammerUtil = require('../../../hammerUtil');
var keycharm = require('keycharm');

/**
 * Navigation Handler
 */
class NavigationHandler {
  /**
   * @param {Object} body
   * @param {Canvas} canvas
   */
  constructor(body, canvas) {
    this.body = body;
    this.canvas = canvas;

    this.iconsCreated = false;
    this.navigationHammers = [];
    this.boundFunctions = {};
    this.touchTime = 0;
    this.activated = false;


    this.body.emitter.on("activate",   () => {this.activated = true;  this.configureKeyboardBindings();});
    this.body.emitter.on("deactivate", () => {this.activated = false; this.configureKeyboardBindings();});
    this.body.emitter.on("destroy",    () => {if (this.keycharm !== undefined) {this.keycharm.destroy();}});

    this.options = {}
  }

  /**
   *
   * @param {Object} options
   */
  setOptions(options) {
    if (options !== undefined) {
      this.options = options;
      this.create();
    }
  }

  /**
   * Creates or refreshes navigation and sets key bindings
   */
  create() {
    if (this.options.navigationButtons === true) {
      if (this.iconsCreated === false) {
        this.loadNavigationElements();
      }
    }
    else if (this.iconsCreated === true) {
      this.cleanNavigation();
    }

    this.configureKeyboardBindings();
  }

  /**
   * Cleans up previous navigation items
   */
  cleanNavigation() {
    // clean hammer bindings
    if (this.navigationHammers.length != 0) {
      for (var i = 0; i < this.navigationHammers.length; i++) {
        this.navigationHammers[i].destroy();
      }
      this.navigationHammers = [];
    }

    // clean up previous navigation items
    if (this.navigationDOM && this.navigationDOM['wrapper'] && this.navigationDOM['wrapper'].parentNode) {
      this.navigationDOM['wrapper'].parentNode.removeChild(this.navigationDOM['wrapper']);
    }

    this.iconsCreated = false;
  }

  /**
   * Creation of the navigation controls nodes. They are drawn over the rest of the nodes and are not affected by scale and translation
   * they have a triggerFunction which is called on click. If the position of the navigation controls is dependent
   * on this.frame.canvas.clientWidth or this.frame.canvas.clientHeight, we flag horizontalAlignLeft and verticalAlignTop false.
   * This means that the location will be corrected by the _relocateNavigation function on a size change of the canvas.
   *
   * @private
   */
  loadNavigationElements() {
    this.cleanNavigation();

    this.navigationDOM = {};
    var navigationDivs = ['up','down','left','right','zoomIn','zoomOut','zoomExtends'];
    var navigationDivActions = ['_moveUp','_moveDown','_moveLeft','_moveRight','_zoomIn','_zoomOut','_fit'];

    this.navigationDOM['wrapper'] = document.createElement('div');
    this.navigationDOM['wrapper'].className = 'vis-navigation';
    this.canvas.frame.appendChild(this.navigationDOM['wrapper']);

    for (var i = 0; i < navigationDivs.length; i++) {
      this.navigationDOM[navigationDivs[i]] = document.createElement('div');
      this.navigationDOM[navigationDivs[i]].className = 'vis-button vis-' + navigationDivs[i];
      this.navigationDOM['wrapper'].appendChild(this.navigationDOM[navigationDivs[i]]);

      var hammer = new Hammer(this.navigationDOM[navigationDivs[i]]);
      if (navigationDivActions[i] === "_fit") {
        hammerUtil.onTouch(hammer, this._fit.bind(this));
      }
      else {
        hammerUtil.onTouch(hammer, this.bindToRedraw.bind(this,navigationDivActions[i]));
      }

      this.navigationHammers.push(hammer);
    }

    // use a hammer for the release so we do not require the one used in the rest of the network
    // the one the rest uses can be overloaded by the manipulation system.
    var hammerFrame = new Hammer(this.canvas.frame);
    hammerUtil.onRelease(hammerFrame, () => {this._stopMovement();});
    this.navigationHammers.push(hammerFrame);

    this.iconsCreated = true;
  }

  /**
   *
   * @param {string} action
   */
  bindToRedraw(action) {
    if (this.boundFunctions[action] === undefined) {
      this.boundFunctions[action] = this[action].bind(this);
      this.body.emitter.on("initRedraw", this.boundFunctions[action]);
      this.body.emitter.emit("_startRendering");
    }
  }

  /**
   *
   * @param {string} action
   */
  unbindFromRedraw(action) {
    if (this.boundFunctions[action] !== undefined) {
      this.body.emitter.off("initRedraw", this.boundFunctions[action]);
      this.body.emitter.emit("_stopRendering");
      delete this.boundFunctions[action];
    }
  }

  /**
   * this stops all movement induced by the navigation buttons
   *
   * @private
   */
  _fit() {
    if (new Date().valueOf() - this.touchTime > 700) { // TODO: fix ugly hack to avoid hammer's double fireing of event (because we use release?)
      this.body.emitter.emit("fit", {duration: 700});
      this.touchTime = new Date().valueOf();
    }
  }

  /**
   * this stops all movement induced by the navigation buttons
   *
   * @private
   */
  _stopMovement() {
    for (let boundAction in this.boundFunctions) {
      if (this.boundFunctions.hasOwnProperty(boundAction)) {
        this.body.emitter.off("initRedraw", this.boundFunctions[boundAction]);
        this.body.emitter.emit("_stopRendering");
      }
    }
    this.boundFunctions = {};
  }
  /**
   *
   * @private
   */
  _moveUp()   {this.body.view.translation.y += this.options.keyboard.speed.y;}
  /**
   *
   * @private
   */
  _moveDown() {this.body.view.translation.y -= this.options.keyboard.speed.y;}
  /**
   *
   * @private
   */
  _moveLeft() {this.body.view.translation.x += this.options.keyboard.speed.x;}
  /**
   *
   * @private
   */
  _moveRight(){this.body.view.translation.x -= this.options.keyboard.speed.x;}
  /**
   *
   * @private
   */
  _zoomIn() {
    var scaleOld = this.body.view.scale;
    var scale = this.body.view.scale * (1 + this.options.keyboard.speed.zoom);
    var translation = this.body.view.translation;
    var scaleFrac = scale / scaleOld;
    var tx = (1 - scaleFrac) * this.canvas.canvasViewCenter.x + translation.x * scaleFrac;
    var ty = (1 - scaleFrac) * this.canvas.canvasViewCenter.y + translation.y * scaleFrac;

    this.body.view.scale = scale;
    this.body.view.translation = { x: tx, y: ty };
    this.body.emitter.emit('zoom', { direction: '+', scale: this.body.view.scale, pointer: null });

  }

  /**
   *
   * @private
   */
  _zoomOut()  {
    var scaleOld = this.body.view.scale;
    var scale = this.body.view.scale / (1 + this.options.keyboard.speed.zoom);
    var translation = this.body.view.translation;
    var scaleFrac = scale / scaleOld;
    var tx = (1 - scaleFrac) * this.canvas.canvasViewCenter.x + translation.x * scaleFrac;
    var ty = (1 - scaleFrac) * this.canvas.canvasViewCenter.y + translation.y * scaleFrac;

    this.body.view.scale = scale;
    this.body.view.translation = { x: tx, y: ty };
    this.body.emitter.emit('zoom', { direction: '-', scale: this.body.view.scale, pointer: null });
  }


  /**
   * bind all keys using keycharm.
   */
  configureKeyboardBindings() {
    if (this.keycharm !== undefined) {
      this.keycharm.destroy();
    }

    if (this.options.keyboard.enabled === true) {
      if (this.options.keyboard.bindToWindow === true) {
        this.keycharm = keycharm({container: window, preventDefault: true});
      }
      else {
        this.keycharm = keycharm({container: this.canvas.frame, preventDefault: true});
      }

      this.keycharm.reset();

      if (this.activated === true) {
        this.keycharm.bind("up",       () => {this.bindToRedraw("_moveUp")   ;}, "keydown");
        this.keycharm.bind("down",     () => {this.bindToRedraw("_moveDown") ;}, "keydown");
        this.keycharm.bind("left",     () => {this.bindToRedraw("_moveLeft") ;}, "keydown");
        this.keycharm.bind("right",    () => {this.bindToRedraw("_moveRight");}, "keydown");
        this.keycharm.bind("=",        () => {this.bindToRedraw("_zoomIn")   ;}, "keydown");
        this.keycharm.bind("num+",     () => {this.bindToRedraw("_zoomIn")   ;}, "keydown");
        this.keycharm.bind("num-",     () => {this.bindToRedraw("_zoomOut")  ;}, "keydown");
        this.keycharm.bind("-",        () => {this.bindToRedraw("_zoomOut")  ;}, "keydown");
        this.keycharm.bind("[",        () => {this.bindToRedraw("_zoomOut")  ;}, "keydown");
        this.keycharm.bind("]",        () => {this.bindToRedraw("_zoomIn")   ;}, "keydown");
        this.keycharm.bind("pageup",   () => {this.bindToRedraw("_zoomIn")   ;}, "keydown");
        this.keycharm.bind("pagedown", () => {this.bindToRedraw("_zoomOut")  ;}, "keydown");

        this.keycharm.bind("up",       () => {this.unbindFromRedraw("_moveUp")   ;}, "keyup");
        this.keycharm.bind("down",     () => {this.unbindFromRedraw("_moveDown") ;}, "keyup");
        this.keycharm.bind("left",     () => {this.unbindFromRedraw("_moveLeft") ;}, "keyup");
        this.keycharm.bind("right",    () => {this.unbindFromRedraw("_moveRight");}, "keyup");
        this.keycharm.bind("=",        () => {this.unbindFromRedraw("_zoomIn")   ;}, "keyup");
        this.keycharm.bind("num+",     () => {this.unbindFromRedraw("_zoomIn")   ;}, "keyup");
        this.keycharm.bind("num-",     () => {this.unbindFromRedraw("_zoomOut")  ;}, "keyup");
        this.keycharm.bind("-",        () => {this.unbindFromRedraw("_zoomOut")  ;}, "keyup");
        this.keycharm.bind("[",        () => {this.unbindFromRedraw("_zoomOut")  ;}, "keyup");
        this.keycharm.bind("]",        () => {this.unbindFromRedraw("_zoomIn")   ;}, "keyup");
        this.keycharm.bind("pageup",   () => {this.unbindFromRedraw("_zoomIn")   ;}, "keyup");
        this.keycharm.bind("pagedown", () => {this.unbindFromRedraw("_zoomOut")  ;}, "keyup");
      }
    }
  }
}


export default NavigationHandler;
