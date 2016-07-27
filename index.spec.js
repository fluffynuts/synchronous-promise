const
  expect = require('chai').expect,
  SynchronousPromise = require('./index').SynchronousPromise;
console.log('-- test run at: ', new Date());
describe('synchronous-promise', function() {
  it('will be constructable', function() {
    expect(SynchronousPromise).to.exist
    expect(new SynchronousPromise(function() {})).to.exist
  })
  it('will have a then function', function() {
    expect(SynchronousPromise.prototype.then).to.be.a('function')
  })
  it('will have a catch function', function() {
    expect(SynchronousPromise.prototype.catch).to.be.a('function')
  })
  function create(ctor) {
    return new SynchronousPromise(ctor);
  }
  function createResolved(data) {
    return create(function(resolve, reject) {
      resolve(data)
    })
  }
  function createRejected(data) {
    return create(function(resolve, reject) {
      reject(data);
    });
  }
  describe('then', function() {
    it('will return the same promise', function() {
      var sut = createResolved();
      expect(sut.then(function() {})).to.equal(sut);
    });
    it('will call into the catch function when the function given to then throws', function() {
      var
        sut = createResolved(),
        expected = 'the error',
        received = null;
      sut.then(function() {
        throw new Error(expected);
      }).then(function() {
        return 42;  // not a thrower
      }).catch(function(err) {
        received = err;
      });

      expect(received).to.eql(new Error(expected));
    });
    it('will bring the first resolve value into the first then', function() {
      var
        initial = '123'; 
        captured = null;
      createResolved(initial).then(function(data) {
        captured = data;
      });
      expect(captured).to.equal(initial);
    });
    it('will resolve when the first resolution is a resolved promise', function() {
      var
        initial = createResolved('123'),
        captured = null;
      createResolved(initial).then(function(data) {
        captured = data;
      });
      expect(captured).to.equal('123');
    })
    it('will catch when the first resolution is a rejected promise', function() {
      var
        initial = createRejected('123'),
        captured = null;
      createResolved(initial).catch(function(data) {
        captured = data;
      });
      expect(captured).to.equal('123');
    })
    it('will run a simple chain', function() {
      var
        initial = '123',
        second = 'abc',
        captured = null;
      createResolved(initial).then(function(data) {
        return createResolved(second);
      }).then(function(data) {
        captured = data;
      });
      expect(captured).to.equal(second);
    });
    it('will run a longer chain', function() {
      var
        initial = '123',
        second = 'abc',
        third = '---',
        expected = second + third,
        captured = null;
      createResolved(initial).then(function(data) {
        return createResolved(second);
      }).then(function(data) {
        return second;
      }).then(function(data) {
        captured = data + third;
      });
      expect(captured).to.equal(expected);
    });
    it('will run a longer chain v2', function() {
      var
        initial = '123',
        second = 'abc',
        third = '---',
        expected = second + third,
        captured = null;
      createResolved(initial).then(function(data) {
        return createResolved(second);
      }).then(function(data) {
        return createResolved(second);
      }).then(function(data) {
        captured = data + third;
      });
      expect(captured).to.equal(expected);
    });
    it('will run a longer chain v3', function() {
      var
        initial = '123',
        second = 'abc',
        third = '---',
        expected = second + third,
        captured = null;
      createResolved(initial).then(function(data) {
        return second;
      }).then(function(data) {
        return createResolved(second);
      }).then(function(data) {
        captured = data + third;
      });
      expect(captured).to.equal(expected);
    });
    it('will resolve when the ctor function resolves', function() {
      var
        providedResolve = null,
        captured = null,
        expected = 'xyz',
        promise = create(function(resolve, reject) {
          providedResolve = resolve;
        }).then(function(data) {
          captured = data;
        });

        expect(captured).to.be.null;
        expect(providedResolve).to.be.a('function');
        providedResolve(expected)
        expect(captured).to.equal(expected);
    });
  });
  describe('catch', function() {
    it('will be called if the initial reject is called', function() {
      var
        expected = '123',
        captured = null;
      createRejected(expected).catch(function(e) {
        captured = e;
      })
      expect(captured).to.equal(expected);
    });
    it('will be called on a delayed rejection', function() {
      var
        providedReject = null,
        captured = null,
        expected = '123',
        promise = create(function(resolve, reject) {
          providedReject = reject;
        }).catch(function(e) {
          captured = e;
        });
        
        expect(captured).to.be.null;
        expect(providedReject).to.be.a('function');
        providedReject(expected);
        expect(captured).to.equal(expected);
    });
    it('will return the same promise', function() {
      var
        promise = createRejected('123'),
        result = promise.catch(function(data) {
          expect(data).to.equal('123');
        });

        expect(result).to.exist;
        expect(result instanceof SynchronousPromise).to.be.true
        expect(result).to.equal(promise);
    });
    it('will not interfere with a later then if there is no error', function() {
      var
        captured = null,
        expected = '123',
        capturedError = null;
      createResolved(expected).catch(function(e) {
        capturedError = e;
      }).then(function(data) {
        console.log('then called');
        captured = data;
      })

      expect(capturedError).to.be.null;
      expect(captured).to.equal(expected);
    })
    it('will prevent then handlers after the error from being called', function() {
      var
        captured = null;
      createResolved('123').catch(function(e) {
      }).then(function(data) {
        throw 'foo';
      }).then(function(data) {
        captured = 'abc';
      })

      expect(captured).to.be.null;
    })
  });
})