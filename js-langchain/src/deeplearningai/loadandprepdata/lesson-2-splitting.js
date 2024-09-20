const { CharacterTextSplitter, RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const {PDFLoader} = require('@langchain/community/document_loaders/fs/pdf');

async function main() {
    console.log('== Lesson 2 - Loading & Preparing Data: Splitter Example ==');

    const splitter = RecursiveCharacterTextSplitter.fromLanguage('js', {
        chunkSize: 32,
        chunkOverlap: 0,
    });

    const code = `function helloWorld() {
        console.log("Hello, World!");
    }
    // Call the function
    helloWorld();`;

    const result = await splitter.splitText(code);
    console.log(result);

    // naive splitter
    const splitter2 = new CharacterTextSplitter({
        chunkSize: 32,
        chunkOverlap: 0,
        separator: ' '
    });

    const result2 = await splitter2.splitText(code);
    console.log(result2);

    // bigger chunk size and more overlapping
    const splitter3 = RecursiveCharacterTextSplitter.fromLanguage('js', {
        chunkSize: 64,
        chunkOverlap: 32,
    });

    const result3 = await splitter3.splitText(code);
    console.log(result3);

    const pdfLoader = new PDFLoader('./data/MachineLearning-Lecture01.pdf');
    const rawCS229Docs = await pdfLoader.load();
    const splitter4 = new RecursiveCharacterTextSplitter({
        chunkSize: 512,
        chunkOverlap: 64,
    });
    const splitDocs = await splitter4.splitDocuments(rawCS229Docs);

    console.log(splitDocs.slice(0, 5));
}

main().catch((err) => {
    console.error('The sample encountered an error:', err);
});

module.exports = { main };