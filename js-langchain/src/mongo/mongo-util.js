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
        // jsonPipeline = JSON.parse(pipeline);
        // jsonPipeline = this.customJsonParser(pipeline);
        // jsonPipeline = this.stripEscapedDoubleQuotes(pipeline);
        // jsonPipeline = this.stripEscapedCharacters(pipeline);
        jsonPipeline = eval(pipeline);
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

  stripEscapedCharacters(input) {
    // Use regular expression to match escaped characters
    return input.replace(/\\./g, '');
  }

  stripEscapedDoubleQuotes(input) {
    // Use regular expression to match escaped double quotes
    return input.replace(/\"/g, '');
  }

  customJsonParser(jsonString) {
    // Define regex to match both new Date(...) patterns
    const dateRegex = /new Date\(([^)]*)\)/g;
    const staticDateRegex = /new Date\("([^\"]+)"\)/g;

    // Replace the new Date(...) pattern with a placeholder
    let parsedString = jsonString.replace(staticDateRegex, (match, p1) => {
      return `"__DATE__${p1}__DATE__"`;
    });

    // Replace the new Date(...) pattern with a placeholder
    parsedString = parsedString.replace(dateRegex, (match, p1) => {
      return `"__DATE_EXPR__${p1}__DATE_EXPR__"`;
    });

    // Parse the JSON string
    const parsedJson = JSON.parse(parsedString, (key, value) => {
      // Check if the value is a static date placeholder
      if (typeof value === 'string' && value.startsWith('__DATE__') && value.endsWith('__DATE__')) {
        const dateString = value.slice(8, -8);
        return new Date(dateString);
      }
      // Check if the value is a dynamic date expression placeholder
      if (typeof value === 'string' && value.startsWith('__DATE_EXPR__') && value.endsWith('__DATE_EXPR__')) {
        const dateExpression = value.slice(13, -13);
        // Evaluate the date expression to get the Date object
        return eval(`new Date(${dateExpression})`);
      }
      return value;
    });

    return parsedJson;
  }
}

module.exports = { MongoUtil };