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
    const getCurrentWeather = {
        name: "get_current_weather",
        description: "Get the current weather in a given location",
        parameters: {
            type: "object",
            properties: {
                location: {
                    type: "string",
                    description: "The city and state, e.g. San Francisco, CA",
                },
                unit: {
                    type: "string",
                    enum: ["celsius", "fahrenheit"],
                },
            },
            required: ["location"],
        },
    };

    const messages = [{role: "user", content: "What is the weather like in Boston in fahrenheit?"}];

    while (true) {
        const completion = await client.chat.completions.create({
            messages,
            functions: [getCurrentWeather]
        });

        const message = completion.choices[0].message;
        messages.push(message);
        console.log(message);

        // If there is no function call, we're done and can exit this loop
        if (!message.function_call) {
            return;
        }

        const result = await applyToolCall(message.function_call);
        const newMessage = {
            role: 'function',
            name: message.function_call.name,
            content: JSON.stringify(result),
        };
        messages.push(newMessage);
        console.log(newMessage);
        console.log();
    }


    for (const choice of result.choices) {
        console.log(choice.message);
        if (choice.message.role === "assistant" && choice.message.function_call) {
            const result = await applyToolCall(choice.message.function_call);
            const newMessage = {
                role: 'function',
                name: choice.message.function_call.name,
                content: JSON.stringify(result),
        };
            messages.push(newMessage);
            console.log(newMessage);
            console.log();
        }
    }
}

async function applyToolCall(functionCall) {
    console.log("1 ----------------------");
    if (functionCall.name === "get_current_weather") {
        console.log(functionCall);
        const { location, unit } = JSON.parse(functionCall.arguments);
        console.log("location:" + location);
        console.log("unit:" + unit);

        console.log("2 ----------------------");
        return {
            role: "tool",
            content: `The weather in ${location} is 72 degrees ${unit} and sunny.`,
        }
    }
    throw new Error(`Unknown tool call: ${functionCall.name}`);
}

main().catch((err) => {
    console.log("The sample encountered an error:", err);
});

module.exports = {main};