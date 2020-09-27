var fs = require("fs");
var sinon = require("sinon");
var Q = require("q");
var path = require("path");
const CLSService = require("../services/CLSService");

const TESTFOLDER = "test";

/**
 * Change into test folder so that file loading works.
 */
//process.chdir("./" + TESTFOLDER);

__require = function (package) {
  const dir = process.cwd().replace("test", "src");
  const dependency = path.join(dir, package.replace(".", "/") + ".js");
  return require(dependency);
};

var sandbox;

var self = {
  require: function (package, dir) {
    return __require(package, dir);
  },
  mockRequest: function (requestService) {
    var sandbox = sinon.createSandbox();
    sandbox.replace(requestService, "request", function (method, url) {
      return Q.when(self.readMocks(url).toString());
    });
    return () => {
      sandbox.restore();
    };
  },
  underTest: function (testClass) {
    return require(testClass.replace(TESTFOLDER, "src").replace("Test.js", ""));
  },
  readMocks: function (url) {
    var path =
      process.cwd() +
      "/../mocks/" +
      url.replace(/https?:\/\//, "").replace(/\//g, "_");
    return fs.readFileSync(path);
  },
  clsWrap: function (fn) {
    return function (done) {
      CLSService.wrap(() => {
        var txid = this.test.title.replace(/ /g, "_").replace(/'/g, "-");
        CLSService.set("reqId", "MSTST_" + txid);
        const promise = fn();
        if (promise === undefined || promise.then === undefined) {
          throw "Your function must return a promise";
        }
        promise.then(done, done).catch(done);
      })();
    };
  },
  clsWrapWithPromise: function (fn) {
    return function () {
      var txid = this.test.title.replace(/ /g, "_").replace(/'/g, "-");
      return new Promise(function (resolve, reject) {
        var ns = CLSService.namespace();
        ns.run(function () {
          CLSService.set("reqId", "MSTST_" + txid);
          const promise = fn();
          if (promise === undefined || promise.then === undefined) {
            throw "Your function must return a promise";
          }
          promise.then(resolve, reject);
        });
      });
    };
  },
};

module.exports = self;
