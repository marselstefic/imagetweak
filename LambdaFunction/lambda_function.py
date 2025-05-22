import json
import uuid
import base64
import boto3
import cv2
import numpy as np
from io import BytesIO
from datetime import datetime
from botocore.exceptions import ClientError
import traceback

s3 = boto3.client("s3")
BUCKET_NAME = "image-tweak-bucket"

dynamodb = boto3.resource('dynamodb', region_name='eu-central-1')
table = dynamodb.Table('ImageMetaData')

def lambda_handler(event, context):
    http_method = event.get("requestContext", {}).get("http", {}).get("method", "")

    if http_method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": cors_headers(),
            "body": ""
        }

    elif http_method == "POST":
        try:
            body_raw = event.get("body", "{}")
            print(f"Request body length: {len(body_raw)}")  # Debug payload size
            body = json.loads(body_raw)

            image_list = body.get("image", {})
            brightness = max(0, min(100, body.get("brightness", 50)))
            contrast = max(0, min(100, body.get("contrast", 50)))
            saturation = max(0, min(100, body.get("saturation", 50)))
            rotation = body.get("rotationState", 0)
            overwrittenFilename = body.get("overwrittenFilename", "")
            uploadId = body.get("uploadId", "")

            print(f"Upload ID: {uploadId}") 
            print(f"image_list: {image_list}") 

            if not uploadId:
                return error_response(400, "Missing uploadId")

            if not isinstance(image_list, dict) or not image_list:
                return error_response(400, f"No images provided. Type: {type(image_list).__name__}")

            imageFileNames = []
            uploaded_urls = []

            for filename_key, image_data in image_list.items():
                raw_data = base64.b64decode(image_data.split(",")[-1])
                np_arr = np.frombuffer(raw_data, np.uint8)
                image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

                if image is None:
                    return error_response(400, "Invalid image format")

                # Rotate
                (h, w) = image.shape[:2]
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, rotation, 1.0)
                image = cv2.warpAffine(image, M, (w, h))

                # Brightness and Contrast
                alpha = contrast / 50
                beta = (brightness - 50) * 2
                image = cv2.convertScaleAbs(image, alpha=alpha, beta=beta)

                # Saturation
                hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV).astype(np.float32)
                sat_scale = saturation / 50
                hsv[:, :, 1] *= sat_scale
                hsv[:, :, 1] = np.clip(hsv[:, :, 1], 0, 255)
                hsv[:, :, 2] = np.clip(hsv[:, :, 2], 0, 255)
                image = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)

                # Encode to JPEG
                _, buffer = cv2.imencode('.jpg', image)
                byte_buffer = BytesIO(buffer.tobytes())

                # File naming
                base_name = overwrittenFilename or filename_key
                newUuid = uuid.uuid4()
                file_key = f"{base_name}_{str(newUuid)}.jpg"
                imageFileNames.append(file_key)

                # Upload to S3
                s3.put_object(
                    Bucket=BUCKET_NAME,
                    Key=f"uploads/{file_key}",
                    Body=byte_buffer,
                    ContentType="image/jpeg"
                )
                uploaded_urls.append(f"https://{BUCKET_NAME}.s3.amazonaws.com/uploads/{file_key}")
        except Exception as e:
            error_msg = f"Unexpected error [{type(e).__name__}]: {str(e)}\n{traceback.format_exc()}"
            print(error_msg)
            return error_response(500, error_msg)

        try:
            response = table.update_item(
                Key={
                    'uploadId': uploadId,
                },
                UpdateExpression="SET uploadedImage = :newVal",
                ExpressionAttributeValues={
                    ':newVal': imageFileNames
                },
                ReturnValues="UPDATED_NEW"
            )
            print("DynamoDB update succeeded:", response)
            return {
                "statusCode": 200,
                "body": json.dumps({"uploaded": uploaded_urls}),
                "headers": cors_headers()
            }
        except ClientError as e:
            error_msg = "Image metaData upload failed: " + e.response['Error']['Message']
            print(error_msg)
            return error_response(500, error_msg)

    elif http_method == "DELETE":
        body = json.loads(event.get("body", "{}"))
        image_list = body.get("image", {})
        uploadId = body.get("uploadId", "")

        try:
            response = table.delete_item(
                Key={
                    'uploadId': uploadId,
                },
            )
            print("Delete response:", response)
            return {
                "statusCode": 200,
                "body": json.dumps({
                    "message": "File deleted successfully.",
                }),
            }
        except ClientError as e:
            error_msg = "Delete failed: " + e.response['Error']['Message']
            print(error_msg)
            return error_response(500, error_msg)

    else:
        return error_response(405, "Method not allowed. Only POST supported.")

def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
        "Content-Type": "application/json"
    }

def error_response(code, message):
    return {
        "statusCode": code,
        "body": json.dumps({"error": message}),
        "headers": cors_headers()
    }
