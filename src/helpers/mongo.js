var MongoClient = require("mongodb").MongoClient;
module.exports = (MONGO_URL, logger) => {
  const self = {
    toBeCleaned: [],
    createDocument(collection, document, removedAfter) {
      return self._connectDatabase(collection).then((dbConn) => {
        logger.debug(
          `Creating ${document} in ${collection} to be removed ${removedAfter}`
        );
        return new Promise((resolve, reject) => {
          dbConn.dbCol.insertOne(document, (err, res) => {
            if (err) {
              reject(err);
              dbConn.db.close();
            } else {
              if (removedAfter) {
                self.toBeCleaned.push({
                  collection,
                  params: { _id: res.ops[0]._id },
                });
              }
              resolve(res);
              dbConn.db.close();
            }
          });
        });
      });
    },
    clean() {
      return Promise.all(
        self.toBeCleaned.map(async (element) => {
          await self.removeDocument(element.collection, element.params);
        })
      );
    },
    removeDocument(collection, query) {
      return self._connectDatabase(collection).then((dbConn) => {
        logger.debug("Removing", query, "from", collection);
        return new Promise((resolve, reject) => {
          dbConn.dbCol.deleteOne(query, (err, delOK) => {
            if (err) {
              reject(err);
              dbConn.db.close();
            } else {
              resolve(delOK);
              dbConn.db.close();
            }
          });
        });
      });
    },
    _connectDatabase(collection) {
      return new Promise((resolve, reject) => {
        const database = MONGO_URL.split("/").pop();
        MongoClient.connect(MONGO_URL, (err, db) => {
          if (err) {
            reject(err);
            db.close();
          } else {
            var dbo = db.db(database);
            logger.debug("Connected", MONGO_URL, "DB", database);
            resolve({ dbCol: dbo.collection(collection), db });
          }
        });
      });
    },
  };
  return self;
};
