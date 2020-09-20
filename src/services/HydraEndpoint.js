const hydraExpress = require("hydra-express");
const hydra = hydraExpress.getHydra();
const express = hydraExpress.getExpress();
const ServerResponse = require("fwsp-server-response");
var logger = require("./LoggingService")("HydraEndPoint");
var CLSservice = require("./CLSService");

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
  const checkTransactionId = (req) => {
    if (req.headers[TRANSACTION_HEADER_KEY] !== undefined) {
      //set the transation key
      CLSservice.set("reqId", req.headers[transactionKey]);
      logger.info("Transation id set", req.headers[transactionKey]);
    } else {
      logger.warn(
        `Transation id not set header ${TRANSACTION_HEADER_KEY} is not defined`
      );
    }
  };
  const getExpressAPI = () => {
    let api = express.Router();
    api.post("/", (req, res) => {
      logger.info({ req: req }, "Incoming request");
      checkTransactionId(req);
      if (req.headers[TOKEN_HEADER_KEY] !== config.ACCESS_TOKEN) {
        res.sendError(
          "Invalid Token or no token provided " +
            TOKEN_HEADER_KEY +
            "=>" +
            req.headers[TOKEN_HEADER_KEY]
        );
        return;
      }
      //Effective call to the business code
      controller
        .handle(req)
        .then(
          (result) => {
            logger.info("request handled");
            logger.debug(result);
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
  const redisServer = conf.hydra.redis.url.split("@")[1];
  logger.info(
    "Hydra Microservice connected via redis DB at " +
      (redisServer ? redisServer : "localhost")
  );
  const fullName = `/v${version}/${serviceName}`;
  return hydraExpress.init(conf, version, () => {
    const routes = {};
    routes[fullName] = getExpressAPI();
    hydraExpress.registerRoutes(routes);
  });
};
module.exports = HydraEndpoint;
