# synchronous-promise
TL;DR: A prototypical animal which looks like an A+ Promise but doesn't defer
immediately, so can run synchronously, for testing.

### Why?
The standard ES6 Promise (and many others) push the promise logic to the background
immediately, departing from the mechanisms employed in years past by promise
implementations in libraries such as jQuery and Q.

This is a good thing -- for production code. But it can make testing more
convoluted than it really needs to be.

Often, in a test, we're stubbing out a function which would return a promise
(eg http call, show a modal dialog requiring user interaction) with a promise
that resolves immediately, eg (using, mocha/sinon/chai):

```javascript
describe('the thing', () => {
  it('will do some stuff', () => {
    // Arrange
    const asyncLibraryFake = {
      someMethod: sinon.stub().returns(Promise.resolve('happy value!'))
    },
    sut = createSystemUnderTestWith(asyncLibraryFake);
    // Act
    sut.doSomethingInteresting();
    // Assert
    //  [*]
  })
});
```

[*] Ideally, we'd just have assertions here, but the code above has backgrounded,
so we're not going to get our expected results unless we employ async testing
strategies ourselves.

One strategy would be to return the promise from
  asyncLibraryFake.someMethod
from the
  doSomethingInteresting
function and perform our asserts in there: 
  
```javascript
describe('the thing', () => {
  it('will do some stuff', done => {
    // Arrange
    const asyncLibraryFake = {
      someMethod: sinon.stub().returns(Promise.resolve('happy value!'))
    },
    sut = createSystemUnderTestWith(asyncLibraryFake);
    // Act
    sut.doSomethingInteresting().then(() => {
      // Assert
      done()
    });
  })
});
```
***And there's nothing wrong with this strategy.***

I need to put that out there before anyone takes offense or thinks that I'm suggesting 
that they're "doing it wrong".
If you're doing this (or something very similar), great; `async/await`, if available, 
can make this code quite clean and linear too.

However, when we're working on more complex interactions, eg when we're not
testing the final result of a promise chain, but rather testing a side-effect
at some step during that promise chain, this can become more effort to test
(and, imo, make your testing more unclear).

Many moons ago, using, for example, Q, we could create a deferred object with
`Q.defer()` and then resolve or reject ith with `deferred.resolve()` and
`deferred.reject()`. Since there was no initial backgrounding, we could set
up a test with an unresolved promise, make some pre-assertions, then resolve
and make assertions about "after resolution" state, without making our tests
async at all. It made testing a little easier (imo) and the idea has been
propagated into frameworks like `angular-mocks`

### Usage

SynchronousPromise looks (from the outside) a lot like an ES6 promise. We construct
the same:

```javascript
var promise = new SynchronousPromise((resolve, reject) => {
  if (Math.random() < 0.1) {
    reject('unlucky!');
  } else {
    resolve('lucky!');
  }
});
```

They can, of course, be chained:

```javascript
var initial = new SynchronousPromise((resolve, reject) => {
  resolve('happy!');
});
initial.then(message => {
  console.log(message);
})
```

And have error handling, either from the basic A+ spec:
   
```javascript
initial.then(message => {
  console.log(message);
}, error => {
  console.error(error);
});
```

Or using the more familiar `catch()`:

```javascript
initial.then(message => {
  console.log(message);
}).catch(error => {
  console.error(error);
})
```

`.catch()` starts a new promise chain, so you can pick up with new logic
if you want to. `.then()` can deal with returning raw values or promises
(as per A+)

### Statics
`.all()`, `.resolve()` and `.reject()` are available on the `SynchronousPromise`
object itself:

```javascript
SynchronousPromise.all([p1, p2]).then(results => {
  // results is an array of results from all promises
}).catch(err => {
  // err is any single error thrown by a promise in the array
});

SynchronousPromise.resolve('foo');  // creates an already-resolved promise

SynchronousPromise.reject('bar'); // creats an already-rejected promise
```

(`race()` isn't because I haven't determined a good strategy for that yet -- but it's
unlikely you'll need `race()` from a test).

### Extras
`SynchronousPromise` also provides two extra functions to make testing a little
easier:

`pause()` pauses the promise chain at the point at which it is called:

```javascript
SynchronousPromise.resolve('abc').then(data => {
  // this will be run
  return '123';
}).pause().then(data2 => {
  // we don't get here without resuming
});
```

and `resume()` resumes operations:

```javascript
var
  promise = SynchronousPromise.resolve('123').pause(),
  captured = null;
promise.then(data => {
  captured = data;
});

expect(data).to.be.null;   // because we paused...
promise.resume();
expect(data).to.equal('123'); // because we resumed...
```

You can use `pause()` and `resume()` to test the state of your system under
test at defined points in a series of promise chains

### ES5
SynchronousPromise is purposefully written with prototypical, ES5 syntax so you
can use it from ES5 if you like.

## Typescript
The `synchronous-promise` package includes an `index.d.ts`. To install, run:
```
typings install npm:synchronous-promise --save
```

### Production code
The main aim of SynchronousPromise is to facilitate easier testing. That being
said, it appears to conform to expected `Promise` behaviour, barring the
always-backgrounded behaviour. One might be tempted to just use it everywhere.

**However**: I'd highly recommend using *any* of the more venerable promise implementations
instead of SynchronousPromise in your production code -- preferably the vanilla
ES6 Promise, where possible (or the shim, where you're in ES5). Or Q.
Or jQUery.Deferred(). Basically, this seems to work quite well for testing and
I've tried to implement every behaviour I'd expect from a promise -- but I'm
pretty sure that a native `Promise` will be better for production code any day. 
