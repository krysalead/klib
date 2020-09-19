require("dotenv").config();
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const envConfig = dotenv.parse(fs.readFileSync(".env"));
for (const k in envConfig) {
  if (process.env[k] !== undefined) {
    envConfig[k] = process.env[k];
  }
}

/**
 * This process is synchronous, idealy should return a promise.
 * @param {} scope
 */
module.exports = function (scope) {
  if (global.app_config !== undefined) {
    return global.app_config;
  }
  const configJsonPath = path.join(process.cwd(), "config", "config.json");
  console.log("Reading configuration from", configJsonPath);
  let config = {};
  if (fs.existsSync(configJsonPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configJsonPath).toString());
    } catch (e) {
      console.error(`can't read and parse ${configJsonPath}`, e);
    }
  }
  const packageJson = require("./package.json");
  config.version = packageJson.version;
  config.serviceName = packageJson.name;
  const finalConfig = { ...config, ...envConfig };
  console.log(
    `Starting ${scope} with configuration`,
    JSON.stringify(finalConfig)
  );
  global.app_config = finalConfig;
  return finalConfig;
};
