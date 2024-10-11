const { PDFLoader } = require('@langchain/community/document_loaders/fs/pdf');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { MemoryVectorStore } = require('langchain/vectorstores/memory');
const { RunnableSequence, RunnablePassthrough, RunnableWithMessageHistory } = require('@langchain/core/runnables');
const { ChatPromptTemplate, MessagesPlaceholder } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { HumanMessage, AIMessage } = require('@langchain/core/messages');
const { ChatMessageHistory } = require('langchain/memory');
const { getBearerTokenProvider, ClientSecretCredential } = require('@azure/identity');
const { AzureOpenAIEmbeddings, AzureChatOpenAI } = require('@langchain/openai');
const { HttpResponseOutputParser } = require('langchain/output_parsers');
const express = require('express');

require('dotenv').config();

async function getFinalRetrievalChain() {
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

  const ANSWER_CHAIN_SYSTEM_TEMPLATE = `You are an experienced researcher, 
    expert at interpreting and answering questions based on provided sources.
    Using the below provided context and chat history, 
    answer the user's question to the best of 
    your ability 
    using only the resources provided. Be verbose!

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

  // "text/event-stream" is also supported
  const httpResponseOutputParser = new HttpResponseOutputParser({
    contentType: 'text/plain'
  });

  const messageHistories = {};

  const getMessageHistoryForSession = (sessionId) => {
    if (messageHistories[sessionId] !== undefined) {
      return messageHistories[sessionId];
    }
    const newChatSessionHistory = new ChatMessageHistory();
    messageHistories[sessionId] = newChatSessionHistory;
    return newChatSessionHistory;
  };

  const finalRetrievalChain = new RunnableWithMessageHistory({
    runnable: conversationalRetrievalChain,
    getMessageHistory: getMessageHistoryForSession,
    inputMessagesKey: 'question',
    historyMessagesKey: 'history',
  }).pipe(httpResponseOutputParser);

  console.log('end ------------- getFinalRetrievalChain');
  return finalRetrievalChain;
}

const app = express();
app.use(express.json());
const port = 3000;

// const sessionMap = {};
let finalRetrievalChain = null;
app.post('/', async (req, res) => {
  // res.send('Hello World!');
  if (finalRetrievalChain === null) {
    console.log('instantiating finalRetrievalChain --------------');
    finalRetrievalChain = await getFinalRetrievalChain();
  }

  const body = await req.body;
  console.log(body);
  const stream = await finalRetrievalChain.stream({
    question: body.question
  }, { configurable: { sessionId: body.session_id } });

  res.setHeader('Content-Type', 'text/plain');
  for await (const chunk of stream) {
    res.write(chunk);
  }
  res.send();
  console.log("------- response completed")

});

app.listen(port, () => {
  console.log(`WebAPI app listening on port ${port}`);
});