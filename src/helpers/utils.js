var fs = require("fs");
var sinon = require("sinon");
var Q = require("q");

const TESTFOLDER = "test";

/**
 * Change into test folder so that file loading works.
 */
//process.chdir("./" + TESTFOLDER);

__require = function (package, dir) {
  dir = dir || "/";
  dir = dir.replace(__dirname + "/", "");
  var dependency = __filename
    .replace(TESTFOLDER + "/helpers", "src")
    .replace("utils.js", package.replace(".", "/"));
  //console.log("Requiring...", dependency);
  return require(dependency);
};

var sandbox;

var self = {
  require: function (package, dir) {
    return __require(package, dir);
  },
  beforeTest: function (parserManager) {
    sandbox = sinon.sandbox.create();
    sandbox.stub(parserManager, "request", function (method, url) {
      return Q.when(self.readMocks(url).toString());
    });
  },
  afterTest: function () {
    sandbox.restore();
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
