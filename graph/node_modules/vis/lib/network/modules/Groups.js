let util = require('../../util');

/**
 * This class can store groups and options specific for groups.
 */
class Groups {
  /**
   * @ignore
   */
  constructor() {
    this.clear();
    this.defaultIndex = 0;
    this.groupsArray = [];
    this.groupIndex = 0;

    this.defaultGroups = [
      {border: "#2B7CE9", background: "#97C2FC", highlight: {border: "#2B7CE9", background: "#D2E5FF"}, hover: {border: "#2B7CE9", background: "#D2E5FF"}}, // 0: blue
      {border: "#FFA500", background: "#FFFF00", highlight: {border: "#FFA500", background: "#FFFFA3"}, hover: {border: "#FFA500", background: "#FFFFA3"}}, // 1: yellow
      {border: "#FA0A10", background: "#FB7E81", highlight: {border: "#FA0A10", background: "#FFAFB1"}, hover: {border: "#FA0A10", background: "#FFAFB1"}}, // 2: red
      {border: "#41A906", background: "#7BE141", highlight: {border: "#41A906", background: "#A1EC76"}, hover: {border: "#41A906", background: "#A1EC76"}}, // 3: green
      {border: "#E129F0", background: "#EB7DF4", highlight: {border: "#E129F0", background: "#F0B3F5"}, hover: {border: "#E129F0", background: "#F0B3F5"}}, // 4: magenta
      {border: "#7C29F0", background: "#AD85E4", highlight: {border: "#7C29F0", background: "#D3BDF0"}, hover: {border: "#7C29F0", background: "#D3BDF0"}}, // 5: purple
      {border: "#C37F00", background: "#FFA807", highlight: {border: "#C37F00", background: "#FFCA66"}, hover: {border: "#C37F00", background: "#FFCA66"}}, // 6: orange
      {border: "#4220FB", background: "#6E6EFD", highlight: {border: "#4220FB", background: "#9B9BFD"}, hover: {border: "#4220FB", background: "#9B9BFD"}}, // 7: darkblue
      {border: "#FD5A77", background: "#FFC0CB", highlight: {border: "#FD5A77", background: "#FFD1D9"}, hover: {border: "#FD5A77", background: "#FFD1D9"}}, // 8: pink
      {border: "#4AD63A", background: "#C2FABC", highlight: {border: "#4AD63A", background: "#E6FFE3"}, hover: {border: "#4AD63A", background: "#E6FFE3"}}, // 9: mint

      {border: "#990000", background: "#EE0000", highlight: {border: "#BB0000", background: "#FF3333"}, hover: {border: "#BB0000", background: "#FF3333"}}, // 10:bright red

      {border: "#FF6000", background: "#FF6000", highlight: {border: "#FF6000", background: "#FF6000"}, hover: {border: "#FF6000", background: "#FF6000"}}, // 12: real orange
      {border: "#97C2FC", background: "#2B7CE9", highlight: {border: "#D2E5FF", background: "#2B7CE9"}, hover: {border: "#D2E5FF", background: "#2B7CE9"}}, // 13: blue
      {border: "#399605", background: "#255C03", highlight: {border: "#399605", background: "#255C03"}, hover: {border: "#399605", background: "#255C03"}}, // 14: green
      {border: "#B70054", background: "#FF007E", highlight: {border: "#B70054", background: "#FF007E"}, hover: {border: "#B70054", background: "#FF007E"}}, // 15: magenta
      {border: "#AD85E4", background: "#7C29F0", highlight: {border: "#D3BDF0", background: "#7C29F0"}, hover: {border: "#D3BDF0", background: "#7C29F0"}}, // 16: purple
      {border: "#4557FA", background: "#000EA1", highlight: {border: "#6E6EFD", background: "#000EA1"}, hover: {border: "#6E6EFD", background: "#000EA1"}}, // 17: darkblue
      {border: "#FFC0CB", background: "#FD5A77", highlight: {border: "#FFD1D9", background: "#FD5A77"}, hover: {border: "#FFD1D9", background: "#FD5A77"}}, // 18: pink
      {border: "#C2FABC", background: "#74D66A", highlight: {border: "#E6FFE3", background: "#74D66A"}, hover: {border: "#E6FFE3", background: "#74D66A"}}, // 19: mint

      {border: "#EE0000", background: "#990000", highlight: {border: "#FF3333", background: "#BB0000"}, hover: {border: "#FF3333", background: "#BB0000"}} // 20:bright red
    ];

    this.options = {};
    this.defaultOptions = {
      useDefaultGroups: true
    };
    util.extend(this.options, this.defaultOptions);
  }

  /**
   *
   * @param {Object} options
   */
  setOptions(options) {
    let optionFields = ['useDefaultGroups'];

    if (options !== undefined) {
      for (let groupName in options) {
        if (options.hasOwnProperty(groupName)) {
          if (optionFields.indexOf(groupName) === -1) {
            let group = options[groupName];
            this.add(groupName, group);
          }
        }
      }
    }
  }

  
  /**
   * Clear all groups
   */
  clear() {
    this.groups = {};
    this.groupsArray = [];
  }
  
  /**
   * Get group options of a groupname.
   * If groupname is not found, a new group may be created.
   *
   * @param {*}       groupname     Can be a number, string, Date, etc.
   * @param {boolean} [shouldCreate=true] If true, create a new group
   * @return {Object} The found or created group
   */
  get(groupname, shouldCreate = true) {
    let group = this.groups[groupname];

    if (group === undefined && shouldCreate) {
      if (this.options.useDefaultGroups === false && this.groupsArray.length > 0) {
        // create new group
        let index = this.groupIndex % this.groupsArray.length;
        this.groupIndex++;
        group = {};
        group.color = this.groups[this.groupsArray[index]];
        this.groups[groupname] = group;
      }
      else {
        // create new group
        let index = this.defaultIndex % this.defaultGroups.length;
        this.defaultIndex++;
        group = {};
        group.color = this.defaultGroups[index];
        this.groups[groupname] = group;
      }
    }
  
    return group;
  }
  
  /**
   * Add a custom group style
   * @param {string} groupName
   * @param {Object} style       An object containing borderColor,
   *                             backgroundColor, etc.
   * @return {Object} group      The created group object
   */
  add(groupName, style) {
    this.groups[groupName] = style;
    this.groupsArray.push(groupName);
    return style;
  }
}

export default Groups;
