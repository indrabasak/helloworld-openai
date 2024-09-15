const {AzureOpenAI} = require("openai");
const {DefaultAzureCredential, getBearerTokenProvider} = require("@azure/identity");

require("dotenv").config();

async function main() {
    const scope = "https://cognitiveservices.azure.com/.default";
    const azureADTokenProvider = getBearerTokenProvider(new DefaultAzureCredential(), scope);
    const deployment = "gpt-35-turbo-blue";
    const apiVersion = "2024-07-01-preview";
    const client = new AzureOpenAI({azureADTokenProvider, deployment, apiVersion});

    // 'The capital of the United States is Washington, D.C.',
    const getCountryCapital = {
        name: "get_country_capital",
        description: "Get the capital of a country",
        parameters: {
            type: "object",
            properties: {
                country: {
                    type: "string",
                    description: "The country, e.g., Japan",
                },
                city: {
                    type: "string",
                    description: "The city, e.g., Tokyo"
                }
            },
            required: ["country", "city"]
        },
    };

    /*
    const choice = result.choices[0];
const responseMessage = choice.message;
if (responseMessage?.role === "assistant") {
  const requestedToolCalls = responseMessage?.toolCalls;
  if (requestedToolCalls?.length) {
    const toolCallResolutionMessages = [
      ...messages,
      responseMessage,
      ...requestedToolCalls.map(applyToolCall),
    ];
    const result = await client.getChatCompletions(deploymentName, toolCallResolutionMessages);
    // continue handling the response as normal
  }
}
     */

    const result = await client.chat.completions.create({
        messages: [{role: "user", content: "What is the capital of Canada?"}],
        functions: [getCountryCapital]
    });

    for (const choice of result.choices) {
        console.log(choice.message);
        const {function_call, role} = choice.message;
        await callback(function_call);
        if (role === "assistant") {

        }
    }
}

async function callback(functionCall) {
    console.log("1 ----------------------");
    console.log(functionCall);
    const { country, city } = JSON.parse(functionCall.arguments);
    console.log("country:" + country);
    console.log("city:" + city);

    console.log("2 ----------------------");
}

main().catch((err) => {
    console.log("The sample encountered an error:", err);
});

module.exports = {main};