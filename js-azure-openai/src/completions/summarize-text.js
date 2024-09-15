const {AzureOpenAI} = require("openai");
const {DefaultAzureCredential, getBearerTokenProvider} = require("@azure/identity");

require("dotenv").config();

async function main() {
    const scope = "https://cognitiveservices.azure.com/.default";
    const azureADTokenProvider = getBearerTokenProvider(new DefaultAzureCredential(), scope);
    const deployment = "gpt-35-turbo-blue";
    const apiVersion = "2024-07-01-preview";
    const client = new AzureOpenAI({azureADTokenProvider, deployment, apiVersion});

    const textToSummarize = `
    Two independent experiments reported their results this morning at CERN, Europe's high-energy physics laboratory near Geneva in Switzerland. Both show convincing evidence of a new boson particle weighing around 125 gigaelectronvolts, which so far fits predictions of the Higgs previously made by theoretical physicists.

    ""As a layman I would say: 'I think we have it'. Would you agree?"" Rolf-Dieter Heuer, CERN's director-general, asked the packed auditorium. The physicists assembled there burst into applause.
  :`;

    const summarizationPrompt = `
    Summarize the following text.

    Text:
    """"""
    ${textToSummarize}
    """"""

    Summary:`;
    console.log(`Input: ${summarizationPrompt}`);

    const result = await client.chat.completions.create({
        messages: [
            {role: "assistant", content: summarizationPrompt}
        ],
        max_tokens: 64
    });

    for (const choice of result.choices) {
        console.log(choice.message);
    }
}

main().catch((err) => {
    console.error("The sample encountered an error:", err);
});

module.exports = {main};