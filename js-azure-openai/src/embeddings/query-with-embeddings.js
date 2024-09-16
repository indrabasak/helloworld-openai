const { AzureOpenAI } = require('openai');
const { DefaultAzureCredential, getBearerTokenProvider } = require('@azure/identity');
const fs = require('fs');
const readline = require('readline');
const he = require('he'); // Import the 'he' module for decoding HTML entities

require('dotenv').config();

// Function to calculate cosine similarity
function cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
}

function cleanText(text) {
    const decodedText = he.decode(text); // Decode HTML entities
    return decodedText
        .replace(/[^a-zA-Z0-9\s]/g, '') // Remove non-alphanumeric characters
        .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
        .trim(); // Trim leading and trailing spaces
}

async function main() {
    console.log('== Get embeddings sample ==');

    const scope = 'https://cognitiveservices.azure.com/.default';
    const azureADTokenProvider = getBearerTokenProvider(new DefaultAzureCredential(), scope);
    const apiVersion = '2024-07-01-preview';
    const deployment = 'text-embedding-ada-002-blue';
    const client = new AzureOpenAI({ azureADTokenProvider, deployment, apiVersion });

    const query = 'Which athletes won the gold medal in curling at the 2022 Winter Olympics?';
    // generate embeddings vector from the prompt
    const queryEmbeddingResult = await client.embeddings.create({
        input: query,
        model: deployment
    });
    const queryEmbedding = queryEmbeddingResult.data[0].embedding;

    // Read the large text file and split it into chunks
    const chunkSize = 1000; // Adjust chunk size as needed
    const chunks = [];

    const fileStream = fs.createReadStream('./data/wikipedia_article_on_curling.txt');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let currentChunk = '';

    // for await (const line of rl) {
    //     if (currentChunk.length + line.length > chunkSize) {
    //         chunks.push(currentChunk);
    //         currentChunk = '';
    //     }
    //     currentChunk += line + '\n';
    // }
    // if (currentChunk) {
    //     chunks.push(currentChunk);
    // }

    for await (const line of rl) {
        const cleanedLine = cleanText(line);
        if (currentChunk.length + cleanedLine.length > chunkSize) {
            chunks.push(currentChunk);
            currentChunk = '';
        }
        currentChunk += cleanedLine + '\n';
    }
    if (currentChunk) {
        chunks.push(currentChunk);
    }

    // const documents = wikipediaArticleOnCurling.replace("\n", " ");
    const documentEmbeddingsResult = await client.embeddings.create({
        input: chunks,
        model: deployment
    });
    const documentEmbeddings = documentEmbeddingsResult.data.map(d => d.embedding);

    // Calculate similarities
    const similarities = documentEmbeddings.map(docEmbedding => cosineSimilarity(queryEmbedding, docEmbedding));

    // Find the document with the highest similarity
    const bestMatchIndex = similarities.indexOf(Math.max(...similarities));
    const bestMatch = chunks[bestMatchIndex];

    console.log('Best match:', bestMatch);
}

main().catch((err) => {
    console.error('The sample encountered an error:', err);
});

module.exports = { main };