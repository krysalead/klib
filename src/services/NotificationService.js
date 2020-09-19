var logger = require("./LoggingService")("NotificationService");
var amqp = require("amqplib/callback_api");

var NotificationService = (config) => {
  return {
    /**
     * Send email of whatever types
     * @param user
     * @param type invitation, parsing ongoing, parsed
     */
    sendEmail: function (user, type, context) {
      logger.info("SendEmail");
      amqp.connect(config.NOTFIFIER_MQ_SERVER, function (err, conn) {
        if (err) {
          logger.error(
            "Fail to connect to " + config.NOTFIFIER_MQ_SERVER + " " + err
          );
          return;
        }
        conn.createChannel(function (err, ch) {
          var payload = {
            src: configHelper.getContext("server.url"),
            type: type,
            channel: "email",
            from: {
              email: configHelper.getContext("mail.senderEmail"),
              name: configHelper.getContext("mail.senderName"),
            },
            to: {
              email: user.email,
              name: user.name,
            },
            context: context,
          };
          ch.assertQueue(config.NOTFIFIER_MQ_SERVER, { durable: false });
          // Note: on Node 6 Buffer.from(msg) should be used
          ch.sendToQueue(
            config.NOTFIFIER_MQ_SERVER,
            new Buffer(JSON.stringify(payload))
          );
          logger.info("Sent to queue for ", [user.email, type]);
          setTimeout(function () {
            conn.close();
          }, 500);
        });
      });
    },
  };
};

module.exports = NotificationService;
