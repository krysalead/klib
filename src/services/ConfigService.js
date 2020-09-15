require("dotenv").config();
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

module.exports = function (scope) {
  if (scope) {
    console.log(
      `Starting ${scope} with configuration`,
      getEnv(scope).join("\n")
    );
  }
  return env;
};
