"use strict";

var chai = require("chai");
var utils = require("./utils");

chai.config.includeStack = true;

global.expect = chai.expect;
global.AssertionError = chai.AssertionError;
global.Assertion = chai.Assertion;
global.assert = chai.assert;

let msit = (description, fn) => it(description, utils.clsWrapWithPromise(fn));
msit.only = (description, fn) =>
  it.only(description, utils.clsWrapWithPromise(fn));
msit.skip = (description, fn) =>
  it.skip(description, utils.clsWrapWithPromise(fn));
msit.retries = (description, fn) =>
  it.retries(description, utils.clsWrapWithPromise(fn));

global.msit = msit;
