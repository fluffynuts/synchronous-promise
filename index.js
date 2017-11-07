(function (win) {
  "use strict";
  function makeArrayFrom(obj) {
    return Array.prototype.slice.apply(obj);
  }
  function log() {
    console.log((new Date()).getTime(), makeArrayFrom(arguments));
  }

  function SynchronousPromise(handler) {
    this._state = "pending";
    this._continuations = [];
    this._parent = null;
    if (handler) {
      handler.call(
        this,
        this._continueWith.bind(this),
        this._failWith.bind(this)
      );
    }
  }

  function looksLikeAPromise(obj) {
    return obj && typeof (obj.then) === "function";
  }

  SynchronousPromise.prototype = {
    then: function (nextFn, catchFn) {
      if (this._isRejected()) {
        if (this._paused) {
          var next = SynchronousPromise.unresolved()._setParent(this);
          this._continuations.push({
            promise: next,
            nextFn: nextFn,
            catchFn: catchFn
          });
          return next;
        }
        if (catchFn) {
          try {
            var catchResult = catchFn(this._error);
            if (looksLikeAPromise(catchResult)) {
              var next = SynchronousPromise.unresolved()._setParent(this);
              catchResult.then(function (newData) {
                next.resolve(newData);
              }).catch(function (newError) {
                next.reject(newError);
              });
              return next;
            } else {
              return SynchronousPromise.resolve(catchResult)._setParent(this);
            }
          } catch (e) {
            return SynchronousPromise.reject(e)._setParent(this);
          }
        }
        return SynchronousPromise.reject(this._error)._setParent(this);
      }
      var next = SynchronousPromise.unresolved()._setParent(this);
      this._continuations.push({
        promise: next,
        nextFn: nextFn,
        catchFn: catchFn
      });
      this._runResolutions();
      return next;
    },
    catch: function (handler) {
      if (this._isResolved()) {
        return SynchronousPromise.resolve(this._data)._setParent(this);
      }
      var next = SynchronousPromise.unresolved()._setParent(this);
      this._continuations.push({
        promise: next,
        catchFn: handler
      });
      this._runRejections();
      return next;
    },
    pause: function () {
      this._paused = true;
      return this;
    },
    resume: function () {
      var firstPaused = this._findFirstPaused();
      if (firstPaused) {
        firstPaused._paused = false;
        firstPaused._runResolutions();
        firstPaused._runRejections();
      }
      return this;
    },
    _findFirstPaused() {
      var test = this;
      var result = null;
      while (test) {
        if (test._paused) {
          result = test;
        }
        test = test._parent;
      }
      return result;
    },
    _setParent(parent) {
      if (this._parent) {
        throw new Error("parent already set");
      }
      this._parent = parent;
      return this;
    },
    _continueWith: function (data) {
      var firstPending = this._findFirstPending();
      if (firstPending) {
        firstPending._data = data;
        firstPending._setResolved();
      }
    },
    _findFirstPending: function () {
      var test = this;
      var result;
      while (test) {
        if (test._isPending()) {
          result = test;
        }
        test = test._parent;
      }
      return result;
    },
    _failWith: function (error) {
      var firstRejected = this._findFirstPending();
      if (firstRejected) {
        firstRejected._error = error;
        firstRejected._setRejected();
      }
    },
    _takeContinuations: function () {
      return this._continuations.splice(0, this._continuations.length);
    },
    _runRejections: function () {
      if (this._paused || !this._isRejected()) {
        return;
      }
      var error = this._error;
      var continuations = this._takeContinuations();
      continuations.forEach(cont => {
        if (cont.catchFn) {
          var catchResult = cont.catchFn(error);
          if (looksLikeAPromise(catchResult)) {
            catchResult.then(function (newData) {
              cont.promise.resolve(newData);
            }).catch(function (newError) {
              cont.promise.reject(newError);
            });
          } else {
            cont.promise.resolve(catchResult);
          }
        } else {
          cont.promise.reject(error);
        }
      });
    },
    _runResolutions: function () {
      if (this._paused || !this._isResolved()) {
        return;
      }
      var continuations = this._takeContinuations();
      var data = this._data;
      if (looksLikeAPromise(data)) {
        var self = this;
        return data.then(function (result) {
          self._data = result;
          self._runResolutions();
        }).catch(function (error) {
          self._error = error;
          self._setRejected();
          self._runRejections();
        });
      }
      continuations.forEach(cont => {
        if (cont.nextFn) {
          try {
            var result = cont.nextFn(data);
            if (looksLikeAPromise(result)) {
              result.then(function (pdata) {
                cont.promise.resolve(pdata);
              }).catch(function (error) {
                cont.promise.reject(error);
              });
            } else {
              cont.promise.resolve(result);
            }
          } catch (e) {
            this._setRejected();
            if (cont.catchFn) {
              try {
                cont.catchFn(e);
                return;
              } catch (e2) {
                e = e2;
              }
            }
            if (cont.promise) {
              cont.promise.reject(e);
            }
          }
        } else if (cont.promise) {
          cont.promise.resolve(data);
        }
      });
    },
    _setResolved: function () {
      this._state = "resolved";
      if (!this._paused) {
        this._runResolutions();
      }
    },
    _setRejected: function () {
      this._state = "rejected";
      if (!this._paused) {
        this._runRejections();
      }
    },
    _isPending: function () {
      return this._state === "pending";
    },
    _isResolved: function () {
      return this._state === "resolved";
    },
    _isRejected: function () {
      return this._state === "rejected";
    }
  };

  SynchronousPromise.resolve = function (result) {
    return new SynchronousPromise(function (resolve, reject) {
      if (looksLikeAPromise(result)) {
        result.then(function (newResult) {
          resolve(newResult);
        }).catch(function (error) {
          reject(error);
        });
      } else {
        resolve(result);
      }
    });
  };

  SynchronousPromise.reject = function (result) {
    return new SynchronousPromise(function (resolve, reject) {
      reject(result);
    });
  }

  SynchronousPromise.unresolved = function () {
    return new SynchronousPromise(function (resolve, reject) {
      this.resolve = resolve;
      this.reject = reject;
    });
  };

  SynchronousPromise.all = function () {
    var args = makeArrayFrom(arguments);
    if (Array.isArray(args[0])) {
      args = args[0];
    }
    if (!args.length) {
      return SynchronousPromise.resolve([]);
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
        SynchronousPromise.resolve(arg).then(function (thisResult) {
          allData[idx] = thisResult;
          numResolved += 1;
          doResolve();
        }).catch(function (err) {
          doReject(err);
        });
      });
    });
  };

  if (win) {
    window.SynchronousPromise = SynchronousPromise;
  } else {
    module.exports = {
      SynchronousPromise: SynchronousPromise
    };
  }
})(typeof (window) === "undefined" ? undefined : window);