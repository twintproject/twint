/**
 * This object contains all possible options. It will check if the types are correct, if required if the option is one
 * of the allowed values.
 *
 * __any__ means that the name of the property does not matter.
 * __type__ is a required field for all objects and contains the allowed types of all objects
 */
let string = 'string';
let bool = 'boolean';
let number = 'number';
let array = 'array';
let date = 'date';
let object = 'object'; // should only be in a __type__ property
let dom = 'dom';
let moment = 'moment';
let any = 'any';

let allOptions = {
  configure: {
    enabled: { 'boolean': bool},
    filter: { 'boolean': bool,'function': 'function'},
    container: {dom},
    __type__: {object, 'boolean': bool,'function': 'function'}
  },

  //globals :
  align: {string},
  rtl: { 'boolean': bool, 'undefined': 'undefined'},
  rollingMode: {
    follow: { 'boolean': bool },
    offset: {number,'undefined': 'undefined'},
    __type__: {object}
  },
  verticalScroll: { 'boolean': bool, 'undefined': 'undefined'},
  horizontalScroll: { 'boolean': bool, 'undefined': 'undefined'},
  autoResize: { 'boolean': bool},
  throttleRedraw: {number}, // TODO: DEPRICATED see https://github.com/almende/vis/issues/2511
  clickToUse: { 'boolean': bool},
  dataAttributes: {string, array},
  editable: {
    add: { 'boolean': bool, 'undefined': 'undefined'},
    remove: { 'boolean': bool, 'undefined': 'undefined'},
    updateGroup: { 'boolean': bool, 'undefined': 'undefined'},
    updateTime: { 'boolean': bool, 'undefined': 'undefined'},
    overrideItems: { 'boolean': bool, 'undefined': 'undefined'},
    __type__: { 'boolean': bool, object}
  },
  end: {number, date, string, moment},
  format: {
    minorLabels: {
      millisecond: {string,'undefined': 'undefined'},
      second: {string,'undefined': 'undefined'},
      minute: {string,'undefined': 'undefined'},
      hour: {string,'undefined': 'undefined'},
      weekday: {string,'undefined': 'undefined'},
      day: {string,'undefined': 'undefined'},
      week: {string,'undefined': 'undefined'},
      month: {string,'undefined': 'undefined'},
      year: {string,'undefined': 'undefined'},
      __type__: {object, 'function': 'function'}
    },
    majorLabels: {
      millisecond: {string,'undefined': 'undefined'},
      second: {string,'undefined': 'undefined'},
      minute: {string,'undefined': 'undefined'},
      hour: {string,'undefined': 'undefined'},
      weekday: {string,'undefined': 'undefined'},
      day: {string,'undefined': 'undefined'},
      week: {string,'undefined': 'undefined'},
      month: {string,'undefined': 'undefined'},
      year: {string,'undefined': 'undefined'},
      __type__: {object, 'function': 'function'}
    },
    __type__: {object}
  },
  moment: {'function': 'function'},
  groupOrder: {string, 'function': 'function'},
  groupEditable: {
    add: { 'boolean': bool, 'undefined': 'undefined'},
    remove: { 'boolean': bool, 'undefined': 'undefined'},
    order: { 'boolean': bool, 'undefined': 'undefined'},
    __type__: { 'boolean': bool, object}
  },
  groupOrderSwap: {'function': 'function'},
  height: {string, number},
  hiddenDates: {
    start: {date, number, string, moment},
    end: {date, number, string, moment},
    repeat: {string},
    __type__: {object, array}
  },
  itemsAlwaysDraggable: {
    item: { 'boolean': bool, 'undefined': 'undefined'},
    range: { 'boolean': bool, 'undefined': 'undefined'},
    __type__: { 'boolean': bool, object}
  },
  limitSize: {'boolean': bool},
  locale:{string},
  locales:{
    __any__: {any},
    __type__: {object}
  },
  margin: {
    axis: {number},
    item: {
      horizontal: {number,'undefined': 'undefined'},
      vertical: {number,'undefined': 'undefined'},
      __type__: {object,number}
    },
    __type__: {object,number}
  },
  max: {date, number, string, moment},
  maxHeight: {number, string},
  maxMinorChars: {number},
  min: {date, number, string, moment},
  minHeight: {number, string},
  moveable: { 'boolean': bool},
  multiselect: { 'boolean': bool},
  multiselectPerGroup: { 'boolean': bool},
  onAdd: {'function': 'function'},
  onDropObjectOnItem: {'function': 'function'},
  onUpdate: {'function': 'function'},
  onMove: {'function': 'function'},
  onMoving: {'function': 'function'},
  onRemove: {'function': 'function'},
  onAddGroup: {'function': 'function'},
  onMoveGroup: {'function': 'function'},
  onRemoveGroup: {'function': 'function'},
  onInitialDrawComplete: {'function': 'function'},
  order: {'function': 'function'},
  orientation: {
    axis: {string,'undefined': 'undefined'},
    item: {string,'undefined': 'undefined'},
    __type__: {string, object}
  },
  selectable: { 'boolean': bool},
  showCurrentTime: { 'boolean': bool},
  showMajorLabels: { 'boolean': bool},
  showMinorLabels: { 'boolean': bool},
  stack: { 'boolean': bool},
  stackSubgroups: { 'boolean': bool},
  snap: {'function': 'function', 'null': 'null'},
  start: {date, number, string, moment},
  template: {'function': 'function'},
  groupTemplate: {'function': 'function'},
  visibleFrameTemplate: {string, 'function': 'function'},
  showTooltips: { 'boolean': bool},
  tooltip: {
    followMouse: { 'boolean': bool },
    overflowMethod: { 'string': ['cap', 'flip'] },
    __type__: {object}
  },
  tooltipOnItemUpdateTime: {
    template: {'function': 'function'},
    __type__: { 'boolean': bool, object}
  },
  timeAxis: {
    scale: {string,'undefined': 'undefined'},
    step: {number,'undefined': 'undefined'},
    __type__: {object}
  },
  type: {string},
  width: {string, number},
  zoomable: { 'boolean': bool},
  zoomKey: {string: ['ctrlKey', 'altKey', 'metaKey', '']},
  zoomMax: {number},
  zoomMin: {number},

  __type__: {object}
};

let configureOptions = {
  global: {
    align:  ['center', 'left', 'right'],
    direction:  false,
    autoResize: true,
    clickToUse: false,
    // dataAttributes: ['all'], // FIXME: can be 'all' or string[]
    editable: {
      add: false,
      remove: false,
      updateGroup: false,
      updateTime: false
    },
    end: '',
    format: {
      minorLabels: {
        millisecond:'SSS',
        second:     's',
        minute:     'HH:mm',
        hour:       'HH:mm',
        weekday:    'ddd D',
        day:        'D',
        week:       'w',
        month:      'MMM',
        year:       'YYYY'
      },
      majorLabels: {
        millisecond:'HH:mm:ss',
        second:     'D MMMM HH:mm',
        minute:     'ddd D MMMM',
        hour:       'ddd D MMMM',
        weekday:    'MMMM YYYY',
        day:        'MMMM YYYY',
        week:       'MMMM YYYY',
        month:      'YYYY',
        year:       ''
      }
    },

    //groupOrder: {string, 'function': 'function'},
    groupsDraggable: false,
    height: '',
    //hiddenDates: {object, array},
    locale: '',
    margin: {
      axis: [20, 0, 100, 1],
      item: {
        horizontal: [10, 0, 100, 1],
        vertical: [10, 0, 100, 1]
      }
    },
    max: '',
    maxHeight: '',
    maxMinorChars: [7, 0, 20, 1],
    min: '',
    minHeight: '',
    moveable: false,
    multiselect: false,
    multiselectPerGroup: false,
    //onAdd: {'function': 'function'},
    //onUpdate: {'function': 'function'},
    //onMove: {'function': 'function'},
    //onMoving: {'function': 'function'},
    //onRename: {'function': 'function'},
    //order: {'function': 'function'},
    orientation: {
      axis: ['both', 'bottom', 'top'],
      item: ['bottom', 'top']
    },
    selectable: true,
    showCurrentTime: false,
    showMajorLabels: true,
    showMinorLabels: true,
    stack: true,
    stackSubgroups: true,
    //snap: {'function': 'function', nada},
    start: '',
    //template: {'function': 'function'},
    //timeAxis: {
    //  scale: ['millisecond', 'second', 'minute', 'hour', 'weekday', 'day', 'week', 'month', 'year'],
    //  step: [1, 1, 10, 1]
    //},
    showTooltips: true,
    tooltip: {
      followMouse: false,
      overflowMethod: 'flip'
    },
    tooltipOnItemUpdateTime: false,
    type: ['box', 'point', 'range', 'background'],
    width: '100%',
    zoomable: true,
    zoomKey: ['ctrlKey', 'altKey', 'metaKey', ''],
    zoomMax: [315360000000000, 10, 315360000000000, 1],
    zoomMin: [10, 10, 315360000000000, 1]
  }
};

export {allOptions, configureOptions};
