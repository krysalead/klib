var swaggerMongoose = require("swagger-mongoose");
var swagger = require("../config/swagger_db2.json");
var CLSService = require("./CLSService");
var logger = require("./LoggingService")("MongoDBUtils");
var Q = require("q");
var mongoose = require("mongoose");

function isEmpty(map) {
  for (var key in map) {
    if (map.hasOwnProperty(key)) {
      return false;
    }
  }
  return true;
}
var self = {
  EMPTY_RESPONSE: -1,
  /**
   *
   * @param deferer
   * @returns {Function}
   */
  getCallbackHandler: function (deferer, asArray, failIfEmpty) {
    logger.debug("getCallbackHandler");
    return function (err, result) {
      logger.debug("Database Handler function");
      if (err) {
        logger.error("Database call failed for", err);
        deferer.reject(err);
      } else {
        logger.debug("Database call success");
        if (result != null) {
          if (asArray && result.join === undefined) {
            result = [result];
          }
          if (!asArray && result.join !== undefined) {
            result = result.length > 0 ? result[0] : null;
          }
        } else {
          if (asArray) {
            result = [];
          }
        }
        if (failIfEmpty && (result == null || result.length == 0)) {
          logger.info("Rejected due to empty answer");
          deferer.reject(self.EMPTY_RESPONSE);
        } else {
          logger.debug("Resolved with object");
          deferer.resolve(result);
        }
      }
    };
  },
  errorHandler: function (err) {
    console.log(arguments);
    if (err && !isEmpty(err)) {
      logger.error("Database call failed for", err);
    }
  },
  exceptionHandler: function (errorMessage) {
    return function (e) {
      logger.info("exceptionHandler", e);
      return errorService.getBackendError(500, errorMessage, e);
    };
  },
  runSafe: function (scope, fn, args) {
    return new Promise(function (resolve, reject) {
      var context = CLSService.context();
      logger.debug("Storing context");
      var ns = CLSService.namespace();
      ns.run(function () {
        logger.debug("Restoring context");
        CLSService.context(context);
        fn.apply(scope, args).then(resolve, reject);
      });
    });
  },
  /**
   *
   * @param result
   */
  failIfEmpty: function (result) {
    logger.info("failIfEmpty");
    var deferer = Q.defer();
    if (result == null || result.length == 0) {
      logger.warn("Rejected due to empty answer");
      deferer.reject(self.EMPTY_RESPONSE);
    } else {
      logger.info("Resolved with object");
      deferer.resolve(result);
    }
    return deferer.promise;
  },
  /**
   *
   * @param result
   * @returns {*}
   */
  asArray: function (result) {
    logger.info("asArray");
    if (result != null) {
      if (result.join === undefined) {
        //It is not an array
        return [result];
      } else {
        return result;
      }
    } else {
      if (asArray) {
        return [];
      }
    }
  },
  /**
   *
   * @param result
   * @returns {*}
   */
  notAsArray: function (result) {
    logger.info("notAsArray");
    if (result && result.join !== undefined) {
      return result.length > 0 ? result[0] : null;
    } else {
      return result;
    }
  },
  transformDAO: function (doc, ret, options) {
    logger.info("toJSON");
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
  /**
   * Return the model from swagger definition
   * @param {String} model the name of the model
   * @returns {MongooseSchema}
   */
  getSchema: function (model) {
    if (!global.schemas) {
      global.schemas = swaggerMongoose.build(swagger).schemas;
    }
    let schema = global.schemas[model];
    schema.options.toJSON = {
      transform: self.transformDAO,
    };
    return schema;
  },
  getModel: function (model) {
    return mongoose.model(model);
  },
  /**
   * Register in mongoose a schema
   * Get if from the swagger model based on the name
   */
  register: function (daoName) {
    if (mongoose.modelNames().indexOf(daoName) == -1) {
      mongoose.model(daoName, global.schemas[daoName]);
      logger.debug("register DAO", daoName);
    }
    return mongoose.model(daoName);
  },
  close: function () {
    logger.debug("Closing connection");
    mongoose.connection.close();
  },
  clear: function (model) {
    logger.debug("cleaning");
    return new Promise((resolve, reject) => {
      self.getModel(model).remove({}, function (err) {
        logger.debug("cleaned", err);
        err ? reject(err) : resolve();
      });
    });
  },
};
module.exports = self;
