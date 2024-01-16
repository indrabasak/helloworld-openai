# must be called as we're using zipped requirements
try:
    import unzip_requirements
except ImportError:
    pass

import json

from common.file_embeddings import FileEmbeddings

file_embeddings = None
chain = None


def handler(event, context):
    global file_embeddings
    global chain

    print("1 -----------------------")
    if file_embeddings is None:
        print("1 ------- initialization start")
        file_embeddings = FileEmbeddings("67bff79e-7f91-4433-a8e5-c9252d2ddc1d", "c557f349-d1b7-4402-b8ff-8810842a6a2b",
                                         "qSd8Q~i.upAcCioTvmgLaNMw~zA2M1OvCrm1Gaw0")
        chain = file_embeddings.get_chain("data/state_of_the_union.txt")
        print("2 ------- initialization complete")

    data = json.loads(event["body"])
    if "query" in data:
        query = data["query"]
    else:
        return {'statusCode': 400, 'body': json.dumps("Query is missing")}

    # file_embeddings = FileEmbeddings("67bff79e-7f91-4433-a8e5-c9252d2ddc1d", "c557f349-d1b7-4402-b8ff-8810842a6a2b",
    #                                  "qSd8Q~i.upAcCioTvmgLaNMw~zA2M1OvCrm1Gaw0")
    # chain = file_embeddings.get_chain("data/state_of_the_union.txt")
    result = chain({"query": query})
    answer = result["result"]
    print(answer)

    print("2 -----------------------")
    response = {"statusCode": 200, "body": json.dumps(answer)}

    return response
