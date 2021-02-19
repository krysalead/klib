/* global coreModule:false, moment:false, getContext:false, console:false,angular:false*/
var bunyan = require("bunyan");
var Bunyan2Loggly = require("bunyan-loggly");
var CLSservice = require("./CLSService");
const DEBUG = "debug";
/**
 * Logging service allows to create better logging with date time stamp class scope. It relies on Moment.js, it could also send the logging to the server
 */
module.exports = function (context) {
  function reqSerializer(req) {
    return {
      method: req.method,
      url: req.url,
    };
  }

  var loggerConfig = {
    name: context,
    streams: [
      {
        level: process.env.LOG_LEVEL || DEBUG,
        stream: process.stdout,
      },
    ],
    serializers: {
      req: reqSerializer,
    },
  };

  if (process.env.LOGGLY_TOKEN && process.env.LOGGLY_SUB_DOMAIN) {
    var logglyConfig = {
      token: process.env.LOGGLY_TOKEN,
      subdomain: process.env.LOGGLY_SUB_DOMAIN,
      tags: [process.env.LOGGLY_TAG],
    };

    var logglyStream = new Bunyan2Loggly(
      logglyConfig,
      null,
      null,
      function (error, result, content) {
        if (error) {
          console.error("Bunyan2Loggly", error);
        }
      }
    );
    loggerConfig.streams.push({
      type: "raw",
      level: process.env.LOG_LEVEL || "debug",
      stream: logglyStream,
    });
  }

  var logger = bunyan.createLogger(loggerConfig);
  var augmentArguments = function (args) {
    var modifiedArgs = Array.from(args);
    if (modifiedArgs[0]) {
      if (modifiedArgs[0].substr) {
        //it is a string
        var message = modifiedArgs[0];
        modifiedArgs[0] = {
          req_id: CLSservice.get("reqId"),
        };
        if (modifiedArgs.length > 1) {
          //2 arguments in the call each are strings
          var data = modifiedArgs[1];
          modifiedArgs[1] = message + " - " + JSON.stringify(data);
        } else {
          modifiedArgs.push(message);
        }
      } else {
        modifiedArgs[0] = Object.assign(modifiedArgs[0], {
          req_id: CLSservice.get("reqId"),
        });
      }
    }
    return modifiedArgs;
  };

  return {
    isDebug() {
      return loggerConfig.streams[0].level == DEBUG;
    },
    info: function () {
      logger.info.apply(logger, augmentArguments(arguments));
    },
    log: function () {
      logger.info.apply(logger, augmentArguments(arguments));
    },
    debug: function () {
      logger.debug.apply(logger, augmentArguments(arguments));
    },
    error: function () {
      logger.error.apply(logger, augmentArguments(arguments));
    },
    warn: function () {
      logger.warn.apply(logger, augmentArguments(arguments));
    },
  };
};
