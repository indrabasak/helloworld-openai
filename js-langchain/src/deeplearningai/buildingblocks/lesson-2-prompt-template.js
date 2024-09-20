const { DefaultAzureCredential, getBearerTokenProvider } = require('@azure/identity');
const { AzureChatOpenAI } = require('@langchain/openai');
const { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } = require('@langchain/core/prompts');
require('dotenv').config();

async function main() {
    console.log('== Lesson 2 - Building Blocks: Prompt Template Example ==');

    const credential = new DefaultAzureCredential();
    const scope = 'https://cognitiveservices.azure.com/.default';
    const azureADTokenProvider = getBearerTokenProvider(credential, scope);

    const model = new AzureChatOpenAI({
        azureADTokenProvider,
        azureOpenAIApiInstanceName:  process.env.AZURE_OPENAI_API_INSTANCE_NAME,
        azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
        azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    });

    // Example 1
    const prompt = ChatPromptTemplate.fromTemplate(
        'What are three good names for a company that makes {product}?'
    );

    // const result = await prompt.format({
    //     product: 'colorful socks'
    // });
    // console.log(result);

    const formattedMsgOne = await prompt.formatMessages({
        product: 'colorful socks'
    });
    console.log(formattedMsgOne);

    const msgChunkOne = await model.invoke(formattedMsgOne);
    console.log(msgChunkOne.content);

    // Example 2
    const promptFromMessages = ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate(
            'You are an expert at picking company names.'
        ),
        HumanMessagePromptTemplate.fromTemplate(
            'What are three good names for a company that makes {product}?'
        )
    ]);

    const formattedMsgsTwo = await promptFromMessages.formatMessages({
        product: 'shiny objects'
    });
    console.log(formattedMsgsTwo);

    const msgChunkTwo = await model.invoke(formattedMsgOne);
    console.log(msgChunkTwo.content);

    // Example 3
    const promptFromMessagesTwo = ChatPromptTemplate.fromMessages([
        ['system', 'You are an expert at picking company names.'],
        ['human', 'What are three good names for a company that makes {product}?']
    ]);

    const formattedMsgsThree = await promptFromMessagesTwo.formatMessages({
        product: 'shiny objects'
    });
    console.log(formattedMsgsThree);

    const msgChunkThree = await model.invoke(formattedMsgsThree);
    console.log(msgChunkThree.content);
}

main().catch((err) => {
    console.error('The sample encountered an error:', err);
});

module.exports = { main };