const { ClientSecretCredential, getBearerTokenProvider } = require('@azure/identity');
const { AzureChatOpenAI } = require('@langchain/openai');
const { SearchApi } = require('@langchain/community/tools/searchapi');
const { ChatPromptTemplate } = require('@langchain/core/prompts');
const { RunnableSequence } = require('@langchain/core/runnables');
const { AgentExecutor } = require('langchain/agents');

async function main() {
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
  const model = new AzureChatOpenAI({
    azureADTokenProvider,
    azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    temperature: 0
  });

  const tools = [
    new SearchApi(process.env.SEARCHAPI_API_KEY, {
      engine: 'google_news'
    })
  ];
  const prefix = ChatPromptTemplate.fromMessages([
    [
      'ai',
      'Answer the following questions as best you can. In your final answer, use a bulleted list markdown format.'
    ],
    ['human', '{input}']
  ]);
// Replace this with your actual output parser.
  const customOutputParser = (
    input
  ) => ({
    log: 'test',
    returnValues: {
      output: input
    }
  });
// Replace this placeholder agent with your actual implementation.
  const agent = RunnableSequence.from([prefix, model, customOutputParser]);
  const executor = AgentExecutor.fromAgentAndTools({
    agent,
    tools
  });
  const res = await executor.invoke({
    input: 'What\'s happening in Ukraine today?'
  });
  console.log(res);
}

main().catch((err) => {
  console.error('The sample encountered an error:', err);
});

module.exports = { main };
