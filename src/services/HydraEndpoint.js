const hydraExpress = require("hydra-express");
const hydra = hydraExpress.getHydra();
const express = hydraExpress.getExpress();
const ServerResponse = require("fwsp-server-response");
var logger = require("./LoggingService")("HydraEndPoint");
var CLSservice = require("./CLSService");
var UtilService = require("./UtilsService");

let serverResponse = new ServerResponse();
express.response.sendError = function (err) {
  serverResponse.sendServerError(this, { result: { error: err } });
};
express.response.sendOk = function (result) {
  serverResponse.sendOk(this, { result });
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
      throw message;
    }
    config.routes.forEach((route) => {
      logger.info(
        `registered: [${route.method}]${serviceFullName}${route.path}`
      );
      api[route.method](route.path, CLSservice.middleware, (req, res) => {
        logger.info({ req: req }, "Incoming request");
        checkTransactionId(req);
        //Create a mdw instead of a function
        if (
          req.body[TOKEN_HEADER_KEY] !==
          config[config.serviceName.toUpperCase().replace("-", "_") + "_TOKEN"]
        ) {
          res.sendError(
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
                res.sendOk({
                  from: `${hydra.getServiceName()} - ${hydra.getInstanceID()}`,
                  data: result,
                });
              },
              (reason) => {
                logger.error(reason, "Fail to parse for");
                res.sendError(reason);
              }
            )
            .catch((e) => {
              logger.error(e, "Fail to parse for");
              res.sendError(e.message);
            });
        } else {
          logger.error(
            `${route.handler} is not returning a promise. Not processing the response`
          );
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
