/* 
* linting omitted on spec mainly because jslint doesn't seem to allow the
* mocha expression-like syntax
*/
'use strict';
var
  expect = require('chai').expect,
  sut = require('./index'),
  SynchronousPromise = sut.SynchronousPromise,
  _argumentsToArray = sut._argumentsToArray;
describe('synchronous-promise', function () {
  it('should be constructable', function () {
    expect(SynchronousPromise).to.exist;
    expect(new SynchronousPromise(function () {})).to.exist;
  });
  it('should have a then function', function () {
    expect(SynchronousPromise.prototype.then).to.be.a('function');
  });
  it('should have a catch function', function () {
    expect(SynchronousPromise.prototype.catch).to.be.a('function');
  });
  function create(ctor) {
    return new SynchronousPromise(ctor);
  }
  function createResolved(data) {
    return SynchronousPromise.resolve(data);
  }
  function createRejected(data) {
    return SynchronousPromise.reject(data);
  }
  describe('then', function () {
    it('should return the same promise', function () {
      var sut = createResolved();
      expect(sut.then(function () {})).to.equal(sut);
    });
    it('should return the same promise v2', function () {
      var
        result = createResolved().then(function() {
          /* purposely don't return anything */
        });
      expect(result).to.be.instanceOf(SynchronousPromise);
    });
    it('should call into the catch function when the function given to then throws', function () {
      var
        sut = createResolved(),
        expected = 'the error',
        received = null;
      sut.then(function () {
        throw new Error(expected);
      }).then(function () {
        return 42;  // not a thrower
      }).catch(function (err) {
        received = err;
      });

      expect(received).to.eql(new Error(expected));
    });
    it('should call into the failure function when the predecessor fails', function() {
      var
        sut = createResolved(),
        expected = 'the error',
        captured = null,
        catchCaptured = null;
      sut.then(function() {
        throw expected;
      }, function(e) {
        captured = e;
      }).catch(function(e) {
        catchCaptured = e;
      });

      expect(captured).to.equal(expected);
      expect(catchCaptured).to.be.null;
    });
    it('should bring the first resolve value into the first then', function () {
      var
        initial = '123',
        captured = null;
      createResolved(initial).then(function (data) {
        captured = data;
      });
      expect(captured).to.equal(initial);
    });
    it('should resolve when the first resolution is a resolved promise', function () {
      var
        initial = createResolved('123'),
        captured = null;
      createResolved(initial).then(function (data) {
        captured = data;
      });
      expect(captured).to.equal('123');
    })
    it('should catch when the first resolution is a rejected promise', function () {
      var
        initial = createRejected('123'),
        captured = null;
      createResolved(initial).catch(function (data) {
        captured = data;
      });
      expect(captured).to.equal('123');
    })
    it('should catch when a subsequent resolution returns a rejected promise', function() {
      var
        initial = createResolved('123'),
        captured = null,
        expected = 'le error';
      initial.then(function() {
        return createRejected(expected);
      }).catch(function(e) {
        captured = e;
      })

      expect(captured).to.equal(expected);
    });
    it('should run a simple chain', function () {
      var
        initial = '123',
        second = 'abc',
        captured = null;
      createResolved(initial).then(function (data) {
        return createResolved(second);
      }).then(function (data) {
        captured = data;
      });
      expect(captured).to.equal(second);
    });
    it('should run a longer chain', function () {
      var
        initial = '123',
        second = 'abc',
        third = '---',
        expected = second + third,
        captured = null;
      createResolved(initial).then(function (data) {
        return createResolved(second);
      }).then(function (data) {
        return second;
      }).then(function (data) {
        captured = data + third;
      });
      expect(captured).to.equal(expected);
    });
    it('should run a longer chain v2', function () {
      var
        initial = '123',
        second = 'abc',
        third = '---',
        expected = second + third,
        captured = null;
      createResolved(initial).then(function (data) {
        return createResolved(second);
      }).then(function (data) {
        return createResolved(second);
      }).then(function (data) {
        captured = data + third;
      });
      expect(captured).to.equal(expected);
    });
    it('should run a longer chain v3', function () {
      var
        initial = '123',
        second = 'abc',
        third = '---',
        expected = second + third,
        captured = null;
      createResolved(initial).then(function (data) {
        return second;
      }).then(function (data) {
        return createResolved(second);
      }).then(function (data) {
        captured = data + third;
      });
      expect(captured).to.equal(expected);
    });
    it('should resolve when the ctor function resolves', function () {
      var
        providedResolve = null,
        captured = null,
        expected = 'xyz',
        promise = create(function (resolve, reject) {
          providedResolve = resolve;
        }).then(function (data) {
          captured = data;
        });

        expect(captured).to.be.null;
        expect(providedResolve).to.be.a('function');
        providedResolve(expected)
        expect(captured).to.equal(expected);
    });
  });
  describe('catch', function () {
    it('should be called if the initial reject is called', function () {
      var
        expected = '123',
        captured = null;
      createRejected(expected).catch(function (e) {
        captured = e;
      })
      expect(captured).to.equal(expected);
    });
    it('should be called on a delayed rejection', function () {
      var
        providedReject = null,
        captured = null,
        expected = '123',
        promise = create(function (resolve, reject) {
          providedReject = reject;
        }).catch(function (e) {
          captured = e;
        });
        
        expect(captured).to.be.null;
        expect(providedReject).to.be.a('function');
        providedReject(expected);
        expect(captured).to.equal(expected);
    });
    it('should return the same promise', function () {
      var
        promise = createRejected('123'),
        result = promise.catch(function (data) {
          expect(data).to.equal('123');
        });

        expect(result).to.exist;
        expect(result).to.be.instanceOf(SynchronousPromise);
        expect(result).to.equal(promise);
    });
    it('should not interfere with a later then if there is no error', function () {
      var
        captured = null,
        expected = '123',
        capturedError = null;
      createResolved(expected).catch(function (e) {
        capturedError = e;
      }).then(function (data) {
        captured = data;
      })

      expect(capturedError).to.be.null;
      expect(captured).to.equal(expected);
    })
    it('should prevent then handlers after the error from being called', function () {
      var
        captured = null;
      createResolved('123').catch(function (e) {
      }).then(function (data) {
        throw 'foo';
      }).then(function (data) {
        captured = 'abc';
      })

      expect(captured).to.be.null;
    })
  });
  describe('pause', function () {
    it('should exist as a function on the prototype', function () {
      expect(SynchronousPromise.prototype.pause).to.be.a('function');
    });
    it('should return the promise', function () {
      const
        promise = createResolved('123'), 
        result = promise.pause();
      expect(result).to.equal(promise);
    });
    it('should prevent resolution from continuing at that point', function () {
      var calls = 0;
      createResolved('123').then(function () {
        return calls++;
      }).pause().then(function () {
        return calls++;
      });
      expect(calls).to.equal(1);
    });
    it('should prevent rejection from being caught at that point', function () {
      var calls = 0;
      createRejected('123').pause().catch(function (e) {
        calls++;
      })
      expect(calls).to.equal(0);
    });
    it('should prevent rejection from continuing past at that point', function () {
      var
        calls = 0,
        captured = null;

      createRejected('123').then(function () {
        // should not be called
        calls++;
      }).catch(function (e) {
        captured = e;
      }).pause().then(function () {
        calls++;
      });

      expect(captured).to.equal('123');
      expect(calls).to.equal(0);
    })
  });
  describe('resume', function () {
    it('should exist as a function on the prototype', function () {
      expect(SynchronousPromise.prototype.resume).to.be.a('function');
    });
    it('should return the promise', function () {
      var
        promise = createResolved('123').pause(),
        result = promise.resume();
      expect(result).to.equal(promise);
    });
    it('should not barf if the promise is not already paused', function () {
      var promise = createResolved('123');
      expect(function () {
        promise.resume();
      }).not.to.throw;
    })
    it('should resume resolution operations after the last pause', function () {
      var
        calls = 0,
        promise = createResolved('123').then(function () {
          return calls++;
        }).pause().then(function () {
          return calls++;
        });
      expect(calls).to.equal(1);
      promise.resume();
      expect(calls).to.equal(2);
    });
    it('should resume rejection operations after the last pause', function () {
      var
        calls = 0,
        captured = null,
        expected = 'die, scum!',
        promise = createResolved('123').then(function () {
          throw expected;
        }).pause().then(function () {
          return calls++;
        }).catch(function (e) {
          captured = e;
        });
      expect(calls).to.equal(0);
      expect(captured).to.be.null;
      promise.resume();
      expect(calls).to.equal(0);
      expect(captured).to.equal(expected);
    });
    it('should resume a promise which was started rejected as rejected', function() {
      var
        calls = 0,
        captured = null,
        expected = 'it\'s the end of the world!',
        promise = SynchronousPromise.reject(expected).pause().then(function() {
          calls++;
        }).catch(function(e) {
          captured = e;
        });
      expect(calls).to.equal(0);
      expect(captured).to.be.null;
      promise.resume();
      expect(calls).to.equal(0);
      expect(captured).to.equal(expected);
    })
  })
  describe('static resolve', function () {
    it('should be a function', function () {
      expect(SynchronousPromise.resolve).to.be.a('function');
    });
    it('should return a resolved promise', function () {
      var 
        expected = 'foo',
        result = SynchronousPromise.resolve(expected);
      expect(result.status).to.equal('resolved');
      var captured = null;
      result.then(function (data) {
        captured = data;
      });
      expect(captured).to.equal(expected);
    })
  });
  describe('static reject', function () {
    it('should be a function', function () {
      expect(SynchronousPromise.reject).to.be.a('function');
    });
    it('should return a rejected promise', function () {
      var
        expected = 'moo',
        result = SynchronousPromise.reject(expected);
      expect(result.status).to.equal('rejected');
      var captured = null;
      result.catch(function (err) {
        captured = err;
      });
      expect(captured).to.equal(expected);
    });
  });
  describe('static all', function () {
    it('should be a function', function () {
      expect(SynchronousPromise.all).to.be.a('function')
    })
    it('should resolve with all values from given resolved promises as variable args', function () {
      var
        p1 = createResolved('abc'),
        p2 = createResolved('123'),
        all = SynchronousPromise.all(p1, p2),
        captured = null;

      all.then(function (data) {
        captured = data;
      });

      expect(captured).to.have.length(2);
      expect(captured).to.contain('abc');
      expect(captured).to.contain('123');
    });
    it('should resolve with all values from given resolved promises as an array', function () {
      var
        p1 = createResolved('abc'),
        p2 = createResolved('123'),
        all = SynchronousPromise.all([p1, p2]),
        captured = null;

      all.then(function (data) {
        captured = data;
      });

      expect(captured).to.have.length(2);
      expect(captured).to.contain('abc');
      expect(captured).to.contain('123');
    });
    it('should resolve with values in the correct order', function() {
      var
        resolve1,
        resolve2,
        captured;

      var p1 = create(function(resolve) {
        resolve1 = resolve;
      });

      var p2 = create(function(resolve) {
        resolve2 = resolve;
      });

      SynchronousPromise.all([p1, p2]).then(function(data) {
        captured = data;
      });

      resolve2('a');
      resolve1('b');

      expect(captured).to.deep.equal(['b', 'a']);
    });
    it('should reject if any promise rejects', function () {
      var
        p1 = createResolved('abc'),
        p2 = createRejected('123'),
        all = SynchronousPromise.all(p1, p2),
        capturedData = null,
        capturedError = null;
      all.then(function (data) {
        capturedData = data;
      }).catch(function (err) {
        capturedError = err;
      });
      expect(capturedData).to.be.null;
      expect(capturedError).to.equal('123');
    });
  })
})