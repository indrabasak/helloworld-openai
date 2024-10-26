/**
 * This script demonstrates how to use the SQL toolkit to interact with the
 * Azure Chat OpenAI model. It uses the Event table in the SQLite database to generate SQL queries and
 * execute them against the database.
 *
 * Here's the instruction on how to use this example:
 * 1. Create the events.db SQLite database using the schema, Events_Sqlite.sql, in the sqlite folder.
 * 2. Create the events.db by executing the following commands in MacOS:
 * ```
 * $ sqlite3 events.db
 * sqlite> .read sqlite/Events_Sqlite.sql
 * ```
 * 3. Set the environment variables my modifying the .env.local file in the root directory.
 * 4. Run the script executing the following command:
 * ```
 * yarn node --env-file .env.local src/toolkits/events-sql-toolkit-example.js
 */
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
    type: 'sqlite',
    database: '../sqlite/events.db' // Replace with the link to your database
  });
  const db = await SqlDatabase.fromDataSourceParams({
    appDataSource: datasource
  });

  const toolkit = new SqlToolkit(db, model);
  const tools = toolkit.getTools();

  console.log(
    tools.map((tool) => ({
      name: tool.name,
      description: tool.description
    }))
  );

  const executor = createSqlAgent(model, toolkit);
  let input = 'What is the source and the destination of event ID sage-4e152b30-5e79-437c-9ac0-64e666b765f3?';
  console.log(`Executing with input "${input}"...`);
  let result = await executor.invoke({ input });
  console.log(`Got output ${result.output}`);

  console.log(
    `Got intermediate steps ${JSON.stringify(
      result.intermediateSteps,
      null,
      2
    )}`
  );

  input = 'How many total number of events of offering type?';
  console.log(`Executing with input "${input}"...`);
  result = await executor.invoke({ input });
  console.log(`Got output ${result.output}`);

  // input = 'What are the different destinations of events of offering type?';
  input = 'What are the different destinations of offering type?';
  console.log(`Executing with input "${input}"...`);
  result = await executor.invoke({ input });
  console.log(`Got output ${result.output}`);

  input = 'What are the different sources?';
  console.log(`Executing with input "${input}"...`);
  result = await executor.invoke({ input });
  console.log(`Got output ${result.output}`);


  await datasource.destroy();
}

main().catch((err) => {
  console.error('The sample encountered an error:', err);
});

module.exports = { main };