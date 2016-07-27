const
  expect = require('chai').expect,
  SynchronousPromise = require('./index').SynchronousPromise;

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
  it('will have a resolveWith function', function() {
    expect(SynchronousPromise.prototype.resolveWith).to.be.a('function')
  })
  it('will have a rejectWith function', function() {
    expect(SynchronousPromise.prototype.rejectWith).to.be.a('function')
  })
  function createResolved() {
    return new SynchronousPromise(function(resolve, reject) {
      resolve()
    })
  }
  describe('then', function() {
    it('will return the same promise', function() {
      var sut = createResolved();
      expect(sut.then(function() {})).to.equal(sut);
    })
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
      })

      expect(received).to.eql(new Error(expected));
    })
    it('will resolve promise results', function() {
    })
  })
})