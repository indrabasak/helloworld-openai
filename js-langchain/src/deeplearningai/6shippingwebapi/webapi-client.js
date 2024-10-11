const decoder = new TextDecoder();

const port = 3000;

// readChunks() reads from the provided reader and yields the results into an async iterable
function readChunks(reader) {
  return {
    async* [Symbol.asyncIterator]() {
      let readResult = await reader.read();
      while (!readResult.done) {
        yield decoder.decode(readResult.value);
        readResult = await reader.read();
      }
    },
  };
}

const sleep = async () => {
  return new Promise((resolve) => setTimeout(resolve, 500));
};

async function processRequest(question, sessionId) {
  const response = await fetch(`http://localhost:${port}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      question,
      session_id: sessionId // Should randomly generate/assign
    })
  });

// response.body is a ReadableStream
  const reader = response.body?.getReader();

  for await (const chunk of readChunks(reader)) {
    console.log('CHUNK:', chunk);
  }
}

async function main(){
  console.log('start request 1 ----------------------------------');
  await processRequest('What are the prerequisites for this course?', '1');
  console.log('end response 1 ----------------------------------');
  await sleep();

  console.log('start request 2 ----------------------------------');
  await processRequest('Can you list them in bullet point format?', '1');
  console.log('end response 2 ----------------------------------');
  await sleep();

  console.log('start request 3 ----------------------------------');
  await processRequest('What did I just ask you?', '2');
  console.log('end response 3 ----------------------------------');
  await sleep();
}

main().catch((err) => {
  console.error('The sample encountered an error:', err);
});

module.exports = { main };