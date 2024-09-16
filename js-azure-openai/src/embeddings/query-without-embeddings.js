const {AzureOpenAI} = require('openai');
const {DefaultAzureCredential, getBearerTokenProvider} = require('@azure/identity');
const fs = require('fs');

require('dotenv').config();

async function main() {
    const scope = 'https://cognitiveservices.azure.com/.default';
    const azureADTokenProvider = getBearerTokenProvider(new DefaultAzureCredential(), scope);
    const deployment = 'gpt-35-turbo-blue';
    const apiVersion = '2024-07-01-preview';
    const client = new AzureOpenAI({azureADTokenProvider, deployment, apiVersion});

    const wikipediaArticleOnCurling = fs.readFileSync('./data/wikipedia_article_on_curling.txt', 'utf8');


    const query = `
        Use the below article on the 2022 Winter Olympics to answer the subsequent question. If the answer cannot be found, write "I don't know".
        
        Article:
        """"""
        ${wikipediaArticleOnCurling}
        """"""
        
        Question: Which athletes won the gold medal in curling at the 2022 Winter Olympics?
    `;

    console.log(`Input: ${query}`);
    const result = await client.chat.completions.create({
        messages: [
            {role: 'system', content: 'You answer questions about the 2022 Winter Olympics.'},
            {role: 'user', content: query},
        ],
        temperature: 0,
    });

    for (const choice of result.choices) {
        console.log(choice.message);
    }
}

main().catch((err) => {
    console.error('The sample encountered an error:', err);
});

module.exports = {main};