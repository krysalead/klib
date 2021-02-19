require("dotenv").config();
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
let envConfig = dotenv.parse(fs.readFileSync(".env"));
var logger = require("./LoggingService")("ConfigService");

/**
 * This process is synchronous it will read the environment variables from en .env file.
 * It will override the value with the one from the process.env and then extend the environement with a
 * config file either config.json or config.js inside a config folder
 * Version and serviceName are taken from the package.json
 */
module.exports = function () {
  if (global.app_config !== undefined) {
    return global.app_config;
  }

  for (const k in envConfig) {
    if (process.env[k] !== undefined) {
      envConfig[k] = process.env[k];
    }
    if (/^\d+$/.test(envConfig[k])) {
      envConfig[k] = parseInt(envConfig[k]);
    }
    if (envConfig[k] === "true" || envConfig[k] === "false") {
      envConfig[k] = envConfig[k] === "true";
    }
  }
  let configJsonPath = path.join(process.cwd(), "config", "config.json");
  let parse = true;
  let config = {};
  if (!fs.existsSync(configJsonPath)) {
    configJsonPath = path.join(process.cwd(), "config", "config.js");
    parse = false;
  }
  if (!fs.existsSync(configJsonPath)) {
    configJsonPath = undefined;
  }
  if (configJsonPath) {
    try {
      logger.debug("Reading configuration from", configJsonPath);
      if (parse) {
        config = JSON.parse(fs.readFileSync(configJsonPath).toString());
      } else {
        config = require(configJsonPath);
      }
    } catch (e) {
      logger.error(`can't read and parse ${configJsonPath}`, e);
    }
  }
  const packageJson = require(path.join(process.cwd(), "package.json"));
  config.version = packageJson.version.split(".")[0]; //taking only the major version
  config.serviceName = packageJson.name;
  const finalConfig = { ...envConfig, ...config };
  logger.debug(`Starting with configuration`);
  if (logger.isDebug()) {
    Object.keys(finalConfig).forEach((confEl) =>
      console.log(`${confEl}=${finalConfig[confEl]}`)
    );
  }
  global.app_config = finalConfig;
  return finalConfig;
};
