node --env-file .env.img src/images/generate-image.js
node --env-file .env.local src/embeddings/generate-embeddings.js
node --env-file .env.local src/completions/summarize-text.js
node --env-file .env.local src/completions/chat-tool-weather.js
node --env-file .env.local src/completions/chat-tool.js