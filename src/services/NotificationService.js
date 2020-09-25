var logger = require("./LoggingService")("NotificationService");
const MQService = require("./MQService");

var NotificationService = (config) => {
  return {
    /**
     * Send email of whatever types
     * @param user
     * @param type invitation, parsing ongoing, parsed
     */
    sendEmail: function (user, type, context) {
      logger.info("SendEmail");
      var payload = {
        src: config.server.url,
        type: type,
        channel: "email",
        to: {
          email: user.email,
          name: user.name,
        },
        context: context,
      };
      MQService(config).push(payload, config.NOTFIFIER_QUEUE_NAME);
    },
  };
};

module.exports = NotificationService;
