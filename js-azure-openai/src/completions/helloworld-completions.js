const { DefaultAzureCredential, getBearerTokenProvider } = require('@azure/identity');
const { AzureOpenAI } = require ('openai');
require('dotenv').config();

const prompt = ['What is your name?'];

async function hello() {
    console.log('== Get completions Sample ==');

    const credential = new DefaultAzureCredential();
    const scope = 'https://cognitiveservices.azure.com/.default';
    const azureADTokenProvider = getBearerTokenProvider(credential, scope);

    const deployment = 'gpt-35-turbo-blue';
    const apiVersion = '2024-07-01-preview';
    const client = new AzureOpenAI({ azureADTokenProvider, deployment, apiVersion });
    //
    // const events = await client.completions.create({
    //     prompt,
    //     max_tokens: 128,
    //     // stream: true,
    // });
    //
    // for await (const event of events) {
    //     for (const choice of event.choices) {
    //         console.log(choice.text);
    //     }
    // }

    const events = await client.chat.completions.create({
        'messages': [
            {
                'role': 'system',
                'content': 'You are an AI assistant that helps employees.'
            },
            {
                'role': 'user',
                'content': 'Hi, what is your name?'
            }
        ],
        max_tokens: 128,
        stream: true
    });

    for await (const event of events) {
        for (const choice of event.choices) {
            console.log('1------------');
            console.log(choice.delta?.content);
            // console.log(choice.text);
            console.log('2------------');
        }
    }

    // const client = new OpenAIClient(endpoint, new AzureCredential(azureApiKey));
    // const deploymentId = "gpt-35-turbo-blue";
    // const result = await client.getCompletions(deploymentId, prompt, { maxTokens: 128 });
    //
    // for (const choice of result.choices) {
    //     console.log(choice.text);
    // }
}

hello().catch((err) => {
    console.error('The sample encountered an error:', err);
});

module.exports = { hello };
