var logger = require("./LoggingService")("ValidatorService");
/**
 * Validations
 */
var validatePresenceOf = function (value) {
  // If you are authenticating by any of the oauth strategies, don't validate.
  return (
    (this.provider && this.provider !== "local") || (value && value.length)
  );
};

var validateUniqueEmail = function (value, callback) {
  var User = mongoose.model(DAO_NAME);
  User.find(
    {
      $and: [
        {
          email: value,
        },
        {
          _id: {
            $ne: this._id,
          },
        },
      ],
    },
    function (err, user) {
      callback(err || user.length === 0);
    }
  );
};

module.exports = {
  homePhone: {
    message: "{VALUE} is not a valid home phone number!",
    validator: function (value) {
      logger.info("Validator Home phone");
      return /([0-9]{1}[-\.\s])?([\(\[]?[0-9]{3}[\)\]]?[-\.\s])?([0-9]{3})[-\.\s]([0-9]{4})(?:\s?(?:x|ext)\s?([0-9])+)?/.test(
        value
      );
    },
  },
  email: {
    message: "{VALUE} is not a valid email address!",
    validator: function (value) {
      logger.info("Validator Email");
      return /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
        value
      );
    },
  },
  notBlank: {
    message: "{VALUE} must not be empty!",
    validator: function (value) {
      logger.info("Validator Not blank");
      return !/^$/.test(value);
    },
  },
};
