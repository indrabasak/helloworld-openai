const { DefaultAzureCredential, getBearerTokenProvider } = require('@azure/identity');
const { AzureOpenAIEmbeddings, AzureChatOpenAI } = require('@langchain/openai');
// Peer dependency
const parse = require('pdf-parse');
const { PDFLoader } = require('@langchain/community/document_loaders/fs/pdf');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { MemoryVectorStore } = require('langchain/vectorstores/memory');
const { RunnableSequence, RunnableMap } = require('@langchain/core/runnables');
const { ChatPromptTemplate, MessagesPlaceholder } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { HumanMessage, AIMessage } = require('@langchain/core/messages');


require('dotenv').config();

async function main() {
  console.log('== Lesson 1 - Conversational Question & Answering Example ==');

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
    azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
    azureOpenAIApiDeploymentName: 'text-embedding-ada-002-blue',
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
  });
  const vectorstore = new MemoryVectorStore(embeddings);
  await vectorstore.addDocuments(splitDocs);
  const retriever = vectorstore.asRetriever();

  // Document retrieval in a chain
  const convertDocsToString = (documents) => {
    return documents.map((document) => {
      return `<doc>\n${document.pageContent}\n</doc>`;
    }).join('\n');
  };

  const documentRetrievalChain = RunnableSequence.from([
    (input) => input.question,
    retriever,
    convertDocsToString
  ]);

  // example - Synthesizing a response
  const TEMPLATE_STRING = `You are an experienced researcher, 
         expert at interpreting and answering questions based on provided sources.
         Using the provided context, answer the user's question 
         to the best of your ability using only the resources provided. 
         Be verbose!

         <context>

            {context}

         </context>

         Now, answer this question using the above context:

         {question}`;

  const answerGenerationPrompt
    = ChatPromptTemplate.fromTemplate(TEMPLATE_STRING);
  console.log(answerGenerationPrompt);

  const runnableMap = RunnableMap.from({
    context: documentRetrievalChain,
    question: (input) => input.question,
  });

  let results = await runnableMap.invoke({
    question: 'What are the prerequisites for this course?'
  });
  console.log(results);

  // Augmented generation
  const model = new AzureChatOpenAI({
    azureADTokenProvider,
    azureOpenAIApiInstanceName:  process.env.AZURE_OPENAI_API_INSTANCE_NAME,
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    temperature: 0.1
  });

  const retrievalChain = RunnableSequence.from([
    {
      context: documentRetrievalChain,
      question: (input) => input.question,
    },
    answerGenerationPrompt,
    model,
    new StringOutputParser(),
  ]);

  const REPHRASE_QUESTION_SYSTEM_TEMPLATE =
    `Given the following conversation and a follow up question, 
rephrase the follow up question to be a standalone question.`;

  const rephraseQuestionChainPrompt = ChatPromptTemplate.fromMessages([
    ['system', REPHRASE_QUESTION_SYSTEM_TEMPLATE],
    new MessagesPlaceholder('history'),
    [
      'human',
      'Rephrase the following question as a standalone question:\n{question}'
    ],
  ]);

  const rephraseQuestionChain = RunnableSequence.from([
    rephraseQuestionChainPrompt,
    // new ChatOpenAI({ temperature: 0.1, modelName: "gpt-3.5-turbo-1106" }),
    model,
    new StringOutputParser(),
  ]);

  const originalQuestion = 'What are the prerequisites for this course?';

  const originalAnswer = await retrievalChain.invoke({
    question: originalQuestion
  });

  console.log(originalAnswer);

  // adding history
  const chatHistory = [
    new HumanMessage(originalQuestion),
    new AIMessage(originalAnswer),
  ];

  const followupAnswer = await rephraseQuestionChain.invoke({
    question: 'Can you list them in bullet point form?',
    history: chatHistory,
  });

  console.log(followupAnswer);
}

main().catch((err) => {
  console.error('The sample encountered an error:', err);
});

module.exports = { main };