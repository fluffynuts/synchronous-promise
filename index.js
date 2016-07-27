function SynchronousPromise(ctorFunction) {
  this.status = 'pending'
  var self = this;
  ctorFunction(function(data) {
    self._data = data;
    self.status = 'resolved'
  })
}
SynchronousPromise.prototype = {
  then: function(next) {
    this._next = next;
    if (this.status === 'resolved') {
      this._applyNext();
    }
    return this;
  },
  _applyNext: function() {
    if (!this._next) {
      return;
    }
    try {
      next();
    } catch (e) {
      this._error = e;
      this._applyCatch();
    }
  },
  catch: function(fn) {
    this._catchFunction = fn;
    this._applyCatch();
  },
  _applyCatch: function() {
    if (this._catchFunction && this._error) {
      this._catchFunction.call(null, this._error);
    }
  },
  resolveWith: function() {
  },
  rejectWith: function() {
  }
}
module.exports = {
  SynchronousPromise: SynchronousPromise
}
