const { AzureOpenAI } = require("openai");
const { DefaultAzureCredential, getBearerTokenProvider } = require("@azure/identity");

require("dotenv").config();

async function main() {
    console.log("== Get embeddings sample ==");

    const scope = "https://cognitiveservices.azure.com/.default";
    const azureADTokenProvider = getBearerTokenProvider(new DefaultAzureCredential(), scope);
    const apiVersion = "2024-07-01-preview";
    const deployment = "text-embedding-ada-002-blue";
    const client = new AzureOpenAI({ azureADTokenProvider, deployment, apiVersion });

    // generate embeddings vector from the prompt
    const embeddings = await client.embeddings.create({
        input: ["This is the sample text to be embedded"],
        model: ""
    });

    for (const embeddingData of embeddings.data) {
        console.log(`The embedding values are ${embeddingData.embedding}`);
    }
}

main().catch((err) => {
    console.error("The sample encountered an error:", err);
});

module.exports = { main };