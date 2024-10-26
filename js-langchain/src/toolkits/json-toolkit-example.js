const { JsonToolkit, createJsonAgent } = require('langchain/agents');
const fs = require('node:fs');
const { OpenAI, AzureOpenAIEmbeddings, AzureChatOpenAI, AzureOpenAI } = require('@langchain/openai');
const { JsonSpec } = require('langchain/tools');
const yaml= require('js-yaml');
const { ClientSecretCredential, getBearerTokenProvider } = require('@azure/identity');

async function main() {
  let data;
  try {
    const yamlFile = fs.readFileSync('./data/openai_openapi.yaml', 'utf8');
    data = yaml.load(yamlFile);
    if (!data) {
      throw new Error('Failed to load OpenAPI spec');
    }
  } catch (e) {
    console.error(e);
    return;
  }

  const toolkit = new JsonToolkit(new JsonSpec(data));
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
    azureOpenAIApiInstanceName:  process.env.AZURE_OPENAI_API_INSTANCE_NAME,
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    temperature: 0
  });


  // const model = new AzureOpenAI({
  //   azureADTokenProvider,
  //   azureOpenAIEndpoint: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
  //   // azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
  //   // azureOpenAIApiDeploymentName: 'gpt-4-turbo-blue',
  //   azureOpenAIApiDeploymentName: 'gpt-4-32k-blue',
  //   // model: 'gpt-4',
  //   temperature: 0
  // });
  // gpt-4-turbo-blue / gpt-4

  //const model = new OpenAI({ temperature: 0 });
  const executor = createJsonAgent(model, toolkit);

  const input = 'What are the required parameters in the request body to the /completions endpoint?';

  console.log(`Executing with input "${input}"...`);

  const result = await executor.invoke({ input });

  console.log(`Got output ${result.output}`);

  console.log(
    `Got intermediate steps ${JSON.stringify(
      result.intermediateSteps,
      null,
      2
    )}`
  );
}

main().catch((err) => {
  console.error('The sample encountered an error:', err);
});

module.exports = { main };