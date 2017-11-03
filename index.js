(function (win) {
  function log() {
    console.log((new Date()).getTime(), Array.from(arguments));
  }
  function SynchronousPromise(handler) {
    this._thens = [];
    this._state = "pending";
    this._pending = [];
    if (handler) {
      handler.call(
        this,
        this._continueWith.bind(this),
        this._failWith.bind(this)
      );
    }
  };

  function looksLikeAPromise(obj) {
    return obj && typeof (obj["then"]) === "function";
  }

  SynchronousPromise.prototype = {
    then: function (nextFn, catchFn) {
      if (this._isPending()) {

      }
      var data = this._data;
      var storedError = this._error;
      this._catchFn = catchFn;
      var self = this;
      var next = new SynchronousPromise(function (resolve, reject) {
        this._parent = self;
        if (storedError) {
          if (catchFn) {
            return catchFn.call(self, storedError);
          } else {
            this._catchError = storedError;
            return reject(storedError);
          }
        }
        try {
          if (looksLikeAPromise(data)) {
            data.then(function (newData) {
              data = nextFn(newData);
              resolve(data);
            }).catch(function (e) {
              reject(e);
            });
          } else {
            var nextResult = nextFn(data);
            resolve(nextResult);
          }
        } catch (e) {
          if (catchFn) {
            catchFn.call(self, e);
          } else {
            this._catchError = e;
            reject(e);
          }
        }
      });
      this._thens.push(next);
      return next;
    },
    catch: function (handler) {
      if (looksLikeAPromise(this._data)) {
        return this._data.catch(handler);
      }
      var error = this._error;
      var self = this;
      var catchFn = this._catchFn;
      return new SynchronousPromise(function (resolve, reject) {
        if (self._parent && self._parent._catchFn) {
          return; // FIXME
        }
        try {
          resolve(handler(error));
        } catch (e) {
          reject(e);
        }
      });
    },
    _continueWith: function (data) {
      this._data = data;
      this._setResolved();
    },
    _setResolved: function() {
      this._state = "resolved";
      this._runResolutions;
    },
    _failWith: function (error) {
      this._error = error;
      this._setRejected();
    },
    _setRejected: function() {
      this._state = "rejected";
      this._runRejections();
    },
    _runRejections: function() {
      var error = this._error;
      this._thens.forEach(function (t) {
        t._failWith(error);
      });
    },
    _isPending: function() {
      return this._status === "pending";
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

  if (win) {
    window.SynchronousPromise = SynchronousPromise;
  } else {
    module.exports = {
      SynchronousPromise: SynchronousPromise
    };
  }
})(typeof (window) === "undefined" ? undefined : window);