let LabelAccumulator = require('./LabelAccumulator').default;
let ComponentUtil = require('./ComponentUtil').default;


/**
 * Helper class for Label which explodes the label text into lines and blocks within lines
 *
 * @private
 */
class LabelSplitter {

  /**
   * @param {CanvasRenderingContext2D} ctx Canvas rendering context
   * @param {Label} parent reference to the Label instance using current instance
   * @param {boolean} selected 
   * @param {boolean} hover
   */
  constructor(ctx, parent, selected, hover) {
    this.ctx = ctx;
    this.parent = parent;


    /**
     * Callback to determine text width; passed to LabelAccumulator instance
     *
     * @param  {String} text string to determine width of
     * @param  {String} mod  font type to use for this text
     * @return {Object} { width, values} width in pixels and font attributes
     */
    let textWidth = (text, mod) => {
      if (text === undefined) return 0;

      // TODO: This can be done more efficiently with caching
      let values = this.parent.getFormattingValues(ctx, selected, hover, mod);

      let width = 0;
      if (text !== '') {
        // NOTE: The following may actually be *incorrect* for the mod fonts!
        //       This returns the size with a regular font, bold etc. may
        //       have different sizes.
        let measure = this.ctx.measureText(text);
        width = measure.width;
      }

      return {width, values: values};
    };


    this.lines = new LabelAccumulator(textWidth);
  }


  /**
   * Split passed text of a label into lines and blocks.
   *
   * # NOTE
   *
   * The handling of spacing is option dependent:
   *
   * - if `font.multi : false`, all spaces are retained
   * - if `font.multi : true`, every sequence of spaces is compressed to a single space
   *
   * This might not be the best way to do it, but this is as it has been working till now.
   * In order not to break existing functionality, for the time being this behaviour will
   * be retained in any code changes. 
   *
   * @param {string} text  text to split
   * @returns {Array<line>}
   */
  process(text) {
    if (!ComponentUtil.isValidLabel(text)) {
      return this.lines.finalize();
    }

    var font = this.parent.fontOptions;

    // Normalize the end-of-line's to a single representation - order important
    text = text.replace(/\r\n/g, '\n');  // Dos EOL's
    text = text.replace(/\r/g, '\n');        // Mac EOL's

    // Note that at this point, there can be no \r's in the text.
    // This is used later on splitStringIntoLines() to split multifont texts.

    let nlLines = String(text).split('\n');
    let lineCount = nlLines.length;

    if (font.multi) {
      // Multi-font case: styling tags active
      for (let i = 0; i < lineCount; i++) {
        let blocks = this.splitBlocks(nlLines[i], font.multi);
        // Post: Sequences of tabs and spaces are reduced to single space

        if (blocks === undefined) continue;

        if (blocks.length === 0) {
          this.lines.newLine("");
          continue;
        }

        if (font.maxWdt > 0) {
          // widthConstraint.maximum defined
          //console.log('Running widthConstraint multi, max: ' + this.fontOptions.maxWdt);
          for (let j = 0; j < blocks.length; j++) {
            let mod  = blocks[j].mod;
            let text = blocks[j].text;
            this.splitStringIntoLines(text, mod, true);
          }
        } else {
          // widthConstraint.maximum NOT defined
          for (let j = 0; j < blocks.length; j++) {
            let mod  = blocks[j].mod;
            let text = blocks[j].text;
            this.lines.append(text, mod); 
          }
        }

        this.lines.newLine();
      }
    } else {
      // Single-font case
      if (font.maxWdt > 0) {
        // widthConstraint.maximum defined
        // console.log('Running widthConstraint normal, max: ' + this.fontOptions.maxWdt);
        for (let i = 0; i < lineCount; i++) {
          this.splitStringIntoLines(nlLines[i]);
        }
      } else {
        // widthConstraint.maximum NOT defined
        for (let i = 0; i < lineCount; i++) {
          this.lines.newLine(nlLines[i]); 
        }
      }
    }
   
    return this.lines.finalize();
  }


  /**
   * normalize the markup system
   *
   * @param {boolean|'md'|'markdown'|'html'} markupSystem
   * @returns {string}
   */
  decodeMarkupSystem(markupSystem) {
    let system = 'none';
    if (markupSystem === 'markdown' || markupSystem === 'md') {
      system = 'markdown';
    } else if (markupSystem === true || markupSystem === 'html') {
      system = 'html'
    }
    return system;
  }


  /**
   *
   * @param {string} text
   * @returns {Array}
   */
  splitHtmlBlocks(text) {
    let blocks = [];

    // TODO: consolidate following + methods/closures with splitMarkdownBlocks()
    // NOTE: sequences of tabs and spaces are reduced to single space; scan usage of `this.spacing` within method
    let s = {
      bold: false,
      ital: false,
      mono: false,
      spacing: false,
      position: 0,
      buffer: "",
      modStack: []
    };

    s.mod = function() {
      return (this.modStack.length === 0) ? 'normal' : this.modStack[0];
    };

    s.modName = function() {
      if (this.modStack.length === 0)
        return 'normal';
      else if (this.modStack[0] === 'mono')
        return 'mono';
      else {
        if (s.bold && s.ital) {
          return 'boldital';
        } else if (s.bold) {
          return 'bold';
        } else if (s.ital) {
          return 'ital';
        }
      }
    };

    s.emitBlock = function(override=false) {  // eslint-disable-line no-unused-vars
      if (this.spacing) {
        this.add(" ");
        this.spacing = false;
      }
      if (this.buffer.length > 0) {
        blocks.push({ text: this.buffer, mod: this.modName() });
        this.buffer = "";
      }
    };

    s.add = function(text) {
      if (text === " ") {
        s.spacing = true;
      }
      if (s.spacing) {
        this.buffer += " ";
        this.spacing = false;
      }
      if (text != " ") {
        this.buffer += text;
      }
    };

    while (s.position < text.length) {
      let ch = text.charAt(s.position);
      if (/[ \t]/.test(ch)) {
        if (!s.mono) {
          s.spacing = true;
        } else {
          s.add(ch);
        }
      } else if (/</.test(ch)) {
        if (!s.mono && !s.bold && /<b>/.test(text.substr(s.position,3))) {
          s.emitBlock();
          s.bold = true;
          s.modStack.unshift("bold");
          s.position += 2;
        } else if (!s.mono && !s.ital && /<i>/.test(text.substr(s.position,3))) {
          s.emitBlock();
          s.ital = true;
          s.modStack.unshift("ital");
          s.position += 2;
        } else if (!s.mono && /<code>/.test(text.substr(s.position,6))) {
          s.emitBlock();
          s.mono = true;
          s.modStack.unshift("mono");
          s.position += 5;
        } else if (!s.mono && (s.mod() === 'bold') && /<\/b>/.test(text.substr(s.position,4))) {
          s.emitBlock();
          s.bold = false;
          s.modStack.shift();
          s.position += 3;
        } else if (!s.mono && (s.mod() === 'ital') && /<\/i>/.test(text.substr(s.position,4))) {
          s.emitBlock();
          s.ital = false;
          s.modStack.shift();
          s.position += 3;
        } else if ((s.mod() === 'mono') && /<\/code>/.test(text.substr(s.position,7))) {
          s.emitBlock();
          s.mono = false;
          s.modStack.shift();
          s.position += 6;
        } else {
          s.add(ch);
        }
      } else if (/&/.test(ch)) {
        if (/&lt;/.test(text.substr(s.position,4))) {
          s.add("<");
          s.position += 3;
        } else if (/&amp;/.test(text.substr(s.position,5))) {
          s.add("&");
          s.position += 4;
        } else {
          s.add("&");
        }
      } else {
        s.add(ch);
      }
      s.position++
    }
    s.emitBlock();
    return blocks;
  }


  /**
   *
   * @param {string} text
   * @returns {Array}
   */
  splitMarkdownBlocks(text) {
    let blocks = [];

    // TODO: consolidate following + methods/closures with splitHtmlBlocks()
    // NOTE: sequences of tabs and spaces are reduced to single space; scan usage of `this.spacing` within method
    let s = {
      bold: false,
      ital: false,
      mono: false,
      beginable: true,
      spacing: false,
      position: 0,
      buffer: "",
      modStack: []
    };

    s.mod = function() {
      return (this.modStack.length === 0) ? 'normal' : this.modStack[0];
    };

    s.modName = function() {
      if (this.modStack.length === 0)
        return 'normal';
      else if (this.modStack[0] === 'mono')
        return 'mono';
      else {
        if (s.bold && s.ital) {
          return 'boldital';
        } else if (s.bold) {
          return 'bold';
        } else if (s.ital) {
          return 'ital';
        }
      }
    };

    s.emitBlock = function(override=false) {  // eslint-disable-line no-unused-vars
      if (this.spacing) {
        this.add(" ");
        this.spacing = false;
      }
      if (this.buffer.length > 0) {
        blocks.push({ text: this.buffer, mod: this.modName() });
        this.buffer = "";
      }
    };

    s.add = function(text) {
      if (text === " ") {
        s.spacing = true;
      }
      if (s.spacing) {
        this.buffer += " ";
        this.spacing = false;
      }
      if (text != " ") {
        this.buffer += text;
      }
    };

    while (s.position < text.length) {
      let ch = text.charAt(s.position);
      if (/[ \t]/.test(ch)) {
        if (!s.mono) {
          s.spacing = true;
        } else {
          s.add(ch);
        }
        s.beginable = true
      } else if (/\\/.test(ch)) {
        if (s.position < text.length+1) {
          s.position++;
          ch = text.charAt(s.position);
          if (/ \t/.test(ch)) {
            s.spacing = true;
          } else {
            s.add(ch);
            s.beginable = false;
          }
        }
      } else if (!s.mono && !s.bold && (s.beginable || s.spacing) && /\*/.test(ch)) {
        s.emitBlock();
        s.bold = true;
        s.modStack.unshift("bold");
      } else if (!s.mono && !s.ital && (s.beginable || s.spacing) && /\_/.test(ch)) {
        s.emitBlock();
        s.ital = true;
        s.modStack.unshift("ital");
      } else if (!s.mono && (s.beginable || s.spacing) && /`/.test(ch)) {
        s.emitBlock();
        s.mono = true;
        s.modStack.unshift("mono");
      } else if (!s.mono && (s.mod() === "bold") && /\*/.test(ch)) {
        if ((s.position === text.length-1) || /[.,_` \t\n]/.test(text.charAt(s.position+1))) {
          s.emitBlock();
          s.bold = false;
          s.modStack.shift();
        } else {
          s.add(ch);
        }
      } else if (!s.mono && (s.mod() === "ital") && /\_/.test(ch)) {
        if ((s.position === text.length-1) || /[.,*` \t\n]/.test(text.charAt(s.position+1))) {
          s.emitBlock();
          s.ital = false;
          s.modStack.shift();
        } else {
          s.add(ch);
        }
      } else if (s.mono && (s.mod() === "mono") && /`/.test(ch)) {
        if ((s.position === text.length-1) || (/[.,*_ \t\n]/.test(text.charAt(s.position+1)))) {
          s.emitBlock();
          s.mono = false;
          s.modStack.shift();
        } else {
          s.add(ch);
        }
      } else {
        s.add(ch);
        s.beginable = false;
      }
      s.position++
    }
    s.emitBlock();
    return blocks;
  }


  /**
   * Explodes a piece of text into single-font blocks using a given markup
   *
   * @param {string} text
   * @param {boolean|'md'|'markdown'|'html'} markupSystem
   * @returns {Array.<{text: string, mod: string}>}
   * @private
   */
  splitBlocks(text, markupSystem) {
    let system = this.decodeMarkupSystem(markupSystem);
    if (system === 'none') {
      return [{
        text: text,
        mod: 'normal'
      }]
    } else if (system === 'markdown') {
      return this.splitMarkdownBlocks(text);
    } else if (system === 'html') {
      return this.splitHtmlBlocks(text);
    }
  }


  /**
   * @param {string} text
   * @returns {boolean} true if text length over the current max with
   * @private
   */
  overMaxWidth(text) {
    let width = this.ctx.measureText(text).width;
    return (this.lines.curWidth() + width > this.parent.fontOptions.maxWdt);
  }


  /**
   * Determine the longest part of the sentence which still fits in the 
   * current max width.
   * 
   * @param {Array} words  Array of strings signifying a text lines
   * @return {number}      index of first item in string making string go over max
   * @private
   */
  getLongestFit(words) {
    let text = '';
    let w = 0;

    while (w < words.length) {
      let pre = (text === '') ? '' : ' ';
      let newText = text + pre + words[w];

      if (this.overMaxWidth(newText)) break;
      text = newText;
      w++;
    }

    return w;
  }


  /**
   * Determine the longest part of the string which still fits in the
   * current max width.
   * 
   * @param {Array} words Array of strings signifying a text lines
   * @return {number} index of first item in string making string go over max
   */
   getLongestFitWord(words) {
     let w = 0;

     while (w < words.length) {
       if (this.overMaxWidth(words.slice(0,w))) break;
       w++;
     }

     return w;
  }


  /**
   * Split the passed text into lines, according to width constraint (if any).
   * 
   * The method assumes that the input string is a single line, i.e. without lines break.
   *
   * This method retains spaces, if still present (case `font.multi: false`).
   * A space which falls on an internal line break, will be replaced by a newline.
   * There is no special handling of tabs; these go along with the flow.
   * 
   * @param {string} str
   * @param {string} [mod='normal']
   * @param {boolean} [appendLast=false]
   * @private
   */
  splitStringIntoLines(str, mod = 'normal', appendLast = false) {
    // Still-present spaces are relevant, retain them
    str = str.replace(/^( +)/g, '$1\r');
    str = str.replace(/([^\r][^ ]*)( +)/g, '$1\r$2\r');
    let words = str.split('\r');

    while (words.length > 0) {
      let w = this.getLongestFit(words);

      if (w === 0) {
        // Special case: the first word is already larger than the max width.
        let word = words[0];

        // Break the word to the largest part that fits the line
        let x = this.getLongestFitWord(word);
        this.lines.newLine(word.slice(0, x), mod);

        // Adjust the word, so that the rest will be done next iteration
        words[0] = word.slice(x);
      } else {
        // skip any space that is replaced by a newline
        let newW = w;
        if (words[w - 1] === ' ') {
          w--;
        } else if (words[newW] === ' ') {
          newW++;
        }

        let text = words.slice(0, w).join("");

        if (w == words.length && appendLast) {
          this.lines.append(text, mod); 
        } else {
          this.lines.newLine(text, mod); 
        }

        // Adjust the word, so that the rest will be done next iteration
        words = words.slice(newW);
      }
    }
  }
} 

export default LabelSplitter;
