const { GithubRepoLoader } = require('@langchain/community/document_loaders/web/github');
// Peer dependency
const parse = require('pdf-parse');
const { PDFLoader } = require('@langchain/community/document_loaders/fs/pdf');
// Peer dependency, used to support .gitignore syntax
const ignore = require('ignore');
require('dotenv').config();

async function main() {
    console.log('== Lesson 1 - Loading & Preparing Data: Loading Example ==');

    // Will not include anything under "ignorePaths"
    const loader = new GithubRepoLoader(
        'https://github.com/langchain-ai/langchainjs',
        { recursive: false, ignorePaths: ['*.md', 'yarn.lock'] }
    );

    const docs = await loader.load();
    console.log(docs.slice(0, 3));

    const pdfLoader = new PDFLoader('./data/MachineLearning-Lecture01.pdf');
    const rawCS229Docs = await pdfLoader.load();

    console.log(rawCS229Docs.slice(0, 5));
}

main().catch((err) => {
    console.error('The sample encountered an error:', err);
});

module.exports = { main };