(function(win) {
  function SynchronousPromise(handler) {
    if (handler) {
      handler.call(
        this,
        this._continueWith.bind(this),
        this._failWith.bind(this)
      );
    }
  };

  SynchronousPromise.prototype = {
    then: function(nextFn) {
    },
    catch: function(handler) {
    }
  };

  SynchronousPromise.resolve = function(result) {
    return new SynchronousPromise();
  };

  SynchronousPromise.reject = function(result) {
    return new SynchronousPromise();
  }

  if (win) {
    window.SynchronousPromise = SynchronousPromise;
  } else {
    module.exports = {
      SynchronousPromise: SynchronousPromise
    };
  }
})(typeof(window) === "undefined" ? undefined : window);