const { DefaultAzureCredential, getBearerTokenProvider } = require('@azure/identity');
const { AzureChatOpenAI } = require('@langchain/openai');
const { HumanMessage } = require('@langchain/core/messages');
require('dotenv').config();

async function main() {
    console.log('== Lesson 1 - Building Blocks: Language Model Example ==');

    const credential = new DefaultAzureCredential();
    const scope = 'https://cognitiveservices.azure.com/.default';
    const azureADTokenProvider = getBearerTokenProvider(credential, scope);

    const model = new AzureChatOpenAI({
        azureADTokenProvider,
        azureOpenAIApiInstanceName:  process.env.AZURE_OPENAI_API_INSTANCE_NAME,
        azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
        azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    });

    const result = await model.invoke([
        new HumanMessage('Tell me a joke.')
    ]);

    console.log(result);
}

main().catch((err) => {
    console.error('The sample encountered an error:', err);
});

module.exports = { main };