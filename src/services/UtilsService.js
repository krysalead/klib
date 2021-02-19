var _ = require("lodash");
var logger = require("./LoggingService")("UtilsService");
const emailPattern = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/gi;

if (!Array.prototype.last) {
  Array.prototype.last = function () {
    return this[this.length - 1];
  };
}

var self = {
  isPromise: (promise) => {
    return self.isDefined(promise) && self.isDefined(promise.then);
  },
  /**
   * Allow to safely access an element of an object without testing every possible undefined element issues
   * @param {object} o object to go through
   * @param {string} path string a JSON path (i.e. a.b.c)
   * @param {string|boolean|number|object} [defaultValue=undefined] what to return in case of failure
   */
  safeAccess: (o, path, defaultValue) => {
    if (self.isUndefined(o)) {
      return defaultValue;
    }
    var arr = path.split(".");
    for (var i = 0, j = arr, k = j.length, l = o; i < k; i++) {
      var key = j[i];
      if (key.indexOf("[") > -1) {
        var m = /(\w*)\[(\d*)\]/.exec(key);
        key = m[1];
        var t = key !== "" ? l[key] : l;
        if (self.isDefined(t) && self.isDefined(t[m[2]])) {
          l = t[m[2]];
        } else {
          if (typeof defaultValue === "function") {
            return defaultValue();
          } else {
            return defaultValue;
          }
        }
      } else {
        if (self.isDefined(l[key])) {
          l = l[key];
        } else {
          if (typeof defaultValue === "function") {
            return defaultValue();
          } else {
            return defaultValue;
          }
        }
      }
    }
    return l;
  },
  /**
   * Allow to access a key in a JSON with checks on every steps
   * @param jsonOject
   * @param path
   * @returns {*}
   */
  jsonWalker: function (jsonOject, path) {
    return self.safeAccess(jsonOject, path, undefined);
  },
  /**
   * Validate Mongoose id
   * @param {String} id
   * @returns {*}
   */
  isValidId: function (id) {
    return _.isString(id) && id.match(/^[0-9a-fA-F]{24}$/);
  },
  /**
   * Validate Email id
   * @param {String} id
   * @returns {*}
   */
  isValidEmail: function (email) {
    return _.isString(email) && email.match(emailPattern).length == 1;
  },
  /**
   * Extract an email from a string and returns the first email
   * @param string
   * @returns {boolean}
   */
  getEmailFromString: function (string) {
    return self.isString(string) && string.match(emailPattern);
  },
  /**
   * Check that an object is not empty
   * @param string
   * @returns {boolean}
   */
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
    }
    if (self.isArray(string)) {
      return !this.isUndefined(string) && string.length == 0;
    }
    return !this.isUndefined(string) && self.isEmptyObject();
  },
  /**
   * Determine if an object is undefined
   * @param object
   * @returns {boolean}
   */
  isUndefined: function (o) {
    return _.isUndefined(o) || o == null;
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
   * Determine if an object is an Array, wrapper on underscore
   * @param object
   * @returns {boolean}
   */
  isArray: function (o) {
    return _.isArray(o);
  },
  /**
   * Determine if an object is an string, wrapper on underscore
   * @param object
   * @returns {boolean}
   */
  isString: function (o) {
    return _.isString(o);
  },
  /**
   * Check that all the field of the list are on the object
   * @param {Array} list of field as string
   * @param {Object} object where the field should be
   * @throw an exception in case a field is missing
   */
  checkMissingFields: function (list, object) {
    logger.debug("checkMissingFields");
    var fails = list.filter(function (item) {
      return object == undefined || object[item] == undefined;
    });

    if (fails.length > 0) {
      throw new Error("Mandatory field(s) is/are missing: " + fails);
    }
  },
  /**
   * Retrieve the right parameter
   * @param params
   * @returns {*}
   */
  getParameter: function (params) {
    if (params.recipe) {
      return params.recipe.value;
    }
    if (params.realization) {
      return params.realization.value;
    }
    if (params.favorite) {
      return params.favorite.value;
    }
    if (params.target) {
      return params.target.value;
    }
    if (params.id) {
      return params.id.value;
    }
  },
  /**
   * Send the data back to the client
   * @param data
   * @param res
   */
  sendData: function (data, res) {
    try {
      if (data != null) {
        res.setHeader("Content-Type", "application/json");
        res.status(data.code < 600 ? data.code : 200).json(data);
      } else {
        res.end();
      }
    } catch (e) {
      logger.error("Send Data failed for", e);
      throw e; //let the upper caller handle the way to anser to the client
    }
  },
};

module.exports = self;
