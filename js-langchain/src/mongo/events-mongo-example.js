const { ClientSecretCredential, getBearerTokenProvider } = require('@azure/identity');
const { AzureChatOpenAI } = require('@langchain/openai');
const { DataSource } = require('typeorm');
const { SqlDatabase } = require('langchain/sql_db');
const { SqlToolkit } = require('langchain/agents/toolkits/sql');
const { ChatPromptTemplate, MessagesPlaceholder } = require('@langchain/core/prompts');
const { RunnablePassthrough, RunnableSequence } = require('@langchain/core/runnables');
const { StringOutputParser, JsonOutputParser, StructuredOutputParser } = require('@langchain/core/output_parsers');
const { z } = require( 'zod');
const { MongoUtil } = require('./mongo-util');

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

  // const datasource = new DataSource({
  //   type: 'sqlite',
  //   database: '../sqlite/events.db' // Replace with the link to your database
  // });
  // const db = await SqlDatabase.fromDataSourceParams({
  //   appDataSource: datasource
  // });
  //
  // const toolkit = new SqlToolkit(db, model);
  // const tools = toolkit.getTools();
  //
  // console.log(
  //   tools.map((tool) => ({
  //     name: tool.name,
  //     description: tool.description
  //   }))
  // );

  const mongoUtil = await new MongoUtil(
    process.env.DB_HOST,
    process.env.DB_PORT,
    process.env.DB_QUERY_STRING,
    process.env.DB_NAME,
    process.env.DB_CERT,
    process.env.DB_USER_NAME,
    process.env.DB_PWD);
  await mongoUtil.connect();

  // const json = [
  //   {
  //     $match: {
  //       "status": { $in: ["SAGE_DELIVERY_FAILURE", "TARGET_DELIVERY_FAILURE"] },
  //       "meta.rule": { $not: { $regex: "rule-default" } }
  //     }
  //   },
  //   {
  //     $sort: { "updated-time": -1 }
  //   },
  //   {
  //     $limit: 10
  //   },
  //   {
  //     $project: {
  //       _id: 0,
  //       "meta.rule": 1,
  //       "meta.target": 1
  //     }
  //   }
  // ];
  // mongoUtil.aggregate(process.env.DB_COLLECTION_EVENT, json).then((result) => {
  //   console.log(result);
  // });


  const queryGenerationTemplate = `You are a data analyst and you have been asked to write a MongoDB aggregation 
  pipeline query to answer the user's question.  
  Your query should  be strictly based on the MongoDB schema provided below. 
  
  MongoDB Schema:
  The schema only contains documents of SAGE events. Each event has the following fields:
    - **id**: the unique identifier of the document generated by MongoDB
    - **sage-id**: the unique identifier of a SAGE event
    - **meta**: the metadata of the event and contains the following fields:
      - **rule**: the rule associated with the event describing the integration, e.g., 'rule-rule-cf-ecommerce-invmoab'. 
        A rule has the following format: 'rule-source-destination-integration-optional'.
        A source is the source of the event, a destination is the destination of the event, and an integration is the type of of event associated with an integration, e.g, invmoab, offering, etc.
        The optional is an optional string that can be added to the rule.
        To get source, destination, and integration, split the rule by '-'. The second token is source, the third token is destination, and the fourth token is integration.
        For example, 'rule-o2pcoop-cf-invmoab' is a rule where the source is 'o2pcoop', the destination is 'cf', and the integration is 'invmoab'.
        Another example, 'rule-sfdc-cf-account-consumer' is a rule where the source is 'sfdc', the destination is 'cf', and the integration is 'account'.
      - **rule-arn**: the rule Amazon Resource Name (ARN) of the rule associated with the event.
      - **target**: the target of the event. It is type of AWS resource used by the destination.
      - **target-arn**: the target Amazon Resource Name (ARN) of the resource used by the destination.
    - **payload**: the payload of the event. A payload of an event may have the following fields which can used during the query generation:
      - **id**: the unique identifier of the payload
      - **time**: the timestamp of the event originally created by the producer
      - **data**: the data of the event. Th event data can have the following fields:
        - **offeringId**: an offering ID
        - **invoiceNumber**: an invoice number
    - **status**: the status of the event. The status can be one of the following values: 
      - 'SAGE_DELIVERY_SUCCESSFUL'
      - 'SAGE_DELIVERY_FAILURE'
      - 'TARGET_DELIVERY_SUCCESSFUL'
      - 'TARGET_DELIVERY_FAILURE'
    - **description**: the status description of an event
    - **creation-time**: the date when the event was first received by SAGE
    - **updated-time**: the date when the event was last updated by SAGE

  Note the following:
    - The table contains data for events that have occurred in the past.
    - 'o2pcoop' is same as 'o2p'
    - when the source is 'o2p', it should be considered as 'o2pcoop'
    - 'cf' is abbreviation of Core Finance
    - Failed events are events with state such as 'SAGE_DELIVERY_FAILURE' or 'TARGET_DELIVERY_FAILURE'.
    - Successful events are events with state such as 'SAGE_DELIVERY_SUCCESSFUL' or 'TARGET_DELIVERY_SUCCESSFUL'.
    - Target is same as destination.
    - Always ignore rules named 'rule-default'
    - Always sort the events by updated-time in descending order.
    - Always add the limit size of 50
    - The 'updated-time' and 'creation-time' fields are MongoDB Date objects.
    - Always use the 'updated-time' field for date comparison in the query.
    - If time is not specified in the question, use the time period as the last 24 hours from now. Here's an example of a time period: 'past month', 'past week', 'past year'.
    - The example query 'List the source and destinations of failed events?' should be interpreted as 'List the source and destinations of failed events in the last 24 hours?'
    - When the question refers to a time period like 'past month', 'past week', or 'past year', translate this into a dynamic date range in the MongoDB query. 
    - For instance, 'past month' should be translated into a range from the current date back to the same day of the previous month. 
    - The 'past week' should be translated into a range from the current date back to the same day of the previous week.
    - Always use current date and time in the format 'YYYY-MM-DD HH:mm:ss'. Ensure that the script dynamically calculates and uses the current date and time each time it is run.
    - Always use a Date object for date comparison in the query. Do not use 'ISODate'. Here's an example of a date object: 'new Date()'.
    - Always use double quotes for MongoDB operators in the query. Here's a few examples of operators, '$match', '$project', '$cond', '$in', '$not', '$regex', etc. in the query.
    - Example '$match' should be written as '"$match"'. 
    - The following operators must not be used in the query: '$date', '$multiply'. 
    - The query output should be valid JSON object.
    - Never return invalid queries. 
  
  Question: {question}
  MongoDB Query: 
    `;

  console.log('1 ------------------------------');
  const queryGenerationPrompt = ChatPromptTemplate.fromTemplate(queryGenerationTemplate);
  console.log('2 ------------------------------');

  // const chain = queryGenerationPrompt.pipe(model);
  // const chainResult = await chain.invoke({
  //   question: 'How many events of offering type integration?'
  // });
  // console.log(chainResult.content);
  // console.log(JSON.parse(JSON.stringify(chainResult.content)));
  // console.log('2b ------------------------------');

  // Define the schema for your aggregation pipeline using Zod
//   const schema = z.object({
//     pipeline: z.array(
//       z.object({
//         $match: z.object({
//           date: z.date(),
//           // Add other match conditions as needed
//         }),
//         // Add other aggregation stages and their schemas as needed
//       })
//     ),
//   });
//
// // Create the parser using the schema
//   const parser = StructuredOutputParser.fromZodSchema(schema);

  const queryGeneratorChain
    = RunnableSequence.from([
    new RunnablePassthrough(),
    queryGenerationPrompt,
    model.bind({ stop: ['\nMongoDbResult:'] }),
    // parser]);
    // new JsonOutputParser()])
    new StringOutputParser()]);

  // console.log('1---------------------------');
  // let result =
  //   await queryGeneratorChain.invoke(
  //     { question: 'How many total events of offering type?' });
  // console.log(result);
  //
  // result =
  //   await queryGeneratorChain.invoke(
  //     { question: 'What are the types of events with source as o2p?' });
  // console.log(result);
//
// result =
//   await queryGeneratorChain.invoke(
//     { question: 'List the source and destinations of failed events?' });
// console.log(result);
//
  const responseTemplate = `Based on the collection schema below, question, MongoDB aggregation 
  pipeline query, and MongoDB response, write a natural language response and format
  the result as table if there is more than 1.
  
  Note the following:
    - When the MongoDB response is empty, answer 'No data found'.
    - If there are duplicate entries in the response, remove the duplicates.

  Question: {question}
  MongoDB Query: {query}
  MongoDB Response: {response}`;

  const responsePrompt = ChatPromptTemplate.fromTemplate(responseTemplate);
  const completeChain = RunnableSequence.from([
    RunnablePassthrough.assign({ query: queryGeneratorChain }),
    RunnablePassthrough.assign({
      // schema: async () => db.getTableInfo(['Event']),
      // response: async (input) => db.runQuery(input.query) }),
      // response: async (input) => db.run(input.query) }),
      response: async (input) => mongoUtil.aggregateResultAsArray(process.env.DB_COLLECTION_EVENT, input.query)
    }),
    responsePrompt,
    model,
    new StringOutputParser()
  ]);

  let result = await completeChain.invoke({ question: 'List the source and destinations of failed events?' });
  console.log(result);

  // result = await completeChain.invoke({ question: 'List the source and destinations of failed events in the last one month?' });
  // console.log(result);
//
// result = await completeChain.invoke({question: 'How many failed events?'});
// console.log(result);
//
// result = await completeChain.invoke({question: 'List all the failed events?'});
// console.log(result);

  console.log('3 ------------------------------');

  await mongoUtil.close();
}

main().catch((err) => {
  console.error('The sample encountered an error:', err);
});

module.exports = { main };