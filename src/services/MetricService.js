import { InfluxDB, Point } from "@influxdata/influxdb-client";

module.exports = (config) => {
  let counter = 0;
  const influxInstance = new InfluxDB({
    url: configService.getConfig().metric.url,
    token: configService.getConfig().metric.token,
  });
  const writeApi = influxInstance.getWriteApi(
    "8e23967877953738",
    configService.getConfig().metric.bucket
  );
  const queryApi = influxInstance.getQueryApi("8e23967877953738");

  const self = {
    push(type, name, value, tag, tagValue) {
      const dataPoint = new Point(type);
      if (tag != undefined && tagValue != undefined) {
        dataPoint.tag(tag, tagValue);
      }
      if (name != undefined && value != undefined && isFloat(value)) {
        dataPoint.floatField(name, value);
      } else {
        dataPoint.stringField(name, value);
      }

      this.writeApi.writePoint(dataPoint);
      logger.debug(`Sent point: ${dataPoint}`);
      this.counter++;
      if (this.counter > 10) {
        this.counter = 0;
        this.writeApi.flush();
      }
    },

    flush() {
      return this.writeApi
        .close()
        .then(() => {
          logger.info("Closing Influx DB");
        })
        .catch((e) => {
          logger.error("failure to close influx db", e);
        });
    },

    query(type, name, value, raneStart, rangeStop, tag, tagValue) {
      logger.info("Start query");
      let fluxQuery = `from(bucket:"${
        this.configService.getConfig().metric.bucket
      }") |> range(start: ${rangeStart}, stop:${rangeStop}) |> filter(fn: (r) => r._measurement == "${type}")`;
      if (tag) {
        fluxQuery += ` |> filter(fn: (r) => r.${tag} == "${tagValue}")`;
      }
      logger.debug(`fluxQuery: ${fluxQuery}`);
      logger.info("End query");
      return new Promise((resolve, reject) => {
        let data = [];
        this.queryApi.queryRows(fluxQuery, {
          next(row, tableMeta) {
            data.push(tableMeta.toObject(row));
          },
          error(error) {
            logger.error("query Finished with ERROR", error);
            reject(error);
          },
          complete() {
            logger.debug("query Finished with SUCCESS");
            resolve(
              data.map((m) => {
                delete m.result;
                delete m._start;
                delete m._stop;
                delete m.table;
                delete m._measurement;
                if (tag) {
                  delete m[tag];
                }

                return m;
              })
            );
          },
        });
      });
    },
  };
  return self;
};
