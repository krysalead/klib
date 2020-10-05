var CLSService = require("./CLSService");
var logger = require("./LoggingService")("MongoDBService");
var clsMongoose = require("cls-mongoose");
var mongoose = require("mongoose");

function printMongooseError(err) {
  if (err.name) {
    logger.error("Mongoose action fails for", err.name, err.message);
    if (err.errors) {
      for (var i in err.errors) {
        logger.error(err.errors[i].name, err.errors[i].message);
      }
    }
  } else {
    logger.error(err);
  }
}

var self = {
  close: () => {
    return mongoose.connection.close();
  },
  init: (config) => {
    self._prepareMongoose(config);
    return new Promise((resolve, reject) => {
      var dbUrl = config.MONGO_URL;
      if (dbUrl == undefined) {
        return Promise.reject("Database url not defined");
      }
      logger.info(`Mongoose connecting to ${dbUrl.split("@")[1] || dbUrl}...`);
      mongoose.connect(dbUrl, function (err) {
        if (err) {
          logger.error("Connection fails", err);
          reject(err);
        } else {
          logger.info("Mongoose connected");
          global.mongoose_ready = true;
          resolve();
        }
      });
    });
  },
  _prepareMongoose: (config) => {
    logger.debug(`Preparing mongoose...(${config.MONGOOSE_DEBUG})`);
    clsMongoose(CLSService.namespace());
    mongoose.Promise = Promise;
    mongoose.set("debug", config.MONGOOSE_DEBUG || false);
    mongoose.set("useFindAndModify", false);
    var db = mongoose.connection;
    db.on("error", printMongooseError);
  },
};

module.exports = self;
