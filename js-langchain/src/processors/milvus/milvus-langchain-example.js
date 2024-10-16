const { Milvus } = require('@langchain/community/vectorstores/milvus');
const { ClientSecretCredential, getBearerTokenProvider } = require('@azure/identity');
const { AzureOpenAIEmbeddings } = require('@langchain/openai');

async function main() {
  const credential =
    new ClientSecretCredential(process.env.AZURE_TENANT_ID,
      process.env.AZURE_CLIENT_ID,
      process.env.AZURE_CLIENT_SECRET,
      {
        authorityHost: process.env.AZURE_AUTHORITY_HOST
      }
    );
  const scope = 'https://cognitiveservices.azure.com/.default';
  const azureADTokenProvider = getBearerTokenProvider(credential, scope);

  const embeddings = new AzureOpenAIEmbeddings({
    azureADTokenProvider,
    azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
    // azureOpenAIApiDeploymentName: 'text-embedding-ada-002-blue',
    azureOpenAIApiEmbeddingsDeploymentName: 'text-embedding-ada-002-blue',
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    // chunkSize: 16
  });

  // text sample from Godel, Escher, Bach
  const vectorStore = await Milvus.fromTexts(
    [
      "Tortoise: Labyrinth? Labyrinth? Could it Are we in the notorious Little\
              Harmonic Labyrinth of the dreaded Majotaur?",
      "Achilles: Yiikes! What is that?",
      "Tortoise: They say-although I person never believed it myself-that an I\
              Majotaur has created a tiny labyrinth sits in a pit in the middle of\
              it, waiting innocent victims to get lost in its fears complexity.\
              Then, when they wander and dazed into the center, he laughs and\
              laughs at them-so hard, that he laughs them to death!",
      "Achilles: Oh, no!",
      "Tortoise: But it's only a myth. Courage, Achilles.",
    ],
    [{ id: 2 }, { id: 1 }, { id: 3 }, { id: 4 }, { id: 5 }],
    embeddings,
    {
      collectionName: "goldel_escher_bach",
    }
  );

  // or alternatively from docs
  // const vectorStore = await Milvus.fromDocuments(docs, new OpenAIEmbeddings(), {
  //   collectionName: "goldel_escher_bach",
  // });

  const response = await vectorStore.similaritySearch("scared", 2);
  console.log(response);
}

main().catch((err) => {
  console.error('The sample encountered an error:', err);
});

module.exports = { main };