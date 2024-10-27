const { MongoClient } = require('mongodb');

class MongoUtil {
  constructor(host, port, queryStr, dbName, certPath, user, pwd) {
    this.dbName = dbName;
    const userNameEncoded = encodeURIComponent(user);
    const pwdEncoded = encodeURIComponent(pwd);
    this.url = `mongodb://${userNameEncoded}:${pwdEncoded}@${host}:${port}?${queryStr}&tlsCAFile=${certPath}`;
  }

  async connect() {
    this.client = await MongoClient.connect(this.url, {
      useNewUrlParser: true
    });
    await this.client.connect();
    this.db = await this.client.db(this.dbName);
  }

  async aggregate(collection, pipeline) {
    return this.db.collection(collection).aggregate(pipeline);
  }

  async aggregateResultAsArray(collection, pipeline) {
    const result = [];
    try {
      console.log(pipeline);
      let jsonPipeline = pipeline;
      if (typeof pipeline !== 'object') {
        console.log('#############################');
        jsonPipeline = JSON.parse(pipeline);
      }

      const cursor = await this.db.collection(collection).aggregate(jsonPipeline);
      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        result.push(doc);
      }
    } catch (e) {
      console.log(e);
      console.log('Encountered error while retrieving results');
    }

    return result;
  }

  async close(client) {
    await this.client.close();
  }

  isJSONObject(obj) {
    try {
      JSON.parse(obj);
      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  }
}

module.exports = { MongoUtil };