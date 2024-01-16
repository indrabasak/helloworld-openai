# must be called as we're using zipped requirements
try:
    import unzip_requirements
except ImportError:
    pass

import json


def handler(event, context):
    body = {
        "message": "Go Serverless v3.0! Your function executed successfully!",
        "input": event,
    }

    response = {"statusCode": 200, "body": json.dumps(body)}

    return response
