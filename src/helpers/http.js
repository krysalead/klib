const request = require("request");
const util = require("util");
const pRequest = util.promisify(request);
const http = require("http");

module.exports = (config, logger) => {
  const self = {
    mockedRoute: [],
    stopMockServer: () => {
      self.server.close();
      logger.info(`Mock Server stopped`);
    },
    mockServer: (port = 6666) => {
      const register = {
        when: (route, handler) => {
          self.mockedRoute.push({ route, handler });
          return register;
        },
      };

      const onRequestEnd = function (req, res) {
        handler = self.mockedRoute
          .filter((mockedRoute) => mockedRoute.route == req.url)
          .map((mockedRoute) => mockedRoute.handler);
        let data = {};
        if (handler.length == 0) {
          res.writeHead(404);
          console.log(req);
          data = {
            message: `No handler for '${req.url}'`,
            headers: req.headers,
            url: req.url,
            body: body,
          };
        } else {
          res.writeHead(200);
          data = handler[0](req);
        }
        res.end(JSON.stringify(data));
      };

      const requestListener = function (req, res) {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", () => {
          req.body = JSON.parse(body);
          onRequestEnd(req, res);
        });
      };

      self.server = http.createServer(requestListener);
      self.server.listen(port);
      logger.info(`Mock Server started on ${port}....`);
      return register;
    },
    callServer: async (path, method, auth_token, body) => {
      const endpoint = `${config.HOST || "http://localhost"}:${
        config.PORT || 3000
      }/api/v1/${auth_token ? "secured/" : ""}${path}`;
      logger.debug("Shooting", endpoint);
      return await pRequest({
        url: endpoint,
        method,
        headers: {
          "content-type": "application/json",
          authorization: ` Bearer ${auth_token}`,
        },
        body: JSON.stringify(body),
      });
    },
    login: (username, password, domain, client_id, client_secret) => {
      domain = domain || config.getContext("auth0.domain");
      client_id = client_id || config.getContext("auth0.clientId");
      client_secret = client_secret || config.getContext("auth0.clientSecret");
      const body = {
        grant_type: "password",
        username,
        password,
        audience: `https://${domain}/api/v2/`,
        scope: "openid profile email",
        client_id,
        client_secret,
      };
      //console.log(body)
      const options = {
        method: "POST",
        url: `https://${domain}/oauth/token`,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      };

      return pRequest(options).then((response) => {
        if (response.statusCode == 200) {
          const data = JSON.parse(response.body);
          logger.debug("Token:", data.access_token);
          return data.access_token;
        } else {
          logger.error("Failed to get the token", response.body);
        }
      });
    },
  };
  return self;
};
