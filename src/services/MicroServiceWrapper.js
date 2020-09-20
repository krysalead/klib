const hydra = require("hydra");
var logger = require("./LoggingService")("MicroServiceWrapper");

let self = function (config) {
  return {
    _buildMessage: (request) => {
      logger.info("Sending UMF message");
      return hydra.createUMFMessage({
        to: `${request.serviceName}:[post]/v${request.version}/${request.action}`,
        from: config.hydra.serviceName,
        body: {
          "x-service-token":
            config[request.serviceName.toUpperCase() + "_TOKEN"],
          data: request.payload,
          isHttps: config.isHttps,
        },
      });
    },
    _handleResponse: (resolve, reject) => {
      return (response) => {
        logger.info("Response recieved");
        if (
          response.result &&
          response.result.error == undefined &&
          response.result.reason == undefined
        ) {
          resolve(response.result);
        } else {
          logger.warn("Service answered with:", response.result.reason);
          reject(response.result.reason);
        }
      };
    },
    close: () => {
      setTimeout(() => {
        hydra.shutdown();
      }, 250);
    },
    _onReady: (resolve, reject, request) => {
      return () => {
        hydra
          .makeAPIRequest(self._buildMessage(request))
          .then(self._handleResponse(resolve, reject))
          .finally(() => {
            self.close();
          });
      };
    },
    /**
     * Return a promise to wait for the call to the service
     * @returns {Promise}
     */
    doCall: function (serviceName, payload, version, action) {
      logger.info("doCall");
      const request = {
        serviceName,
        payload,
        version,
        action,
      };
      if (config.useHydra) {
        return new Promise((resolve, reject) => {
          logger.info("Initializating Hydra");
          hydra
            .init(config)
            .then(self._onReady(resolve, reject, request))
            .catch((err) => {
              logger.error(
                err,
                `Fail to contact service ${serviceName} with ${payload} on ${version} of ${action}`
              );
              reject(err.message);
            });
        });
      } else {
        throw "Not yest implemented";
      }
    },
    doStart: (controller) => {
      if (config.useHydra) {
        require("./HydraEndPoint")(config, controller);
      } else {
        require("./HttpEndPoint")(config, controller);
      }
    },
  };
};

module.exports = self;
