const { DefaultAzureCredential, getBearerTokenProvider } = require('@azure/identity');
const { AzureChatOpenAI } = require('@langchain/openai');
require('dotenv').config();

const prompt = ['What is your name?'];

async function main() {
    console.log('== Invoke Example ==');

    const credential = new DefaultAzureCredential();
    const scope = 'https://cognitiveservices.azure.com/.default';
    const azureADTokenProvider = getBearerTokenProvider(credential, scope);

    const client = new AzureChatOpenAI({
        azureADTokenProvider,
        azureOpenAIApiInstanceName:  process.env.AZURE_OPENAI_API_INSTANCE_NAME,
        azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
        azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    });

    const result = await client.invoke([
        [
            'system',
            'You are an AI assistant that helps employees.'
        ],
        ['user', 'Hi, what is your name?'],
    ]);

    console.log(result.content);
}

main().catch((err) => {
    console.error('The sample encountered an error:', err);
});

module.exports = { main };