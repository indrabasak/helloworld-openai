import os
from common.file_embeddings import FileEmbeddings

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
