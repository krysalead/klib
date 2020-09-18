require("dotenv").config();
const fs = require("fs");
const path = require("path");
const env = require("env-var");
const getEnv = (group) => {
  return Object.keys(env.get())
    .filter((key) => {
      return key.indexOf(group) == 0;
    })
    .map((key) => {
      return `${key}=${env.get(key).asString()}`;
    });
};

const config = fs.existsSync(path.join(__dirname + "config.json"));

module.exports = function (scope) {
  var scopedEnv = getEnv(scope);
  console.log(`Starting ${scope} with environement`, scopedEnv.join("\n"));
  console.log(`Starting ${scope} with configuration`, JSON.stringify(config));
  return { ...config, env: scopedEnv };
};
