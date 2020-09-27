const hydra = require("hydra");
var logger = require("./LoggingService")("MicroServiceWrapper");
var CLSService = require("./CLSService");
const MongoDBService = require("./MongoDBService");

module.exports = function (config) {
  const self = {
    _buildMessage: (request) => {
      logger.debug("Sending UMF message from", config.serviceName);
      const to = `${request.serviceName}:[${request.method}]/v${request.version}/${request.serviceName}${request.action}`;
      logger.info("Calling:", to);
      logger.debug("TxId", CLSService.get("reqId"));
      return hydra.createUMFMessage({
        to,
        from: config.serviceName,
        body: {
          data: request.payload,
          isHttps: config.isHttps,
          "x-service-token":
            config[
              request.serviceName.toUpperCase().replace("-", "_") + "_TOKEN"
            ],
          "x-transaction-id": CLSService.get("reqId"),
        },
      });
    },
    _handleResponse: (resolve, reject) => {
      return (response) => {
        logger.info("Response recieved", response);
        if (response.statusCode === 200) {
          resolve(response.result);
        } else {
          logger.warn(
            `${response.result.from} (${response.result.id}) answered with:${response.statusDescription} (${response.statusCode})`
          );
          logger.warn(response.result.message);
          reject(response.result);
        }
      };
    },
    close: () => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          hydra.shutdown().then(resolve, reject);
        }, 250);
      });
    },
    _onReady: (resolve, reject, request) => {
      return () => {
        message = self._buildMessage(request);
        logger.debug("UMF message", message);
        hydra
          .makeAPIRequest(message)
          .then(self._handleResponse(resolve, reject));
      };
    },
    /**
     * Return a promise to wait for the call to the service
     * @returns {Promise}
     */
    doCall: function (
      serviceName,
      payload,
      version,
      action = "",
      method = "post"
    ) {
      logger.info("doCall");
      const request = {
        serviceName,
        payload,
        version,
        action,
        method,
      };
      if (config.useHydra) {
        return new Promise((resolve, reject) => {
          logger.debug("Initializating Hydra");
          // To indicate a call to a service
          const hydraConfig = {
            hydra: {
              servicePort: 0,
              serviceType: "",
              serviceName: config.serviceName,
              serviceVersion: version,
              redis: {
                db: config.REDIS_DATABASE,
                port: config.REDIS_PORT,
                url: config.REDIS_URL,
              },
            },
          };
          hydra
            .init(hydraConfig)
            .then(self._onReady(resolve, reject, request))
            .catch((err) => {
              logger.error(
                err,
                `Fail to contact service ${serviceName} on ${version} of ${action}`
              );
              reject(err.message);
            });
        });
      } else {
        throw "Not yet implemented";
      }
    },
    doStart: (controller) => {
      var endpoint;
      if (config.useHydra) {
        endpoint = require("./HydraEndPoint");
      } else {
        endpoint = require("./HttpEndPoint");
      }
      if (config.MONGO_URL) {
        MongoDBService.init(config).then(() => {
          return endpoint(config, controller);
        });
      } else {
        return endpoint(config, controller);
      }
    },
  };
  return self;
};
