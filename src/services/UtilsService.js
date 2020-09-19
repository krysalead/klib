var _ = require("lodash");
var logger = require("./LoggingService")("UtilsService");
const emailPattern = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;
var self = {
  /**
   *
   * @param jsonOject
   * @param path
   * @returns {*}
   */
  jsonWalker: function (jsonOject, path) {
    var paths = path.split(".");
    var objectSource = jsonOject;
    for (var i = 0; i < paths.length; i++) {
      objectSource = objectSource[paths[i]];
      if (objectSource == undefined) {
        logger.warn("jsonWalker: String not found", path);
        return objectSource;
      }
    }

    if (objectSource[0] == "@") {
      //this is a link to another key
      return this.jsonWalker(
        jsonOject,
        objectSource.substr(1, objectSource.length)
      );
    }
    return objectSource;
  },
  /**
   * Validate Mongoose id
   * @param {String} id
   * @returns {*}
   */
  isValidId: function (id) {
    return _.isString(id) && id.match(/^[0-9a-fA-F]{24}$/);
  },
  isValidEmail: function (email) {
    return _.isString(email) && email.match(emailPattern);
  },
  getEmailFromString: function (string) {
    return self.isValidEmail(string) && string.match(emailPattern)[0];
  },

  isEmptyObject: function (obj) {
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) return false;
    }
    return true;
  },
  /**
   * Check that a string is not empty and defined
   * @param string
   * @returns {boolean}
   */
  isEmpty: function (string) {
    if (self.isString(string)) {
      return !this.isUndefined(string) && string === "";
    } else {
      return !this.isUndefined(string) && self.isEmptyObject();
    }
  },
  /**
   * Determine if an object is undefined
   * @param object
   * @returns {boolean}
   */
  isUndefined: function (o) {
    return _.isUndefined(o);
  },
  /**
   * Determine if an object is defined
   * @param object
   * @returns {boolean}
   */
  isDefined: function (o) {
    return !self.isUndefined(o);
  },
  /**
   * Determine if an object is an Array
   * @param object
   * @returns {boolean}
   */
  isArray: function (o) {
    return _.isArray(o);
  },
  isString: function (o) {
    return _.isString(o);
  },
  /**
   * Check that all the field of the list are on the object
   * @param {Array} list
   * @param {Object} object
   * @returns {Promise<T>}
   */
  checkFields: function (list, object) {
    logger.info("checkFields");
    var fails = list.filter(function (item) {
      return object == undefined || object[item] == undefined;
    });
    logger.info("checkFields done");
    return fails.length > 0;
  },
};

module.exports = self;
