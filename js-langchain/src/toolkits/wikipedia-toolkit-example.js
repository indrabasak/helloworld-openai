const { WikipediaQueryRun } = require('@langchain/community/tools/wikipedia_query_run');

async function main() {
  const tool = new WikipediaQueryRun({
    topKResults: 3,
    maxDocContentLength: 4000,
  });

  let res = await tool.invoke('Langchain');
  console.log(res);

  res = await tool.invoke('Hubley Toy');
  console.log(res);
}

main().catch((err) => {
  console.error('The sample encountered an error:', err);
});

module.exports = { main };