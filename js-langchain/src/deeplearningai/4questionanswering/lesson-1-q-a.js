const { DefaultAzureCredential, getBearerTokenProvider } = require('@azure/identity');
const { AzureOpenAIEmbeddings } = require('@langchain/openai');
// Peer dependency
const parse = require('pdf-parse');
const { PDFLoader } = require('@langchain/community/document_loaders/fs/pdf');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { MemoryVectorStore } = require('langchain/vectorstores/memory');
const { RunnableSequence } = require('@langchain/core/runnables');

require('dotenv').config();

async function main() {
    console.log('== Lesson 1 - Question & Answering: Example ==');

    const credential = new DefaultAzureCredential();
    const scope = 'https://cognitiveservices.azure.com/.default';
    const azureADTokenProvider = getBearerTokenProvider(credential, scope);

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1536,
        chunkOverlap: 128
    });

    const loader = new PDFLoader('./data/MachineLearning-Lecture01.pdf');
    const rawCS229Docs = await loader.load();
    const splitDocs = await splitter.splitDocuments(rawCS229Docs);

    const embeddings = new AzureOpenAIEmbeddings({
        azureADTokenProvider,
        azureOpenAIApiInstanceName:  process.env.AZURE_OPENAI_API_INSTANCE_NAME,
        azureOpenAIApiDeploymentName: 'text-embedding-ada-002-blue',
        azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    });
    const vectorstore = new MemoryVectorStore(embeddings);
    await vectorstore.addDocuments(splitDocs);
    const retriever = vectorstore.asRetriever();

    // Document retrieval in a chain
    const convertDocsToString = (documents)  => {
        return documents.map((document) => {
            return `<doc>\n${document.pageContent}\n</doc>`;
        }).join('\n');
    };

    // {
    //     question: "What is deep learning?"
    // }
    const documentRetrievalChain = RunnableSequence.from([
        (input) => input.question,
        retriever,
        convertDocsToString
    ]);

    let results = await documentRetrievalChain.invoke({
        question: 'What are the prerequisites for this course?'
    });
    console.log(results);

    console.log('*****************************');
    results = await documentRetrievalChain.invoke({
        question: 'What is deep learning?'
    });
}

main().catch((err) => {
    console.error('The sample encountered an error:', err);
});

module.exports = { main };