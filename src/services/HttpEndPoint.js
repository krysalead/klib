const express = require("express");
var logger = require("./LoggingService")("HttpEndPoint");
const app = express();

const httpEndpoint = (config, controller) => {
  const port = config.port || 3000;
  const method = config.method || "get";
  const path = config.path || "/";
  app[method](path, (req, res) => {
    try {
      controller.handle(req, res);
    } catch (e) {
      logger.error(`Failed to call the request handler [${method}]${path}`);
    }
  });

  app.listen(port, () => {
    logger.info(`Server listening at http://localhost:${port}`);
  });
};

module.exports = httpEndpoint;
