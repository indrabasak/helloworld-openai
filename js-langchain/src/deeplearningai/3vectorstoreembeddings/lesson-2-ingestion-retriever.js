const { DefaultAzureCredential, getBearerTokenProvider } = require('@azure/identity');
const { AzureOpenAIEmbeddings } = require('@langchain/openai');
// Peer dependency
const parse = require('pdf-parse');
const { PDFLoader } = require('@langchain/community/document_loaders/fs/pdf');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { MemoryVectorStore } = require('langchain/vectorstores/memory');

require('dotenv').config();

async function main() {
    console.log('== Lesson 2 - Vectorstore & Embeddings: Ingestion and Retriever Example ==');

    const credential = new DefaultAzureCredential();
    const scope = 'https://cognitiveservices.azure.com/.default';
    const azureADTokenProvider = getBearerTokenProvider(credential, scope);

    const embeddings = new AzureOpenAIEmbeddings({
        azureADTokenProvider,
        azureOpenAIApiInstanceName:  process.env.AZURE_OPENAI_API_INSTANCE_NAME,
        azureOpenAIApiDeploymentName: 'text-embedding-ada-002-blue',
        azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    });
    const vectorstore = new MemoryVectorStore(embeddings);

    const loader = new PDFLoader('./data/MachineLearning-Lecture01.pdf');
    const rawCS229Docs = await loader.load();
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 128,
        chunkOverlap: 0,
    });
    const splitDocs = await splitter.splitDocuments(rawCS229Docs);
    await vectorstore.addDocuments(splitDocs);

    const retrievedDocs = await vectorstore.similaritySearch(
        'What is deep learning?',
        4
    );

    const pageContents = retrievedDocs.map(doc => doc.pageContent);

    const retriever = vectorstore.asRetriever();
    const result = await retriever.invoke('What is deep learning?');
    console.log(result);
}

main().catch((err) => {
    console.error('The sample encountered an error:', err);
});

module.exports = { main };