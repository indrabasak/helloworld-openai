const { AzureOpenAI } = require("openai");
const { DefaultAzureCredential, getBearerTokenProvider } = require("@azure/identity");

require("dotenv").config();

async function main() {
    const scope = "https://cognitiveservices.azure.com/.default";
    const azureADTokenProvider = getBearerTokenProvider(new DefaultAzureCredential(), scope);
    const deployment = "gpt-35-turbo-blue";
    const apiVersion = "2024-07-01-preview";
    const client = new AzureOpenAI({ azureADTokenProvider, deployment, apiVersion });
    const result = await client.chat.completions.create({
        messages: [
            { role: "user", content: "Hi, what is your name?"},
            { role: "user", content: "Who won the Super Bowl in 1970?"},
        ]
    });

    for (const choice of result.choices) {
        console.log(choice.message);
    }
}

main().catch((err) => {
    console.error("The sample encountered an error:", err);
});

module.exports = { main };