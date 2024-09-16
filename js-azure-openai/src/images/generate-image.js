const { AzureOpenAI } = require('openai');
const { DefaultAzureCredential, getBearerTokenProvider } = require('@azure/identity');

require('dotenv').config();

async function main() {
    const scope = 'https://cognitiveservices.azure.com/.default';
    const azureADTokenProvider = getBearerTokenProvider(new DefaultAzureCredential(), scope);
    const deployment = 'dall-e-3';
    const apiVersion = '2024-07-01-preview';
    const client = new AzureOpenAI({ azureADTokenProvider, deployment, apiVersion });
    const results = await client.images.generate(
        { prompt: 'a monkey eating a banana',
                n: 1,
                size: '1024x1024'});

    for (const image of results.data) {
        console.log(`Image generation result URL: ${image.url}`);
    }
}

main().catch((err) => {
    console.error('The sample encountered an error:', err);
});

module.exports = { main };