const { DefaultAzureCredential, getBearerTokenProvider } = require('@azure/identity');
const { AzureOpenAIEmbeddings } = require('@langchain/openai');
const { similarity } = require('ml-distance');

require('dotenv').config();

async function main() {
    console.log('== Lesson 1 - Vectorstore & Embeddings: Vectorstore Ingestion Example ==');

    const credential = new DefaultAzureCredential();
    const scope = 'https://cognitiveservices.azure.com/.default';
    const azureADTokenProvider = getBearerTokenProvider(credential, scope);

    const embeddings = new AzureOpenAIEmbeddings({
        azureADTokenProvider,
        azureOpenAIApiInstanceName:  process.env.AZURE_OPENAI_API_INSTANCE_NAME,
        azureOpenAIApiDeploymentName: 'text-embedding-ada-002-blue',
        azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    });

    // example 1
    let result =  await embeddings.embedQuery('This is some sample text');
    console.log(result);

    // example 2
    const vector1 = await embeddings.embedQuery(
        'What are vectors useful for in machine learning?'
    );
    const unrelatedVector = await embeddings.embedQuery(
        'A group of parrots is called a pandemonium.'
    );
    result = similarity.cosine(vector1, unrelatedVector);
    console.log(result);

    // example 3
    const similarVector = await embeddings.embedQuery(
        'Vectors are representations of information.'
    );
    result = similarity.cosine(vector1, similarVector);
    console.log(result);
}

main().catch((err) => {
    console.error('The sample encountered an error:', err);
});

module.exports = { main };