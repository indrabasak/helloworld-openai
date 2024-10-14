const { getBearerTokenProvider, ClientSecretCredential } = require('@azure/identity');
const { AzureOpenAIEmbeddings, AzureChatOpenAI } = require('@langchain/openai');
// Peer dependency
const parse = require('pdf-parse');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { MemoryVectorStore } = require('langchain/vectorstores/memory');
const { RunnableSequence, RunnableMap, RunnablePassthrough, RunnableWithMessageHistory } = require('@langchain/core/runnables');
const { ChatPromptTemplate, MessagesPlaceholder } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { HumanMessage, AIMessage } = require('@langchain/core/messages');
const { ChatMessageHistory } = require('langchain/memory');
const { JSONLoader } = require('langchain/document_loaders/fs/json');
const { UnstructuredLoader } = require('@langchain/community/document_loaders/fs/unstructured');
const { Document }  = require('langchain/document');
const { readFileSync } = require('fs');

require('dotenv').config();

async function main() {
  console.log('== Lesson 2 - Conversational Question & Answering Example - Pulling Together ==');

  // const credential = new DefaultAzureCredential();
  const credential =
    new ClientSecretCredential(process.env.AZURE_TENANT_ID,
      process.env.AZURE_CLIENT_ID,
      process.env.AZURE_CLIENT_SECRET,
      {
        authorityHost: process.env.AZURE_AUTHORITY_HOST,
      }
    );
  const scope = 'https://cognitiveservices.azure.com/.default';
  const azureADTokenProvider = getBearerTokenProvider(credential, scope);

  const splitter = new RecursiveCharacterTextSplitter({
    // chunkSize: 1536,
    chunkSize: 16,
    chunkOverlap: 5
    // chunkOverlap: 128
  });

  // const loader = new JSONLoader('./data/logs-01.json');
  const loader = new JSONLoader('./data/logs-01.json', ['/sage-id', '/meta/rule']);
  // const loader = new UnstructuredLoader('./data/logs-01.json');
  const rawLog = await loader.load();
  console.log(rawLog);
  // const splitDocs = await splitter.splitDocuments(rawLog);

  // const data = readFileSync('./data/logs-01.json', 'utf8');
  // const jsonData = JSON.parse(data);
  // const docs = [
  //   new Document({ pageContent: jsonData})
  // ];
  // console.log(docs);

  const embeddings = new AzureOpenAIEmbeddings({
    azureADTokenProvider,
    azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
    azureOpenAIApiDeploymentName: 'text-embedding-ada-002-blue',
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
  });
  const vectorstore = new MemoryVectorStore(embeddings);
  // await vectorstore.addDocuments(splitDocs);
  // await vectorstore.addDocuments(docs);
  await vectorstore.addDocuments(rawLog);
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
  // const TEMPLATE_STRING = `You are an experienced researcher,
  //        expert at interpreting and answering questions based on provided sources.
  //        Using the provided context, answer the user's question
  //        to the best of your ability using only the resources provided.
  //        Be verbose!
  //
  //        <context>
  //
  //           {context}
  //
  //        </context>
  //
  //        Now, answer this question using the above context:
  //
  //        {question}`;
  //
  // const answerGenerationPrompt
  //   = ChatPromptTemplate.fromTemplate(TEMPLATE_STRING);
  // console.log(answerGenerationPrompt);
  //
  // const runnableMap = RunnableMap.from({
  //   context: documentRetrievalChain,
  //   question: (input) => input.question,
  // });

  // let results = await runnableMap.invoke({
  //   question: 'What are the prerequisites for this course?'
  // });
  // console.log(results);

  // Augmented generation
  const model = new AzureChatOpenAI({
    azureADTokenProvider,
    azureOpenAIApiInstanceName:  process.env.AZURE_OPENAI_API_INSTANCE_NAME,
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    temperature: 0
  });

  // const retrievalChain = RunnableSequence.from([
  //   {
  //     context: documentRetrievalChain,
  //     question: (input) => input.question,
  //   },
  //   answerGenerationPrompt,
  //   model,
  //   new StringOutputParser(),
  // ]);

  const ANSWER_CHAIN_SYSTEM_TEMPLATE = `Answer the question using the provided data.
    <context>
      {context}
    </context>`;

  const answerGenerationChainPrompt = ChatPromptTemplate.fromMessages([
    ['system', ANSWER_CHAIN_SYSTEM_TEMPLATE],
    new MessagesPlaceholder('history'),
    [
      'human',
      'Now, answer this question using the previous context and chat history:\n{standalone_question}'
    ]
  ]);

  await answerGenerationChainPrompt.formatMessages({
    context: 'fake retrieved content',
    standalone_question: 'Why is the sky blue?',
    history: [
      new HumanMessage('How are you?'),
      new AIMessage('Fine, thank you!')
    ]
  });

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

  const conversationalRetrievalChain = RunnableSequence.from([
    RunnablePassthrough.assign({
      standalone_question: rephraseQuestionChain,
    }),
    RunnablePassthrough.assign({
      context: documentRetrievalChain,
    }),
    answerGenerationChainPrompt,
    // new ChatOpenAI({ modelName: "gpt-3.5-turbo" }),
    model,
    new StringOutputParser(),
  ]);

  const messageHistory = new ChatMessageHistory();

  const finalRetrievalChain = new RunnableWithMessageHistory({
    runnable: conversationalRetrievalChain,
    getMessageHistory: (_sessionId) => messageHistory,
    historyMessagesKey: 'history',
    inputMessagesKey: 'question',
  });

  // const originalQuestion = 'Is there a sage-id?';
  const originalQuestion = 'What are the rules you have come across?';

  const originalAnswer = await finalRetrievalChain.invoke({
    question: originalQuestion,
  }, {
    configurable: { sessionId: 'test' }
  });
  console.log(originalAnswer);

  // const finalResult = await finalRetrievalChain.invoke({
  //   question: 'Can you list them in bullet point form?',
  // }, {
  //   configurable: { sessionId: 'test' }
  // });
  //
  // console.log(finalResult);
}

main().catch((err) => {
  console.error('The sample encountered an error:', err);
});

module.exports = { main };