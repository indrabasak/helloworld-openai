const { DefaultAzureCredential, getBearerTokenProvider } = require('@azure/identity');
const { AzureChatOpenAI } = require('@langchain/openai');
const { ChatPromptTemplate } = require('@langchain/core/prompts');
require('dotenv').config();

async function main() {
    console.log('== Chain Example ==');

    const credential = new DefaultAzureCredential();
    const scope = 'https://cognitiveservices.azure.com/.default';
    const azureADTokenProvider = getBearerTokenProvider(credential, scope);

    const client = new AzureChatOpenAI({
        azureADTokenProvider,
        azureOpenAIApiInstanceName:  process.env.AZURE_OPENAI_API_INSTANCE_NAME,
        azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
        azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    });

    const prompt = ChatPromptTemplate.fromMessages([
        [
            'system',
            'You are a helpful assistant that translates {input_language} to {output_language}.',
        ],
        ['human', '{input}'],
    ]);

    const chain = prompt.pipe(client);
    const result = await chain.invoke({
        input_language: 'English',
        output_language: 'German',
        input: 'I love programming.',
    });

    console.log(result.content);
}

main().catch((err) => {
    console.error('The sample encountered an error:', err);
});

module.exports = { main };