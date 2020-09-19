const express = require("express");
var logger = require("./LoggingService")("HttpEndPoint");
const app = express();

const httpEndpoint = (config) => {
  const port = config.port || 3000;
  const method = config.method || "get";
  const path = config.path || "/";
  app[method](path, (req, res) => {
    config.handle(req, res);
  });

  app.listen(port, () => {
    logger.info(`Server listening at http://localhost:${port}`);
  });
};

module.exports = httpEndpoint;
