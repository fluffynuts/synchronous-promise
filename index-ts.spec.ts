/// <reference path="index.d.ts" />
import { SynchronousPromise } from "./index";
import { expect } from 'chai';

// global.Promise = SynchronousPromise;

describe("typescript async/await", () => {
  it("should not hang", async function() {
    // Arrange
    // Act
    await new SynchronousPromise(function(resolve, reject) {
      setTimeout(() => {
        resolve("whee!");
      }, 0);
    });
  })
});