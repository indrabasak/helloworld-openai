const { MilvusClient, DataType } = require('@zilliz/milvus2-sdk-node');
const { ClientSecretCredential, getBearerTokenProvider } = require('@azure/identity');
const { AzureOpenAIEmbeddings } = require('@langchain/openai');
const { v4: uuidv4 } = require('uuid');

const address = 'localhost:19530';
const collection_name = 'test_indra';

async function initConnection() {
  // connect to milvus
  // const client = new MilvusClient({ address, username, password });
  const client = new MilvusClient({ address });
  // wait until connecting finished
  await client.connectPromise;

  return client;
}

async function createCollection(client) {
  console.log('1+++++++++++++++ createCollection');
  const dim = 128;
  // error - 'the length(1536) of float data should divide the dim(2048)'
  const schema = [
    {
      name: 'id',
      description: 'id field',
      data_type: DataType.Int64,
      autoID: true,
      is_primary_key: true
    },
    {
      name: 'vector',
      description: 'Vector field for storing embeddings',
      data_type: DataType.FloatVector,
      dim: 1536
    },
    {
      name: 'event',
      description: 'JSON field for storing event',
      data_type: DataType.JSON
    }
  ];

  const result = await client.hasCollection({ collection_name: collection_name });
  console.log(result);
  console.log('1b+++++++++++++++ createCollection');
  if (!result.value) {
    console.log(`creating collection as ${collection_name} does not exists.`);
    await client.createCollection({
      collection_name,
      fields: schema,
      dimension: 6144
    });

    // create index
    await client.createIndex({
      collection_name: collection_name,
      index_type: 'IVF_FLAT',
      metric_type: 'L2',
      field_name: 'vector',
      index_name: 'vector_index',
      params: { nlist: 128 }
    });
  } else {
    console.log(`not creating collection as ${collection_name} exists.`);
  }

  console.log('1e+++++++++++++++ createCollection');
  // load collection
  // await client.loadCollectionSync({
  //   collection_name: collection_name
  // });
  // await client.flush();

  const res = await client.getLoadState({
    collection_name
  });

  console.log(res.state);
}

async function insertData(client, vector, event) {
  console.log('+++++++++++++++ insert');
  // const data = [{
  //   vector: vector,
  //   event: event
  // }];
  // await milvusClient.search(params)
  const data = [{
    vector: vector,
    event: event
  }];
  const result = await client.insert({
    collection_name,
    data
  });

  console.log(result);
}

async function search(client, searchVector) {
  console.log('+++++++++++++++ search');
  await client.loadCollection({collection_name});

  const params = {
    'collection_name': collection_name,
    'output_fields': [
      'id',
      'event'
    ],
    'limit': 1,
    'data': [
      {
        'anns_field': 'vector',
        'data': searchVector,
        'params': {
          // Number of units to query during the search.The value falls in the range [1, nlist[1]].
          'nprobe': 10,

          // How to measure similarity between vector embeddings.
          // Possible values are IP, L2, COSINE, JACCARD, and HAMMING, and defaults to that of the loaded index file.
          'metric_type': 'L2',

          // Search precision level.
          // Possible values are 1, 2, and 3, and defaults to 1.
          // Higher values yield more accurate results but slower performance.
          'radius': 3.0
        }
      }
    ],
    'filter': '',
    'consistency_level': 'Strong'
  };
  // console.log(searchVector);
  // const res = await client.search({
  //   collection_name,
  //   data: searchVector,
  //   params: { nprobe: 10, metric_type: 'L2' },
  //   limit: 1 // optional, specify the number of nearest neighbors to return
  // });

  const res = await client.search(params);

  console.log(JSON.stringify(res));
}

async function main() {
  const client = await initConnection();
  // console.log(client);
  await createCollection(client);

  const sageId = uuidv4();
  const payloadId = uuidv4();
  console.log(`sageId: ${sageId}`);
  console.log(`payloadId: ${payloadId}`);

  const metadata = {
    'event-id': '44fd608a-8928-766b-644c-901bc6b8fbef',
    'payload-id': sageId,
    rule: 'rule-default',
    // 'sage-id': sageId,
    id: sageId,
    'span-id': 'fb1666bcca23029c',
    state: 'DATABASE_OPERATION',
    'trace-id': '008bf4837f5c9cbbb334b3b46320b79b'
  };

  const event = {
    datacontenttype: 'application/json',
    id: sageId,
    isPoorEvent: false,
    source: 'urn:adsk.ece:moniker:PELICAN-ORD',
    specversion: '1.0',
    subject: 'urn:adsk.ece:order:1003147387',
    time: '2024-10-12T00:35:36.284Z',
    tracebaggage: '00-008bf4837f5c9cbbb334b3b46320b79b-fb1666bcca23029c-01',
    traceparent: '00-008bf4837f5c9cbbb334b3b46320b79b-fb1666bcca23029c-01',
    'tracerId': '',
    tracestate: 'ed83d9c3-4d8a8643@dt=fw4;0;0;0;0;0;0;9b;d5bb;2h01;5h01;7h9d7c94f7ebf640a0',
    type: 'adsk.ece:order.updated-1.0.0',
    data: {
      firstName: 'John',
      lastName: 'Doe'
    }
  };

  const credential =
    new ClientSecretCredential(process.env.AZURE_TENANT_ID,
      process.env.AZURE_CLIENT_ID,
      process.env.AZURE_CLIENT_SECRET,
      {
        authorityHost: process.env.AZURE_AUTHORITY_HOST
      }
    );
  const scope = 'https://cognitiveservices.azure.com/.default';
  const azureADTokenProvider = getBearerTokenProvider(credential, scope);

  const embeddings = new AzureOpenAIEmbeddings({
    azureADTokenProvider,
    azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
    // azureOpenAIApiDeploymentName: 'text-embedding-ada-002-blue',
    azureOpenAIApiEmbeddingsDeploymentName: 'text-embedding-ada-002-blue',
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
   // chunkSize: 16
  });

  const text = JSON.stringify(metadata);
  const vector = await embeddings.embedQuery(text);
  await insertData(client, vector, event);

  const query = `What is the event for id ${sageId}?`;
  const queryVector = await embeddings.embedQuery(query);
  await search(client, queryVector);
}

main().catch((err) => {
  console.error('The sample encountered an error:', err);
});

module.exports = { main };