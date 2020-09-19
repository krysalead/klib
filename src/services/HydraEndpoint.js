const hydraExpress = require("hydra-express");
var logger = require("./LoggingService")("HydraEndPoint");
/*
const HydraExpressLogger = require('fwsp-logger').HydraExpressLogger;
hydraExpress.use(new HydraExpressLogger());
*/
let config = require("fwsp-config");

const HydraEndpoint = (name, version) => {
  /**
   * Load configuration file and initialize hydraExpress app
   */
  config
    .init("./config/config.json")
    .then(() => {
      config.version = version;
      //Override with context
      var conf = config.getObject();
      conf.hydra.servicePort =
        process.env.SERVICE_PORT || conf.hydra.servicePort;
      conf.hydra.redis.db = process.env.REDIS_DATABASE || conf.hydra.redis.db;
      conf.hydra.redis.port = process.env.REDIS_PORT || conf.hydra.redis.port;
      conf.hydra.redis.url = process.env.REDIS_URL || conf.hydra.redis.url;
      conf.hydra.serviceIP = process.env.SERVICE_IP || conf.hydra.serviceIP;
      conf.hydra.serviceDNS = process.env.SERVICE_DNS || conf.hydra.serviceDNS;
      const redisServer = conf.hydra.redis.url.split("@")[1];
      logger.info(
        "Hydra Microservice connected via redis DB at " +
          (redisServer ? redisServer : "localhost")
      );
      const fullName = `/v${version}/${name}`;
      return hydraExpress.init(conf, version, () => {
        hydraExpress.registerRoutes({
          fullName: require(`./src/${name}-v${version}-routes`),
        });
      });
    })
    .then((serviceInfo) => console.log("serviceInfo", serviceInfo))
    .catch((err) => console.log("err", err));
};
module.exports = HydraEndpoint;
