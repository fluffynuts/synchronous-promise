'use strict';
function argumentsToArray(args) {
  return Array.prototype.slice.apply(args);
}

function SynchronousPromise(ctorFunction) {
  this.status = 'pending';
  this._next = [];
  this._paused = false;
  this._runConstructorFunction(ctorFunction);
}
SynchronousPromise.prototype = {
  then: function (next, fail) {
    this._next.push([next, fail]);
    if (this.status === 'resolved') {
      this._applyNext();
    }
    return this;
  },
  catch: function (fn) {
    this._catchFunction = fn;
    this._applyCatch();
    return this;
  },
  pause: function () {
    this._paused = true;
    return this;
  },
  resume: function () {
    this._paused = false;
    this._applyCatch();
    this._applyNext();
    return this;
  },
  _runConstructorFunction: function (ctorFunction) {
    var self = this;
    var doCatch = function (args) {
      self._catchData = argumentsToArray(args);
      self._applyCatch();
    };
    ctorFunction(function () {
      self._data = argumentsToArray(arguments);
      var doResolve = function () {
        self.status = 'resolved';
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
    this.status = 'rejected';
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
      var data = next[0].apply(null, this._data);
      var self = this;
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
        this._applyCatch();
      }
    }
  },
  _looksLikePromise: function (thing) {
    return thing &&
            thing.then &&
            typeof (thing.then) === 'function';
  },
  _applyCatch: function () {
    if (this._paused) {
      return;
    }
    var
      catchFunction = this._catchFunction,
      catchData = this._catchData;
    if (!(catchFunction && catchData)) {
      return; // nyom
    }
    this._setRejected();
    this._next = [];
    this._data = undefined;
    catchFunction.apply(null, catchData);
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
  //var args = argumentsToArray(arguments);
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
module.exports = {
  SynchronousPromise: SynchronousPromise
};
