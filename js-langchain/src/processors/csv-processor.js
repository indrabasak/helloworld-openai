const fs = require('fs');
const csv = require('csv-parser');
const { Document } = require('langchain/document');
const { Transform } = require('stream');
const { CharacterTextSplitter } = require('@langchain/textsplitters');
const { ClientSecretCredential, getBearerTokenProvider } = require('@azure/identity');
const { AzureOpenAIEmbeddings } = require('@langchain/openai');
const { MemoryVectorStore } = require('langchain/vectorstores/memory');
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

async function main() {
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
        // console.log('----' + docs.length);
      }
    }
  } catch (error) {
    console.error('Error reading CSV file:', error);
  }
  // const docs= new Promise((resolve, reject) => {
  //   const docsArray = [];
  //   fs.createReadStream('./data/TestListings.csv', { encoding: 'utf8' })
  //     .pipe(new StripBomStream())
  //     .pipe(csv({ skip_empty_lines: true }))
  //     .on('data', (row) => {
  //       // console.log(row); // Process each row of data here
  //       if (Object.keys(row).length !== 0) {
  //         const toMetadata = {};
  //         for (const col of columnsToMetadata) {
  //           toMetadata[col] = row[col];
  //         }
  //
  //         const valuesToEmbed = {};
  //         for (const col of columnsToEmbed) {
  //           valuesToEmbed[col] = row[col];
  //         }
  //         // console.log(valuesToEmbed);
  //
  //         let toEmbed = Object.entries(valuesToEmbed)
  //           .map(([key, value]) => `${key.trim()}: ${value.trim()}`)
  //           .join('\n');
  //         // console.log(toEmbed);
  //         let newDoc = new Document({ pageContent: toEmbed, metadata: toMetadata});
  //         // console.log(newDoc);
  //         docsArray.push(newDoc);
  //         console.log('----' + docs.length);
  //       }
  //     })
  //     .on('end', () => {
  //       resolve(docsArray);
  //       console.log('CSV file successfully processed');
  //     });
  // });
  // fs.createReadStream('./data/TestListings.csv', { encoding: 'utf8' })
  // .pipe(new StripBomStream())
  // .pipe(csv({ skip_empty_lines: true }))
  // .on('data', (row) => {
  //   // console.log(row); // Process each row of data here
  //   if (Object.keys(row).length !== 0) {
  //     const toMetadata = {};
  //     for (const col of columnsToMetadata) {
  //       toMetadata[col] = row[col];
  //     }
  //
  //     const valuesToEmbed = {};
  //     for (const col of columnsToEmbed) {
  //       valuesToEmbed[col] = row[col];
  //     }
  //     // console.log(valuesToEmbed);
  //
  //     let toEmbed = Object.entries(valuesToEmbed)
  //       .map(([key, value]) => `${key.trim()}: ${value.trim()}`)
  //       .join('\n');
  //     // console.log(toEmbed);
  //     let newDoc = new Document({ pageContent: toEmbed, metadata: toMetadata});
  //     // console.log(newDoc);
  //     docs.push(newDoc);
  //     console.log('----' + docs.length);
  //   }
  // })
  // .on('end', () => {
  //   console.log('CSV file successfully processed');
  // });

  // console.log(docs);
  // split a document using character splitting
  const splitter = new CharacterTextSplitter({
    separator: '\n',
    chunkSize: 500,
    chunkOverlap: 100
    // lengthFunction: len // len is not defined
  });
  const splitDocs = await splitter.splitDocuments(docs);
  // console.log(splitDocs);

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

  // Query the vector database for information.
  const query = 'Heart rate monitor';
  const similaritySearchResults = await vectorStore.similaritySearch(query);

  // for (const doc of similaritySearchResults) {
  //   console.log(`* ${doc.pageContent} [${JSON.stringify(doc.metadata, null)}]`);
  // }

  console.log(similaritySearchResults[0].pageContent);
  console.log(similaritySearchResults[0].metadata);
}

main().catch((err) => {
  console.error('The sample encountered an error:', err);
});

module.exports = { main };