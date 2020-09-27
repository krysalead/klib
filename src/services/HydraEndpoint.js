const hydraExpress = require("hydra-express");
const hydra = hydraExpress.getHydra();
const express = hydraExpress.getExpress();
const ServerResponse = require("fwsp-server-response");
var logger = require("./LoggingService")("HydraEndPoint");
var CLSservice = require("./CLSService");
var UtilService = require("./UtilsService");

let serverResponse = new ServerResponse();

const getResponse = (code, result) => {
  return {
    result: {
      from: hydra.getServiceName(),
      id: hydra.getInstanceID(),
      code: code,
      message: code !== 200 ? result : null,
      data: code === 200 ? result : null,
    },
  };
};

express.response.sendError = function (result) {
  logger.error("Call crashed for", result);
  serverResponse.sendServerError(
    this,
    getResponse(ServerResponse.HTTP_SERVER_ERROR, result)
  );
};
express.response.sendOk = function (result) {
  serverResponse.sendOk(this, getResponse(ServerResponse.HTTP_OK, result));
};
express.response.invalid = function (result) {
  logger.warn("Call failed for", result);
  serverResponse.sendInvalidRequest(
    this,
    getResponse(ServerResponse.HTTP_BAD_REQUEST, result)
  );
};
express.response.unAuthorized = function (result) {
  logger.warn("UnAuthorized call", result);
  serverResponse.sendInvalidUserCredentials(
    this,
    getResponse(ServerResponse.HTTP_UNAUTHORIZED, result)
  );
};

express.response.unImplemented = function (result) {
  logger.warn("unImplemented call", result);
  serverResponse.sendMethodNotImplemented(
    this,
    getResponse(ServerResponse.HTTP_METHOD_NOT_IMPLEMENTED, result)
  );
};

const TOKEN_HEADER_KEY = "x-service-token";
const TRANSACTION_HEADER_KEY = "x-transaction-id";

const HydraEndpoint = (config, controller) => {
  //Create a mdw instead of a cal to a function
  const checkTransactionId = (req) => {
    if (req.body[TRANSACTION_HEADER_KEY] !== undefined) {
      //set the transation key
      CLSservice.set("reqId", req.body[TRANSACTION_HEADER_KEY]);
      logger.info("Transation id set", req.body[TRANSACTION_HEADER_KEY]);
    } else {
      logger.warn(
        `Transation id not set header ${TRANSACTION_HEADER_KEY} is not defined`
      );
    }
  };
  const getExpressAPI = (serviceFullName) => {
    let api = express.Router();
    if (config.routes == undefined || config.routes.length == 0) {
      const message =
        "Invalid configuration, you need to specify routes in your config.json as an array of {path,method,handler}";
      logger.error(message);
      return;
    }
    config.routes.forEach((route) => {
      logger.info(
        `registered: [${route.method}]${serviceFullName}${route.path}`
      );
      if (controller[route.handler] == undefined) {
        logger.error(`${route.handler} doesn't exist on controller`);
        return;
      }
      api[route.method](route.path, CLSservice.middleware, (req, res) => {
        logger.info({ req: req }, "Incoming request");
        logger.debug("message", req.body);
        checkTransactionId(req);
        //Create a mdw instead of a function
        if (
          req.body[TOKEN_HEADER_KEY] !==
          config[config.serviceName.toUpperCase().replace("-", "_") + "_TOKEN"]
        ) {
          res.unAuthorized(
            "Invalid Token or no token provided " +
              TOKEN_HEADER_KEY +
              "=>" +
              req.body[TOKEN_HEADER_KEY]
          );
          return;
        }
        //Effective call to the business code
        const promise = controller[route.handler](req.body.data);
        if (UtilService.isPromise(promise)) {
          promise
            .then(
              (result) => {
                logger.info("request handled");
                logger.debug("message", result);
                res.sendOk(result);
              },
              (reason) => {
                res.invalid(reason);
              }
            )
            .catch((e) => {
              res.sendError(e.message);
            });
        } else {
          const message = `${route.handler} is not returning a promise. Not processing the response`;
          res.unImplemented(message);
        }
      });
    });
    return api;
  };
  /**
   * Load configuration file and initialize hydraExpress app
   */
  //Override with context
  const version = config.version;
  const serviceName = config.serviceName;
  var conf = { version, hydra: { redis: {} } };
  conf.hydra.serviceName = serviceName;
  conf.hydra.serviceVersion = version;
  conf.hydra.serviceDescription = config.HYDRA_SERVICE_DESCRIPTION;
  conf.hydra.serviceType = config.HYDRA_SERVICE_TYPE;
  conf.hydra.servicePort = config.HYDRA_SERVICE_PORT;
  conf.hydra.redis.db = config.REDIS_DATABASE;
  conf.hydra.redis.port = config.REDIS_PORT;
  conf.hydra.redis.url = config.REDIS_URL;
  conf.hydra.serviceIP = config.HYDRA_SERVICE_IP;
  conf.hydra.serviceDNS = config.HYDRA_SERVICE_DNS;
  logger.debug("Configuration", conf);
  const redisServer =
    conf.hydra.redis.url.split("@")[1] || conf.hydra.redis.url;
  logger.info(
    "Hydra Microservice connected via redis DB at " +
      redisServer +
      " " +
      conf.hydra.redis.port
  );
  const fullName = `/v${version}/${serviceName}`;
  return hydraExpress.init(conf, version, () => {
    const routes = {};
    routes[fullName] = getExpressAPI(fullName);
    hydraExpress.registerRoutes(routes);
  });
};
module.exports = HydraEndpoint;
