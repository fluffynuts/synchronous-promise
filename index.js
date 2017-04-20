"use strict";
function argumentsToArray(args) {
  return Array.prototype.slice.apply(args);
}

function SynchronousPromise(ctorFunction) {
  this.status = "pending";
  this._next = [];
  this._catchFunctions = [];
  this._paused = false;
  this._runConstructorFunction(ctorFunction);
}
SynchronousPromise.prototype = {
  then: function (next, fail) {
    this._next.push([next, fail]);
    if (this.status === "resolved") {
      this._applyNext();
    }
    return this;
  },
  catch: function (fn) {
    this._catchFunctions.push(fn);
    if (this.status === "rejected") {
      this._applyCatch();
    }
    return this;
  },
  pause: function () {
    this._paused = true;
    return this;
  },
  resume: function () {
    this._paused = false;
    var self = this;
    this._applyCatch().then(function () {
      self._applyNext();
    });
    return this;
  },
  _runConstructorFunction: function (ctorFunction) {
    var self = this;
    var doCatch = function (args) {
      self._catchData = argumentsToArray(args);
      self._setRejected();
      self._applyCatch();
    };
    ctorFunction(function () {
      self._data = argumentsToArray(arguments);
      var doResolve = function () {
        self._setResolved();
        self._applyNext();
      };
      if (self._looksLikePromise(self._data[0])) {
        self._data[0].then(function () {
          self._data = argumentsToArray(arguments);
          doResolve();
        }).catch(function () {
          doCatch(arguments);
        });
      } else {
        doResolve();
      }
    }, function () {
      self._setRejected();
      doCatch(arguments);
    });
  },
  _setRejected: function () {
    this.status = "rejected";
  },
  _setResolved: function () {
    this.status = "resolved";
  },
  _applyNext: function () {
    if (this._next.length === 0 || this._paused) {
      return;
    }
    var next = this._next.shift();
    try {
      if (!next) {
        return;
      }
      var data = next[0].apply(null, this._data),
        self = this;
      if (this._looksLikePromise(data)) {
        data.then(function () {
          self._data = Array.prototype.slice.apply(arguments);
          self._applyNext();
        }).catch(function (e) {
          throw e;
        });
      } else {
        this._data = [data];
        this._applyNext();
      }
    } catch (e) {
      this._next = [];
      this._data = undefined;
      if (next[1]) {
        try { next[1](e); } catch (ignore) { }
      } else {
        this._catchData = [e];
        this._setRejected();
        this._applyCatch();
      }
    }
  },
  _looksLikePromise: function (thing) {
    return thing &&
      thing.then &&
      typeof (thing.then) === "function";
  },
  _applyCatch: function () {
    if (this._paused || this._catchFunctions.length === 0) {
      return SynchronousPromise.resolve();
    }
    var catchFunction = (this._catchFunctions || []).shift(),
      catchData = this._catchData;
    if (!(catchFunction && catchData)) {
      return SynchronousPromise.resolve(); // nyom
    }
    var result = catchFunction.apply(null, catchData);
    if (this._looksLikePromise(result)) {
      var self = this;
      result.then(function () {
        self._data = Array.prototype.slice.apply(arguments);
        self._setResolved();
        self._applyNext();
      }).catch(function () {
        self._catchData = Array.prototype.slice.apply(arguments);
        self._applyCatch();
      });
    } else {
      this._setRejected();
      this._next = [];
      this._data = undefined;
    }
    return SynchronousPromise.reject();
  },
};
SynchronousPromise.resolve = function () {
  var args = arguments;
  return new SynchronousPromise(function (resolve) {
    resolve.apply(null, argumentsToArray(args));
  });
};
SynchronousPromise.reject = function () {
  var args = arguments;
  return new SynchronousPromise(function (resolve, reject) {
    reject.apply(null, argumentsToArray(args));
  });
};
SynchronousPromise.all = function () {
  var args = argumentsToArray(arguments);
  if (Array.isArray(args[0])) {
    args = args[0];
  }
  return new SynchronousPromise(function (resolve, reject) {
    var
      allData = [],
      numResolved = 0,
      doResolve = function () {
        if (numResolved === args.length) {
          resolve(allData);
        }
      },
      rejected = false,
      doReject = function (err) {
        if (rejected) {
          return;
        }
        rejected = true;
        reject(err);
      };
    args.forEach(function (arg, idx) {
      arg.then(function (thisResult) {
        allData[idx] = thisResult;
        numResolved += 1;
        doResolve();
      }).catch(function (err) {
        doReject(err);
      });
    });
  });
};
SynchronousPromise.unresolved = function () {
  var stash = {};
  var result = new SynchronousPromise(function (resolve, reject) {
    stash.resolve = resolve;
    stash.reject = reject;
  });
  result.resolve = stash.resolve;
  result.reject = stash.reject;
  return result;
};

module.exports = {
  SynchronousPromise: SynchronousPromise
};
