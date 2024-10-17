const { ClientSecretCredential, getBearerTokenProvider } = require('@azure/identity');
const { AzureChatOpenAI } = require('@langchain/openai');
const { DataSource } = require('typeorm');
const { SqlDatabase } = require('langchain/sql_db');
const { SqlToolkit } = require('langchain/agents/toolkits/sql');
const { createSqlAgent } = require('langchain/agents/toolkits/sql');

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

  const datasource = new DataSource({
    type: "sqlite",
    database: "../sqlite/Chinook.db", // Replace with the link to your database
  });
  const db = await SqlDatabase.fromDataSourceParams({
    appDataSource: datasource,
  });

  const toolkit = new SqlToolkit(db, model);
  const tools = toolkit.getTools();

  console.log(
    tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
    }))
  );

  const executor = createSqlAgent(model, toolkit);
  const input = `List the total sales per country. Which country's customers spent the most?`;
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

  await datasource.destroy();
}

main().catch((err) => {
  console.error('The sample encountered an error:', err);
});

module.exports = { main };