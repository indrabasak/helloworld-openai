const { readFileSync } = require('fs');
const { Document } = require('langchain/document');
const { CharacterTextSplitter } = require('@langchain/textsplitters');
const { ClientSecretCredential, getBearerTokenProvider } = require('@azure/identity');
const { AzureOpenAIEmbeddings, AzureChatOpenAI } = require('@langchain/openai');
const { MemoryVectorStore } = require('langchain/vectorstores/memory');
const { AttributeInfo } = require('langchain/chains/query_constructor');
const { SelfQueryRetriever } = require('langchain/retrievers/self_query');
const { FunctionalTranslator } = require('@langchain/core/structured_query');
const { RunnableSequence } = require('@langchain/core/runnables');

async function getDocuments() {
  const docs = [];
  const data = readFileSync('./data/logs-02.json', 'utf8');
  const logItems = JSON.parse(data);
  // console.log(logItems);

  for (const item of logItems) {
    // console.log(item);
    if ('metadata' in item) {
      console.log('++++++++ metadata present');
      const {metadata} = item;
      let toEmbed = Object.entries(metadata)
        .map(([key, value]) => `${key.trim()}: ${value.trim()}`)
        .join('\n');
      // console.log(toEmbed);
      let pld = {};
      if ('event' in item) {
        const { event } = item;
        if ('payload' in event) {
          const { payload } = event;
          pld = payload;
        }
      }

      // let newDoc = new Document({ pageContent: toEmbed, metadata: pld });
      let newDoc = new Document({ pageContent: toEmbed });
      console.log(newDoc);
      docs.push(newDoc);
    } else {
      console.log('-------- metadata not present');
    }
  }

  return docs;
}

async function main() {
  console.log('== Example of custom processing a JSON file ==');
  const docs = await getDocuments();
  // split a document using character splitting
  const splitter = new CharacterTextSplitter({
    separator: '\n',
    chunkSize: 500,
    chunkOverlap: 100
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

  // Query the vector database for information.
  // const query = 'Is there a sage id which has a value of cbe3a8ae-036c-41c6-8fc4-e5c32007ca0a?';
  const query = 'sage id 1234';
  const similaritySearchResults = await vectorStore.similaritySearch(query);

  // for (const doc of similaritySearchResults) {
  //   console.log(`* ${doc.pageContent} [${JSON.stringify(doc.metadata, null)}]`);
  // }

  console.log('1 **************************');
  console.log(similaritySearchResults[0].pageContent);
  console.log(similaritySearchResults[0].metadata);

  console.log('2 **************************');
  const ssResults = await vectorStore.similaritySearch('indra');
  console.log(ssResults[0].pageContent);

  // const similaritySearchWithScoreResults = await vectorStore.similaritySearchWithScore(query);
  // for (const [doc, score] of similaritySearchWithScoreResults) {
  //   console.log(
  //     `* [SIM=${score.toFixed(3)}] ${doc.pageContent} [${JSON.stringify(
  //       doc.metadata
  //     )}]`
  //   );
  // }

  // const similaritySearchVectorWithScoreResults = await vectorStore.similaritySearchVectorWithScore(query, 1);

  // const retriever = vectorStore.asRetriever();

  // Document retrieval in a chain
  // const convertDocsToString = (documents)  => {
  //   return documents.map((document) => {
  //     return `<doc>\n${document.pageContent}\n</doc>`;
  //   }).join('\n');
  // };

  // {
  //     question: "What is deep learning?"
  // }
  // const documentRetrievalChain = RunnableSequence.from([
  //   (input) => input.question,
  //   retriever,
  //   convertDocsToString
  // ]);
  //
  // let results = await documentRetrievalChain.invoke({
  //   question: 'Is there a sage-id with value of cbe3a8ae-036c-41c6-8fc4-e5c32007ca0a?'
  // });
  // console.log(results);
  //
  // results = await documentRetrievalChain.invoke({
  //   question: 'Is there a sage-id with value of xxxxx?'
  // });
  // console.log(results);
  //
  // results = await documentRetrievalChain.invoke({
  //   question: 'Is there a idiot with value of xxxxx?'
  // });
  // console.log(results);
  //
  // console.log('&&&&&&&&&&&&&&&&&&&&&&&');
  // results = await documentRetrievalChain.invoke({
  //   question: 'Have you seen Indra?'
  // });
  // console.log(results);
}

main().catch((err) => {
  console.error('The sample encountered an error:', err);
});

module.exports = { main };