"use strict";

require("../src/helpers/chai");
var utils = require("../src/helpers/utils");
global.utils = utils;

// Tests go here.
require("./services/CLSServiceTest");
require("./services/ConfigServiceTest");
require("./services/StringServiceTest");
require("./services/UtilsServiceTest");
