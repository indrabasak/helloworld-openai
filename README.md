Hello World OpenAI
===================================
This project presents simple examples of ChatGPT utilizing various libraries. 

Folder descriptions:
 - **js-azure-openai** contains samples using [Azure OpenAI SDK](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/openai/openai/README.md)
 - **js-langchain** contains samples using [Langchain.js](https://v03.api.js.langchain.com/index.html)

## Milvus 
[Milvus](https://github.com/milvus-io/milvus) is an open-source vector database used for saving embeddings and can
be used in AI applications. You can run Milvus database locally as a docker container by using the installation script
made available by the Milvus org. The scrip is this repository is located within the **milvus** folder.

To start the Docker container in the MacOS, execute the following command,
```bash
bash standalone_embed.sh start
```
The docker container starts up at port 19530.

### Attu Server
docker run -p 8000:3000 -e MILVUS_URL={milvus server IP}:19530 zilliz/attu:v2.4
172.17.0.2:19530

## SQLite
https://database.guide/2-sample-databases-sqlite/

Chinook Database
https://github.com/lerocha/chinook-database

from sqlite folder
sqlite3 chinook.db
.read Chinook_Sqlite.sql