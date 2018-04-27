import NodeBase from './NodeBase';

/**
 * NOTE: This is a bad base class
 *
 * Child classes are:
 *
 *   Image       - uses *only* image methods
 *   Circle      - uses *only* _drawRawCircle
 *   CircleImage - uses all
 *
 * TODO: Refactor, move _drawRawCircle to different module, derive Circle from NodeBase
 *       Rename this to ImageBase
 *       Consolidate common code in Image and CircleImage to base class
 *
 * @extends NodeBase
 */
class CircleImageBase extends NodeBase {
  /**
   * @param {Object} options
   * @param {Object} body
   * @param {Label} labelModule
   */
  constructor(options, body, labelModule) {
    super(options, body, labelModule);
    this.labelOffset = 0;
    this.selected = false;
  }

  /**
   *
   * @param {Object} options
   * @param {Object} [imageObj]
   * @param {Object} [imageObjAlt]
   */
  setOptions(options, imageObj, imageObjAlt) {
    this.options = options;

    if (!(imageObj === undefined && imageObjAlt === undefined)) {
      this.setImages(imageObj, imageObjAlt);
    }
  }


  /**
   * Set the images for this node.
   *
   * The images can be updated after the initial setting of options;
   * therefore, this method needs to be reentrant. 
   *
   * For correct working in error cases, it is necessary to properly set
   * field 'nodes.brokenImage' in the options.
   *
   * @param {Image} imageObj  required; main image to show for this node
   * @param {Image|undefined} imageObjAlt optional; image to show when node is selected
   */
  setImages(imageObj, imageObjAlt) {
    if (imageObjAlt && this.selected) {
      this.imageObj    = imageObjAlt;
      this.imageObjAlt = imageObj;
    } else {
      this.imageObj    = imageObj;
      this.imageObjAlt = imageObjAlt;
    }
  }

  /**
   * Set selection and switch between the base and the selected image.
   *
   * Do the switch only if imageObjAlt exists.
   *
   * @param {boolean} selected value of new selected state for current node
   */
  switchImages(selected) {
    var selection_changed = ((selected && !this.selected) || (!selected && this.selected));
    this.selected = selected;    // Remember new selection

    if (this.imageObjAlt !== undefined && selection_changed) {
      let imageTmp = this.imageObj;
      this.imageObj = this.imageObjAlt;
      this.imageObjAlt = imageTmp;
    }
  }

  /**
   * Adjust the node dimensions for a loaded image.
   *
   * Pre: this.imageObj is valid
   */
  _resizeImage() {
    var width, height;

    if (this.options.shapeProperties.useImageSize === false) {
      // Use the size property
      var ratio_width  = 1;
      var ratio_height = 1;

      // Only calculate the proper ratio if both width and height not zero
      if (this.imageObj.width && this.imageObj.height) {
        if (this.imageObj.width > this.imageObj.height) {
          ratio_width = this.imageObj.width / this.imageObj.height;
        }
        else {
          ratio_height = this.imageObj.height / this.imageObj.width;
        }
      }

      width  = this.options.size * 2 * ratio_width;
      height = this.options.size * 2 * ratio_height;
    }
    else {
      // Use the image size
      width  = this.imageObj.width;
      height = this.imageObj.height;
    }

    this.width = width;
    this.height = height;
    this.radius = 0.5 * this.width;
  }

  /**
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x width
   * @param {number} y height
   * @param {{toArrow: boolean, toArrowScale: (allOptions.edges.arrows.to.scaleFactor|{number}|allOptions.edges.arrows.middle.scaleFactor|allOptions.edges.arrows.from.scaleFactor|Array|number), toArrowType: *, middleArrow: boolean, middleArrowScale: (number|allOptions.edges.arrows.middle.scaleFactor|{number}|Array), middleArrowType: (allOptions.edges.arrows.middle.type|{string}|string|*), fromArrow: boolean, fromArrowScale: (allOptions.edges.arrows.to.scaleFactor|{number}|allOptions.edges.arrows.middle.scaleFactor|allOptions.edges.arrows.from.scaleFactor|Array|number), fromArrowType: *, arrowStrikethrough: (*|boolean|allOptions.edges.arrowStrikethrough|{boolean}), color: undefined, inheritsColor: (string|string|string|allOptions.edges.color.inherit|{string, boolean}|Array|*), opacity: *, hidden: *, length: *, shadow: *, shadowColor: *, shadowSize: *, shadowX: *, shadowY: *, dashes: (*|boolean|Array|allOptions.edges.dashes|{boolean, array}), width: *}} values
   * @private
   */
  _drawRawCircle(ctx, x, y, values) {
    this.initContextForDraw(ctx, values);
    ctx.circle(x, y, values.size);
    this.performFill(ctx, values);
  }

  /**
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {{toArrow: boolean, toArrowScale: (allOptions.edges.arrows.to.scaleFactor|{number}|allOptions.edges.arrows.middle.scaleFactor|allOptions.edges.arrows.from.scaleFactor|Array|number), toArrowType: *, middleArrow: boolean, middleArrowScale: (number|allOptions.edges.arrows.middle.scaleFactor|{number}|Array), middleArrowType: (allOptions.edges.arrows.middle.type|{string}|string|*), fromArrow: boolean, fromArrowScale: (allOptions.edges.arrows.to.scaleFactor|{number}|allOptions.edges.arrows.middle.scaleFactor|allOptions.edges.arrows.from.scaleFactor|Array|number), fromArrowType: *, arrowStrikethrough: (*|boolean|allOptions.edges.arrowStrikethrough|{boolean}), color: undefined, inheritsColor: (string|string|string|allOptions.edges.color.inherit|{string, boolean}|Array|*), opacity: *, hidden: *, length: *, shadow: *, shadowColor: *, shadowSize: *, shadowX: *, shadowY: *, dashes: (*|boolean|Array|allOptions.edges.dashes|{boolean, array}), width: *}} values
   * @private
   */
  _drawImageAtPosition(ctx, values) {
    if (this.imageObj.width != 0) {
      // draw the image
      ctx.globalAlpha = 1.0;

      // draw shadow if enabled
      this.enableShadow(ctx, values);

      let factor = 1;
      if (this.options.shapeProperties.interpolation === true) {
        factor = (this.imageObj.width / this.width) / this.body.view.scale;
      }

      this.imageObj.drawImageAtPosition(ctx, factor, this.left, this.top, this.width, this.height);

      // disable shadows for other elements.
      this.disableShadow(ctx, values);
    }
  }

  /**
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x width
   * @param {number} y height
   * @param {boolean} selected
   * @param {boolean} hover
   * @private
   */
  _drawImageLabel(ctx, x, y, selected, hover) {
    var yLabel;
    var offset = 0;

    if (this.height !== undefined) {
      offset = this.height * 0.5;
      var labelDimensions = this.labelModule.getTextSize(ctx, selected, hover);
      if (labelDimensions.lineCount >= 1) {
        offset += labelDimensions.height / 2;
      }
    }

    yLabel = y + offset;

    if (this.options.label) {
      this.labelOffset = offset;
    }
    this.labelModule.draw(ctx, x, yLabel, selected, hover, 'hanging');
  }
}

export default CircleImageBase;
