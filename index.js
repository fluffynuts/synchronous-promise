(function (win) {
  "use strict";
  function log() {
    console.log((new Date()).getTime(), Array.from(arguments));
  }

  function SynchronousPromise(handler) {
    this._state = "pending";
    this._continuations = [];
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
        if (catchFn) {
          try {
            var catchResult = catchFn(this._error);
            if (looksLikeAPromise(catchResult)) {
              var next = SynchronousPromise.unresolved();
              catchResult.then(function(newData) {
                next.resolve(newData);
              }).catch(function(newError) {
                next.reject(newError);
              });
              return next;
            } else {
              return SynchronousPromise.resolve(catchResult);
            }
          } catch (e) {
            return SynchronousPromise.reject(e);
          }
        }
        return SynchronousPromise.reject(this._error);
      }
      var next = SynchronousPromise.unresolved();
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
        return SynchronousPromise.resolve(this._data);
      }
      var next = SynchronousPromise.unresolved();
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
      this._paused = false;
      this._runResolutions();
      this._runRejections();
      return this;
    },
    _continueWith: function (data) {
      this._data = data;
      this._setResolved();
    },
    _failWith: function (error) {
      this._error = error;
      this._setRejected();
    },
    _takeContinuations: function () {
      return this._continuations.splice(0, this._continuations.length);
    },
    _runRejections: function () {
      if (!this._isRejected()) {
        return;
      }
      var error = this._error;
      var continuations = this._takeContinuations();
      continuations.forEach(cont => {
        if (cont.catchFn) {
          var catchResult = cont.catchFn(error);
          if (looksLikeAPromise(catchResult)) {
            catchResult.then(function(newData) {
              cont.promise.resolve(newData);
            }).catch(function(newError) {
              cont.promise.reject(newError);
            });
          } else {
            cont.promise.resolve(catchResult);
          }
        } else {
          console.log("passing rejection down");
          cont.promise.reject(error);
        }
      });
    },
    _runResolutions: function () {
      if (!this._isResolved()) {
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
      resolve(result);
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

  if (win) {
    window.SynchronousPromise = SynchronousPromise;
  } else {
    module.exports = {
      SynchronousPromise: SynchronousPromise
    };
  }
})(typeof (window) === "undefined" ? undefined : window);