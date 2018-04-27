var Pickle = require('./pickle')

module.exports = {
  createEmpty: function () {
    return new Pickle()
  },

  createFromBuffer: function (buffer) {
    return new Pickle(buffer)
  }
}
