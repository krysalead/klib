const amqp = require("amqplib/callback_api");
const logger = require("./LoggingService")("MQService");
const CLSService = require("./CLSService");

module.exports = function (config) {
  if (config.AMQSERVER == undefined) {
    throw "Need to have an env variable AMQSERVER";
  }
  const self = {
    channel: null,
    connection: null,
    _init: () => {
      return self._getConnection(config.AMQSERVER).then(self._getChannel);
    },
    close: () => {
      self.connection && self.connection.close();
    },
    _getConnection: (server) => {
      return new Promise((resolve, reject) => {
        if (self.connection) {
          resolve(self.connection);
        } else {
          logger.debug("connecting to server", server);
          amqp.connect(server, function (err, conn) {
            if (err) {
              logger.error("Failed to connect", err);
              reject(err);
            } else {
              logger.info("connected to server", server);
              self.connection = conn;
              resolve(conn);
            }
          });
        }
      });
    },
    _getChannel: (connection) => {
      return new Promise((resolve, reject) => {
        if (self.channel) {
          resolve(self.channel);
        } else {
          logger.debug("Create channel");
          connection.createChannel(function (err, ch) {
            if (err) {
              logger.error("Failed to create Channel", err);
              reject(err);
            } else {
              logger.info("Channel created");
              self.channel = ch;
              resolve(ch);
            }
          });
        }
      });
    },
    handle: (handler, queue) => {
      return self._init().then((ch) => {
        logger.info("Waiting for messages in " + queue);
        ch.consume(
          queue,
          CLSService.wrap((msg) => {
            var payload = JSON.parse(msg.content.toString());
            CLSService.set("reqId", payload["x-transaction-id"]);
            if (payload.src == undefined) {
              logger.error("Failed to identify sender", msg.content);
            } else {
              handler(payload);
            }
          }),
          {
            noAck: true,
          }
        );
      });
    },
    push: (payload, queue) => {
      return self._init().then((ch) => {
        ch.assertQueue(queue, { durable: false });
        // Note: on Node 6 Buffer.from(msg) should be used
        ch.sendToQueue(queue, Buffer.from(JSON.stringify(payload)));
        logger.info(" [x] Sent ", payload);
      });
    },
  };
  process.on("SIGTERM", () => {
    console.info("SIGTERM signal received.");
    self.close();
  });
  process.on("SIGINT", () => {
    console.info("SIGINT signal received.");
    self.close();
  });
  return self;
};
