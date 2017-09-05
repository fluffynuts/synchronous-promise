"use strict";
function argumentsToArray(args) {
  return Array.prototype.slice.apply(args);
}

function looksLikePromise(thing) {
  return thing &&
    thing.then &&
    typeof (thing.then) === "function" &&
    typeof (thing.catch) === "function";
}

function SynchronousPromise(ctorFunction) {
  this.status = "pending";
  this._paused = false;
  this._next = [];
  this._data = [];
  this._runConstructorFunction(ctorFunction);
}

SynchronousPromise.prototype = {
  then: function (next, fail) {
    this._next.push([next, fail]);

    // Pending is when the Promise is constructed with the constructor function
    // and the resolve nor reject handler have been executed
    if (this.status === "pending") {
      return this;
    }

    if (this.status === "resolved") {
      return this._applyNext();
    }

    return this._applyCatch();
  },
  catch: function (fn) {
    this._next.push([undefined, fn]);

    // Pending is when the Promise is constructed with the constructor function
    // and the resolve nor reject handler have been executed
    if (this.status === "pending") {
      return this;
    }

    return this._applyCatch();
  },
  pause: function () {
    this._paused = true;
    return this;
  },
  resume: function () {
    this._paused = false;
    return this._applyNext();
  },
  _runConstructorFunction: function (ctorFunction) {
    var self = this;

    this._next.push([
      function (r) { return r; },
      function (err) { throw err; }
    ]);

    var isRun = false;
    ctorFunction(function (result) {
      if (isRun) {
        return;
      }

      isRun = true;
      self._setResolved();
      self._data = [result];
      self._applyNext();
    }, function (err) {
      if (isRun) {
        return;
      }

      isRun = true;
      self._setRejected();
      self._data = [err];
      self._applyCatch();
    });
  },
  _setRejected: function () {
    this.status = "rejected";
  },
  _setResolved: function () {
    this.status = "resolved";
  },
  _setPending: function () {
    this.status = "pending";
  },
  _applyNext: function () {
    if (this.status === "rejected") {
      return this._applyCatch();
    }

    if (this._next.length === 0 || this._paused) {
      return this;
    }

    var next;
    // Look for the first onResolvedHandler function
    while (!next && this._next.length > 0) {
      next = this._next.shift()[0];
    }

    if (!next) {
      return this;
    }

    try {
      var data = next.apply(null, this._data);

      this._setResolved();
      if (looksLikePromise(data)) {
        this._handleNestedPromise(data);
        return this;
      }

      this._data = [data];
      return this._applyNext();
    } catch (e) {
      this._setRejected();
      this._data = [e];
      return this._applyCatch();
    }
  },
  _applyCatch: function () {
    if (this.status === "resolved") {
      return this._applyNext();
    }

    if (this._next.length === 0 || this._paused) {
      return this;
    }

    var next;
    // Look for the first onRejectedHandler function
    while (!next && this._next.length > 0) {
      next = this._next.shift()[1];
    }

    if (!next) {
      return this;
    }

    try {
      var data = next.apply(null, this._data);

      if (looksLikePromise(data)) {
        this._handleNestedPromise(data);
        return this;
      }

      this._setResolved();
      this._data = [data];
      return this._applyNext();
    } catch (e) {
      this._setRejected();
      this._data = [e];
      return this._applyCatch();
    }
  },
  // Handle a promise which has been returned by one of the handler of this
  // promise (onResolve or onReject handler)
  _handleNestedPromise: function (promise) {
    // Set this promise to pending until the nested one (provided by argument)
    // ends.
    this._setPending();
    var self = this;
    promise.then(function (d) {
      self._setResolved();
      self._data = [d];
      self._applyNext();
    }).catch(function (e) {
      self._setRejected();
      self._data = [e];
      self._applyCatch();
    });
  }
};
SynchronousPromise.resolve = function (data) {
  if (looksLikePromise(data)) {
    return data;
  }

  return new SynchronousPromise(function (resolve) {
    resolve(data);
  });
};
SynchronousPromise.reject = function (error) {
  if (looksLikePromise(error)) {
    return error;
  }

  return new SynchronousPromise(function (resolve, reject) {
    reject(error);
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

