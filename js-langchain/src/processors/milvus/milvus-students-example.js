const { MilvusClient, DataType } = require('@zilliz/milvus2-sdk-node');
const { ClientSecretCredential, getBearerTokenProvider } = require('@azure/identity');
const { AzureOpenAIEmbeddings } = require('@langchain/openai');
const { v4: uuidv4 } = require('uuid');

const address = 'localhost:19530';
const collection_name = 'students';

async function initConnection() {
  const client = new MilvusClient({ address });
  await client.connectPromise;

  return client;
}

async function createCollection(client) {
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
      name: 'data',
      description: 'JSON field for storing raw data',
      data_type: DataType.JSON
    }
  ];

  const result = await client.hasCollection({ collection_name: collection_name });
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

  await client.loadCollection({collection_name});
}

async function insert(client, vector, rawData) {
  const data = [{
    vector: vector,
    data: rawData
  }];
  const result = await client.insert({
    collection_name,
    data
  });

  console.log(result);
}

async function search(client, searchVector) {
const params = {
    'collection_name': collection_name,
    'output_fields': [
      'id',
      'data'
    ],
    //'limit': 1,
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

  const res = await client.search(params);

  console.log(JSON.stringify(res));
}

async function main() {
  const client = await initConnection();
  // console.log(client);
  await createCollection(client);

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

  const students = [
    {
      firstName: 'John',
      lastName: 'Doe',
      city: 'Portland',
      gpa: 3.5
    },
    {
      firstName: 'John',
      lastName: 'Sullivan',
      city: 'Seattle',
      gpa: 3.6
    },
    {
      firstName: 'Jane',
      lastName: 'Smith',
      city: 'Portland',
      gpa: 4.0
    },
    {
      firstName: 'Sarah',
      lastName: 'Doe',
      city: 'Los Angeles',
      gpa: 3.6
    },
  ];

  for (const student of students) {
    const text = JSON.stringify(student);
    const vector = await embeddings.embedQuery(text);
    await insert(client, vector, student);
  }

  let query = 'How many students have firstName John?';
  console.log('===================');
  console.log(query);
  let queryVector = await embeddings.embedQuery(query);
  await search(client, queryVector);

  query = 'How many students have lastName Doe?';
  console.log('===================');
  console.log(query);
  queryVector = await embeddings.embedQuery(query);
  await search(client, queryVector);

  query = 'How many students live in Portland?';
  console.log('===================');
  console.log(query);
  queryVector = await embeddings.embedQuery(query);
  await search(client, queryVector);

  query = 'How many students live in Seattle?';
  console.log('===================');
  console.log(query);
  queryVector = await embeddings.embedQuery(query);
  await search(client, queryVector);

  query = 'Name the students who have gpa over 3.6?';
  console.log('===================');
  console.log(query);
  queryVector = await embeddings.embedQuery(query);
  await search(client, queryVector);
}

main().catch((err) => {
  console.error('The sample encountered an error:', err);
});

module.exports = { main };