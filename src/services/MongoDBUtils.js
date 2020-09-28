var swaggerMongoose = require("swagger-mongoose");
var swagger = require("../config/swagger_db2.json");
var CLSService = require("./CLSService");
var logger = require("./LoggingService")("MongoDBUtils");
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
    if (err && !isEmpty(err)) {
      logger.error("Database call failed for", err);
    }
  },
  exceptionHandler: function (errorMessage) {
    return function (e) {
      logger.error("exceptionHandler", e);
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
    if (result == null || result.length == 0) {
      logger.warn("Rejected due to empty answer");
      return Promise.reject(self.EMPTY_RESPONSE);
    } else {
      logger.info("Resolved with object");
      return Promise.resolve(result);
    }
  },
  /**
   *
   * @param result
   * @returns {*}
   */
  asArray: function (result) {
    logger.debug("asArray");
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
    logger.debug("notAsArray");
    if (result && result.join !== undefined) {
      return result.length > 0 ? result[0] : null;
    } else {
      return result;
    }
  },
  transformDAO: function (doc, ret, options) {
    logger.debug("toJSON");
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
  /**
   * Secure the id coming from the database
   * @param object
   * @returns {*}
   */
  secureObjectId: function (object) {
    var id = object._id || object.id;
    object = this.cleanObjectId(object);
    object.id = id;
    return object;
  },
  /**
   * Remove the _id of an object
   * @param object
   * @returns {*}
   */
  cleanObjectId: function (object) {
    if (object.toJSON !== undefined) {
      object = object.toJSON();
      delete object.toJSON;
    }
    if (object._id) {
      delete object._id;
    }
    if (object.id) {
      delete object.id;
    }
    if (object.__v !== undefined) {
      delete object.__v;
    }
    if (object.owner_id !== undefined) {
      delete object.owner_id;
    }
    return object;
  },
};
module.exports = self;
