/**
 * This example demonstrates how to use the SQL toolkit to generate SQL queries
 * and execute them against a database.
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
 * yarn node --env-file .env.local src/toolkits/events-adv-sql-example.js
 * ```
 *
 * @author Indra Basak
 * @since Oct 25, 2024
 */
const { ClientSecretCredential, getBearerTokenProvider } = require('@azure/identity');
const { AzureChatOpenAI } = require('@langchain/openai');
const { DataSource } = require('typeorm');
const { SqlDatabase } = require('langchain/sql_db');
const { SqlToolkit } = require('langchain/agents/toolkits/sql');
const { ChatPromptTemplate, MessagesPlaceholder } = require('@langchain/core/prompts');
const { RunnablePassthrough, RunnableSequence } = require('@langchain/core/runnables');
const { StringOutputParser } = require('@langchain/core/output_parsers');

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

  // const executor = createSqlAgent(model, toolkit);


  const sqlGenerationTemplate = `You are a data analyst and you have been asked to write a SQL query to answer the user's question. 
  Your query should use the following schema: {schema}. 
  
  The schema only contains one table named 'Event' with the following columns:
    - **EventId**: the unique identifier of the event
    - **Source**: the source of the event
    - **Destination**: the destination of the event
    - **Type**: the type of the event
    - **Rule**: the rule associated with the event
    - **Status**: the status of the event. The status can be one of the following values: 
      - 'SAGE_DELIVERY_SUCCESSFUL'
      - 'SAGE_DELIVERY_FAILURE'
      - 'TARGET_DELIVERY_SUCCESSFUL'
      - 'TARGET_DELIVERY_FAILURE'
    - **Description**: the description of the event
    - **UpdatedTime**: the time when the event was last updated

  Note the following:
    - The table contains data for events that have occurred in the past.
    - 'o2pcoop' is same as 'o2p'
    - Events with states 'SAGE_DELIVERY_SUCCESSFUL' and 'TARGET_DELIVERY_SUCCESSFUL' are considered successful events.
    - Events with states 'SAGE_DELIVERY_FAILURE' and 'TARGET_DELIVERY_FAILURE' are considered failed events.
    - Target is same as destination.
    - Always add the limit size of 10
  
  Question: {question}
  SQL Query: 
    `;

  const sqlGenerationprompt = ChatPromptTemplate.fromTemplate(sqlGenerationTemplate);

  // In this case, we're passing the schema.
  const sqlQueryGeneratorChain
    = RunnableSequence.from([
      RunnablePassthrough.assign({
        schema: async () => db.getTableInfo(['Event']) }),
        sqlGenerationprompt,
        model.bind({ stop: ['\nSQLResult:'] }),
        new StringOutputParser()]);

  let result =
    await sqlQueryGeneratorChain.invoke(
      { question: 'How many total events of offering type?' });
  console.log(result);

  result =
    await sqlQueryGeneratorChain.invoke(
      { question: 'What are the types of events with source as o2p?' });
  console.log(result);

  result =
    await sqlQueryGeneratorChain.invoke(
      { question: 'List the source and destinations of failed events?' });
  console.log(result);

  const responseTemplate = `Based on the table schema below, question, sql query,
    and sql response, write a natural language response and format
    result in html table if there is more than 1:

    Using the following schema: {schema}
    Question: {question}
    SQL Query: {query}
    SQL Response: {response}`;

  const responsePrompt = ChatPromptTemplate.fromTemplate(responseTemplate);
  const completeChain = RunnableSequence.from([
    RunnablePassthrough.assign({ query: sqlQueryGeneratorChain }),
    RunnablePassthrough.assign({
      schema: async () => db.getTableInfo(['Event']),
      // response: async (input) => db.runQuery(input.query) }),
      response: async (input) => db.run(input.query) }),
    responsePrompt,
    model,
    new StringOutputParser()
  ]);

  result = await completeChain.invoke({question: 'List the source and destinations of failed events?'});
  console.log(result);

  result = await completeChain.invoke({question: 'How many failed events?'});
  console.log(result);

  result = await completeChain.invoke({question: 'List all the failed events?'});
  console.log(result);

  await datasource.destroy();
}

main().catch((err) => {
  console.error('The sample encountered an error:', err);
});

module.exports = { main };