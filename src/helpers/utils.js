var fs = require("fs");
var sinon = require("sinon");
var Q = require("q");
var path = require("path");

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
};

module.exports = self;
