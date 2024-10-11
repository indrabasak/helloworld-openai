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

async function main(){
  console.log('start request 1 ----------------------------------');
  const response = await fetch(`http://localhost:${port}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      question: 'What are the prerequisites for this course?',
      session_id: '1', // Should randomly generate/assign
    })
  });

// response.body is a ReadableStream
  const reader = response.body?.getReader();

  for await (const chunk of readChunks(reader)) {
    console.log('CHUNK:', chunk);
  }

  console.log('end response 1 ----------------------------------');
  await sleep();

  console.log('start request 2 ----------------------------------');
  const response2 = await fetch(`http://localhost:${port}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      question: 'Can you list them in bullet point format?',
      session_id: '1', // Should randomly generate/assign
    })
  });

// response.body is a ReadableStream
  const reader2 = response2.body?.getReader();

  for await (const chunk of readChunks(reader2)) {
    console.log('CHUNK:', chunk);
  }

  console.log('end response 2 ----------------------------------');
  await sleep();

  console.log('start request 3 ----------------------------------');
  const response3 = await fetch(`http://localhost:${port}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      question: 'What did I just ask you?',
      session_id: '2', // Should randomly generate/assign
    })
  });

// response.body is a ReadableStream
  const reader3 = response3.body?.getReader();

  for await (const chunk of readChunks(reader3)) {
    console.log('CHUNK:', chunk);
  }

  console.log('end response 3 ----------------------------------');
  await sleep();
}

main().catch((err) => {
  console.error('The sample encountered an error:', err);
});

module.exports = { main };