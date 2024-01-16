import os

from azure.identity import ClientSecretCredential
from langchain.chains import (
    RetrievalQA, ConversationalRetrievalChain
)
from langchain.text_splitter import CharacterTextSplitter
from langchain_community.document_loaders import TextLoader
from langchain_community.vectorstores import FAISS
from langchain_openai import AzureChatOpenAI
from langchain_openai import AzureOpenAIEmbeddings


class FileEmbeddings:
    # Azure constants
    scope = "https://cognitiveservices.azure.com/.default"
    api_base = "https://cog-sandbox-dev-eastus2-001.openai.azure.com/"
    api_type = "azure_ad"
    api_version = "2023-03-15-preview"
    embeddings_deployment = "text-embedding-ada-002-blue"
    embeddings_model = "text-embedding-ada-002"
    llm_deployment = "gpt-4-turbo-blue"

    def __init__(self, tenant_id, client_id, client_secret):
        self.tenant_id = tenant_id
        self.client_id = client_id
        self.client_secret = client_secret

        self.credential = ClientSecretCredential(
            tenant_id=self.tenant_id,
            client_id=self.client_id,
            client_secret=self.client_secret,
        )

    def get_chain(self, file_path):
        documents = self.__get_documents(file_path)
        token = self.__get_auth_token().token
        embeddings = self.__get_embeddings(token)
        llm = self.__get_llm(token)

        # Embed chunks and load them into the vector store
        # db = Milvus.from_documents(documents, embeddings)
        db = FAISS.from_documents(documents, embeddings)
        # db = Chroma.from_documents(documents, embeddings)
        print("----------------")

        chain = RetrievalQA.from_chain_type(
            llm=llm,
            retriever=db.as_retriever(),
        )

        return chain

    def get_conversational_chain(self, file_path):
        documents = self.__get_documents(file_path)
        token = self.__get_auth_token().token
        embeddings = self.__get_embeddings(token)
        llm = self.__get_llm(token)

        # Embed chunks and load them into the vector store
        db = FAISS.from_documents(documents, embeddings)

        return ConversationalRetrievalChain.from_llm(
            llm=llm,
            retriever=db.as_retriever(),
            return_source_documents=True,
            verbose=False
        )

    def __get_auth_token(self):
        return self.credential.get_token(self.scope)

    def __get_embeddings(self, token):
        embeddings = AzureOpenAIEmbeddings(
            azure_endpoint=self.api_base,
            # openai_api_base=self.api_base,
            openai_api_type=self.api_type,
            openai_api_key=token,
            openai_api_version=self.api_version,
            deployment=self.embeddings_deployment,
            model=self.embeddings_model,
            chunk_size=16,
        )

        return embeddings

    def __get_llm(self, token):
        llm = AzureChatOpenAI(
            azure_endpoint=self.api_base,
            # openai_api_base=self.api_base,
            openai_api_version=self.api_version,
            openai_api_type=self.api_type,
            openai_api_key=token,
            deployment_name=self.llm_deployment
        )

        return llm

    @staticmethod
    def __get_documents(file_path):
        # Load data into the loader
        loader = TextLoader(file_path)
        print("!!!!!!!!!!!!!!!!!")
        raw_documents = loader.load()
        text_splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        documents = text_splitter.split_documents(raw_documents)

        return documents


if __name__ == "__main__":
    file_embeddings = FileEmbeddings("67bff79e-7f91-4433-a8e5-c9252d2ddc1d", "c557f349-d1b7-4402-b8ff-8810842a6a2b",
                                     "qSd8Q~i.upAcCioTvmgLaNMw~zA2M1OvCrm1Gaw0")
    print("Current working directory:", os.getcwd())
    chain = file_embeddings.get_chain("data/state_of_the_union.txt")

    query = "\nWhat is the main point of the transcript?"
    result = chain({"query": query})
    print(query)
    print(result["result"])

    query = "\nWhat is the speaker's tone throughout the transcript?"
    result = chain({"query": query})
    print(query)
    print(result["result"])

    conv_chain = file_embeddings.get_conversational_chain("data/state_of_the_union.txt")
    chat_history = []

    query = "\nWhat is the main point of the transcript?"
    result = conv_chain({"question": query, "chat_history": chat_history})
    print(query)
    print(result["answer"])

    query = "\nWhat is the speaker's tone throughout the transcript?"
    result = conv_chain({"question": query, "chat_history": chat_history})
    print(query)
    print(result["answer"])
