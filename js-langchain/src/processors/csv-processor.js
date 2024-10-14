/**
 * This is a working example of processing a CSV file.
 * This example is based on LLM + Spreadsheets
 * https://www.neum.ai/post/llm-spreadsheets
 *
 * @author Indra Basak
 * @since Oct 12, 2024
 */
const fs = require('fs');
const csv = require('csv-parser');
const { Document } = require('langchain/document');
const { Transform } = require('stream');
const { CharacterTextSplitter } = require('@langchain/textsplitters');
const { ClientSecretCredential, getBearerTokenProvider } = require('@azure/identity');
const { AzureOpenAIEmbeddings, AzureChatOpenAI } = require('@langchain/openai');
const { MemoryVectorStore } = require('langchain/vectorstores/memory');
const { AttributeInfo } = require('langchain/chains/query_constructor');
const { SelfQueryRetriever } = require('langchain/retrievers/self_query');
const { FunctionalTranslator } = require('@langchain/core/structured_query');
const { Chroma } = require('@langchain/community/vectorstores/chroma');
require('dotenv').config();

class StripBomStream extends Transform {
  constructor(options) {
    super(options);
    this.bomStripped = false;
  }

  _transform(chunk, encoding, callback) {
    if (!this.bomStripped) {
      if (chunk.length >= 3 &&
        chunk[0] === 0xEF &&
        chunk[1] === 0xBB &&
        chunk[2] === 0xBF) {
        chunk = chunk.slice(3);
      }
      this.bomStripped = true;
    }

    this.push(chunk);
    callback();
  }
}

async function getDocuments() {
  // define the columns we want to embed vs which ones we want in metadata
  const columnsToEmbed = ['Description', 'Features'];
  const columnsToMetadata = ['Product Name', 'Price', 'Rating', 'Description', 'Features'];
  const docs = [];

  // process the CSV into the embeddable content vs the
  // metadata and put it into Document format so that
  // we can chunk it into pieces.
  try {
    const readStream = fs.createReadStream('./data/TestListings.csv', { encoding: 'utf8' })
      .pipe(new StripBomStream())
      .pipe(csv());

    for await (const row of readStream) {
      // console.log(row); // Process each row of data here
      if (Object.keys(row).length !== 0) {
        const toMetadata = {};
        for (const col of columnsToMetadata) {
          toMetadata[col] = row[col];
        }

        const valuesToEmbed = {};
        for (const col of columnsToEmbed) {
          valuesToEmbed[col] = row[col];
        }
        // console.log(valuesToEmbed);

        let toEmbed = Object.entries(valuesToEmbed)
          .map(([key, value]) => `${key.trim()}: ${value.trim()}`)
          .join('\n');
        // console.log(toEmbed);
        let newDoc = new Document({ pageContent: toEmbed, metadata: toMetadata });
        // console.log(newDoc);
        docs.push(newDoc);
      }
    }
  } catch (error) {
    console.error('Error reading CSV file:', error);
  }

  return docs;
}

async function main() {
  console.log('== Example of processing a csv file ==');
  const docs = await getDocuments();
  // split a document using character splitting
  const splitter = new CharacterTextSplitter({
    separator: '\n',
    chunkSize: 500,
    chunkOverlap: 100
    // lengthFunction: len // len is not defined
  });
  const splitDocs = await splitter.splitDocuments(docs);

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
    azureOpenAIApiDeploymentName: 'text-embedding-ada-002-blue',
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION
  });

  const vectorStore = new MemoryVectorStore(embeddings);
  await vectorStore.addDocuments(splitDocs);

  // with Chroma DB
  // docker pull chromadb/chroma
  // docker run -p 8000:8000 chromadb/chroma
  // const vectorStore = new Chroma(embeddings, {
  //   collectionName: "a-test-collection",
  //   url: "http://localhost:8000", // Optional, will default to this value
  //   collectionMetadata: {
  //     "hnsw:space": "cosine",
  //   }, // Optional, can be used to specify the distance method of the embedding space https://docs.trychroma.com/usage-guide#changing-the-distance-function
  // });
  // await vectorStore.addDocuments(splitDocs);

  // Query the vector database for information.
  const query = 'Heart rate monitor';
  const similaritySearchResults = await vectorStore.similaritySearch(query);

  // for (const doc of similaritySearchResults) {
  //   console.log(`* ${doc.pageContent} [${JSON.stringify(doc.metadata, null)}]`);
  // }

  console.log(similaritySearchResults[0].pageContent);
  console.log(similaritySearchResults[0].metadata);

  // Advanced Querying
  // Metadata schema based on the values on the CSV
  const attributeInfo = [
    new AttributeInfo('Product Name', 'string', 'Name of the product'),
    new AttributeInfo ('Price', 'string', 'The price of the product as a number. Ex. 149.99'),
    new AttributeInfo('Rating', 'string', 'The rating of the product as a number from 0 to 5. Ex. 4.5'),
    new AttributeInfo('Description', 'string', 'Description of the product'),
    new AttributeInfo('Features', 'string', 'Features of the product'),
  ];

  // works also
  // const attributeInfo = [
  //   {
  //     name: 'Product Name',
  //     description: 'Name of the product',
  //     type:'string',
  //   },
  //   {
  //     name:'Price',
  //     description:'The price of the product as a number. Ex. 149.99',
  //     type:'string',
  //   },
  //   {
  //     name: 'Rating',
  //     description: 'The rating of the product as a number from 0 to 5. Ex. 4.5',
  //     type: 'string',
  //   },
  //   {
  //     name: 'Description',
  //     description: 'Description of the product',
  //     type: 'string'
  //   },
  //   {
  //     name: 'Features',
  //     description: 'Features of the product',
  //     type: 'string'
  //   },
  // ];
  const documentContents = 'Product listing';

  const llm = new AzureChatOpenAI({
    azureADTokenProvider,
    azureOpenAIApiInstanceName:  process.env.AZURE_OPENAI_API_INSTANCE_NAME,
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    temperature: 0
  });

  const retriever = SelfQueryRetriever.fromLLM({
    llm,
    vectorStore,
    documentContentDescription: documentContents,
    attributeInfo,
    structuredQueryTranslator: new FunctionalTranslator(),
  });

  console.log('-----------------------------------');
  const result = await retriever.invoke('good heart monitor');
  // for (const doc of result) {
  //   console.log(doc);
  // }

  console.log(result[0].pageContent);
  console.log(result[0].metadata);

}

main().catch((err) => {
  console.error('The sample encountered an error:', err);
});

module.exports = { main };