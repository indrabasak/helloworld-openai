const { DefaultAzureCredential, getBearerTokenProvider } = require('@azure/identity');
const { AzureChatOpenAI } = require('@langchain/openai');
const { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
require('dotenv').config();

async function main() {
    console.log('== Lesson 4 - Output Parser Example ==');

    const credential = new DefaultAzureCredential();
    const scope = 'https://cognitiveservices.azure.com/.default';
    const azureADTokenProvider = getBearerTokenProvider(credential, scope);

    const model = new AzureChatOpenAI({
        azureADTokenProvider,
        azureOpenAIApiInstanceName:  process.env.AZURE_OPENAI_API_INSTANCE_NAME,
        azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
        azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    });

    const prompt = ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate(
            'You are an expert at picking company names.'
        ),
        HumanMessagePromptTemplate.fromTemplate(
            'What are three good names for a company that makes {product}?'
        )
    ]);

    const outputParser = new StringOutputParser();
    const nameGenerationChain = prompt.pipe(model).pipe(outputParser);

    const chain = await nameGenerationChain.invoke({
        product: 'fancy cookies'
    });

    console.log(chain);

    // streaming example - good for web application
    const stream = await nameGenerationChain.stream({
        product: 'really cool robots',
    });

    for await (const chunk of stream) {
        console.log(chunk);
    }
}

main().catch((err) => {
    console.error('The sample encountered an error:', err);
});

module.exports = { main };