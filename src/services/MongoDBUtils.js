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
  getCallbackHandler: function (asArray = false, failIfEmpty = false) {
    logger.debug(
      `getCallbackHandler asArray = ${asArray}, failIfEmpty = ${failIfEmpty}`
    );
    return (result) => {
      logger.debug("Database call success");
      if (asArray) {
        result = self.asArray(result);
      } else {
        result = self.notAsArray(result);
      }
      if (failIfEmpty) {
        return self.failIfEmpty(result);
      } else {
        return result;
      }
    };
  },
  errorHandler: function (err) {
    if (err && !isEmpty(err)) {
      const message = `Database call failed for ${err.message}`;
      logger.error(err, message);
      throw new Error(message);
    }
    logger.error("Database call failed without information");
  },
  exceptionHandler: function (errorMessage) {
    return function (e) {
      logger.error(`exceptionHandler [${errorMessage}]`, e.message);
      return Promise.reject(
        `exceptionHandler [${errorMessage}] -> ${e.message}`
      );
    };
  },
  runSafe: function (scope, fn, args) {
    logger.debug("runSafe");
    return new Promise(function (resolve, reject) {
      logger.debug("Get context");
      var context = CLSService.context();
      logger.debug("Storing context");
      var ns = CLSService.namespace();
      ns.run(function () {
        logger.debug("Restoring context");
        CLSService.context(context);
        fn.apply(scope, args)
          .then(resolve, reject)
          .catch((e) => {
            logger.error(e, "fail call in runsafe");
          });
      });
    });
  },
  /**
   *
   * @param result
   */
  failIfEmpty: function (result) {
    logger.debug("failIfEmpty");
    if (result == null || result.length == 0) {
      const EMPTY_RESPONSE = "Fail due to empty answer";
      logger.warn(EMPTY_RESPONSE);
      return Promise.reject(EMPTY_RESPONSE);
    } else {
      return result;
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
    logger.debug("notAsArray", result);
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
    logger.debug("secureObjectId", object);
    var id = object._id || object.id;
    object = self.cleanObjectId(object);
    object.id = id.toString ? id.toString() : id;
    return object;
  },
  /**
   * Remove the _id of an object
   * @param object
   * @returns {*}
   */
  cleanObjectId: function (object) {
    logger.debug("cleanObjectId");
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
