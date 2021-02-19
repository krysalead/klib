const hydra = require("hydra");
var logger = require("./LoggingService")("MicroServiceWrapper");
var CLSService = require("./CLSService");
const MongoDBService = require("./MongoDBService");

module.exports = function (config) {
  if (global.MicroServiceWrapper) {
    return global.MicroServiceWrapper;
  }
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
        let reason = "unhandled error";
        switch (response.statusCode) {
          case 200:
            resolve(response.result);
            return;
          case 503:
            reason = `Service unavailable: ${response.result.reason} (${response.statusCode})`;
            logger.warn(reason);
            break;
          default:
            if (response.result) {
              reason = `${response.result.from} (${response.result.id}) answered with:${response.statusDescription} (${response.statusCode}) - ${response.result.message}`;
            } else {
              reason = `Service failed: ${response.statusDescription} ${response.statusMessage} (${response.statusCode})`;
            }
            logger.error(reason);
        }
        reject({
          reason,
          code: response.statusCode,
        });
      };
    },
    close: () => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          hydra.shutdown(); //.then(resolve, reject);
          resolve();
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
    _mockedRequest: {},
    mockRequest: (path, data) => {
      self._mockedRequest[path] = data;
    },
    isMocked: (request) => {
      return self._mockedRequest[self.getMockUrlRequest(request)] !== undefined;
    },
    getMock: (request) => {
      return self._mockedRequest[self.getMockUrlRequest(request)];
    },
    getMockUrlRequest: (request) => {
      return [
        request.serviceName,
        request.version,
        request.method,
        request.action,
      ].join(":");
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
      logger.debug("Requesting", self.getMockUrlRequest(request));
      if (self.isMocked(request)) {
        logger.warn("Answering mock");
        return Promise.resolve(self.getMock(request));
      }
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
        throw "Direct Microservice Call is not yet implemented";
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
  if (config.USE_MOCK && config.mocks) {
    config.mocks.forEach((mock) => {
      logger.warn(`${mock.url} is mocked`);
      self.mockRequest(mock.url, require(process.cwd() + mock.data));
    });
  }
  global.MicroServiceWrapper = self;
  return self;
};
