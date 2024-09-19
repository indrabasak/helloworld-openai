const { DefaultAzureCredential, getBearerTokenProvider } = require('@azure/identity');
const { AzureChatOpenAI } = require('@langchain/openai');
const { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } = require('@langchain/core/prompts');
require('dotenv').config();

async function main() {
    console.log('== Lesson 3 - LangChain Expression Model Example ==');

    const credential = new DefaultAzureCredential();
    const scope = 'https://cognitiveservices.azure.com/.default';
    const azureADTokenProvider = getBearerTokenProvider(credential, scope);

    const model = new AzureChatOpenAI({
        azureADTokenProvider,
        azureOpenAIApiInstanceName:  process.env.AZURE_OPENAI_API_INSTANCE_NAME,
        azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
        azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    });

    // Example 2
    const prompt = ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate(
            'You are an expert at picking company names.'
        ),
        HumanMessagePromptTemplate.fromTemplate(
            'What are three good names for a company that makes {product}?'
        )
    ]);

    const chain = prompt.pipe(model);
    const messageChunk = await chain.invoke({
        product: 'colorful socks'
    });

    console.log(messageChunk.content);
}

main().catch((err) => {
    console.error('The sample encountered an error:', err);
});

module.exports = { main };