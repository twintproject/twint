require('mocha-as-promised')();
var assert = require('assert');
var Promise = require('promise');
var nodeify = require('../');

var A = {};
var B = {};

describe('nodeify(promise, callback)', function () {
  describe('when callback is a function', function () {
    it('still returns a promise which is always fulfilled with undefined', function () {
      var pA = new Promise(function (res) { res.fulfill(A); });
      var pB = new Promise(function (res) { res.reject(B); });
      return nodeify(pA, function (err, res) {})
        .then(function (res) {
          assert(typeof res === 'undefined');
          return nodeify(pB, function (err, res) {});
        })
        .then(function (res) {
          assert(typeof res === 'undefined');
        });
    });
    describe('when the promise is resolved', function () {
      it('calls the callback with (null, result)', function (done) {
        var p = new Promise(function (res) { res.fulfill(A); });
        nodeify(p, function (err, res) {
          if (err) return done(err);
          assert(res === A);
          done();
        });
      });
    });
    describe('when the promise is rejected', function () {
      it('calls the callback with (error)', function (done) {
        var p = new Promise(function (res) { res.reject(A); });
        nodeify(p, function (err, res) {
          assert(err === A);
          assert(arguments.length === 1);
          done();
        });
      });
    });
  });
  describe('when callback is not a function', function () {
    it('returns the original promise', function () {
      assert(nodeify(A) === A);
      assert(nodeify(A, null) === A);
      assert(nodeify(A, B) === A);
    });
  });
});

describe('(new nodeify.Promise(fn)).nodeify(callback)', function () {
  describe('when callback is a function', function () {
    it('still returns a promise which is always fulfilled with undefined', function () {
      var pA = new nodeify.Promise(function (res) { res.fulfill(A); });
      var pB = new nodeify.Promise(function (res) { res.reject(B); });
      return pA.nodeify(function (err, res) {})
        .then(function (res) {
          assert(typeof res === 'undefined');
          return pB.nodeify(function (err, res) {});
        })
        .then(function (res) {
          assert(typeof res === 'undefined');
        });
    });
    describe('when the promise is resolved', function () {
      it('calls the callback with (null, result)', function (done) {
        var p = new nodeify.Promise(function (res) { res.fulfill(A); });
        p.nodeify(function (err, res) {
          if (err) return done(err);
          assert(res === A);
          done();
        });
      });
    });
    describe('when the promise is rejected', function () {
      it('calls the callback with (error)', function (done) {
        var p = new nodeify.Promise(function (res) { res.reject(A); });
        p.nodeify(function (err, res) {
          assert(err === A);
          assert(arguments.length === 1);
          done();
        });
      });
    });
  });
  describe('when callback is not a function', function () {
    it('returns the original promise', function () {
      var p = new nodeify.Promise(function (res) { res.fulfill(A); });
      assert(p.nodeify() === p);
      assert(p.nodeify(null) === p);
      assert(p.nodeify(B) === p);
    });
  });
  describe('calls to then', function () {
    it('maintain the nodeify method', function (done) {
      (new nodeify.Promise(function (res) { res.fulfill(A); }))
        .then(function () { return B; })
        .then(function (res) {
          assert(res === B);
          return A;
        })
        .nodeify(function (err, res) {
          if (err) return done(err);
          assert(res === A);
          done();
        });
    });
  });
});

describe('nodeify.extend(promise)', function () {
  it('adds the nodeify method to promise (including promises resulting from calling promise.then)', function (done) {
      nodeify.extend(new Promise(function (res) { res.fulfill(A); }))
        .then(function () { return B; })
        .then(function (res) {
          assert(res === B);
          return A;
        })
        .nodeify(function (err, res) {
          if (err) return done(err);
          assert(res === A);
          done();
        });
  });
});

describe('nodeify.extend(PromiseConstructor)', function () {
  function PromiseConstructor() {};
  it('adds the nodeify method to PromiseConstructor.prototype', function () {
    nodeify.extend(PromiseConstructor)
    assert(typeof PromiseConstructor.prototype.nodeify === 'function');
  });
});
describe('nodeify.extend()', function () {
  it('adds the nodeify method on to all promises inheriting from Promise', function () {
    nodeify.extend()
    assert(typeof Promise.prototype.nodeify === 'function');
  });
});