/// <reference path="index.d.ts" />
import { SynchronousPromise } from "./index";
import { expect } from 'chai';

global.Promise = SynchronousPromise;

describe("typescript async/await", () => {
  it("should resume", async () => {
    // Arrange
    // Act
    debugger;
    await new SynchronousPromise((resolve, reject) => {
      setTimeout(() => {
        resolve("whee!");
      }, 0);
    });
    debugger;
  })
  async function getResult(data: any) {
    return await SynchronousPromise.resolve(data).then(data => data, error => { });
  }
});