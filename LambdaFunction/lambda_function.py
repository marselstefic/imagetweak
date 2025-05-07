import json
import uuid
import base64
import boto3
import cv2
import numpy as np
from io import BytesIO
from datetime import datetime
from botocore.exceptions import ClientError

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
            body = json.loads(event.get("body", "{}"))
            image_list = body.get("image", {})
            brightness = max(0, min(100, body.get("brightness", 50)))
            contrast = max(0, min(100, body.get("contrast", 50)))
            saturation = max(0, min(100, body.get("saturation", 50)))
            rotation = body.get("rotationState", 0)
            timestamp = datetime.now().strftime("%d_%m_%Y_%H_%M_%S")
            overwrittenFilename = body.get("overwrittenFilename", "")
            uploadId = body.get("uploadId", "")


            if not isinstance(image_list, dict) or not image_list:
                return error_response(400, "No images provided: " + type(image_list).__name__ + image_list)

            multipleImages = len(image_list) > 1
            counter = 1
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
                sat_scale = saturation / 50  # 1.0 = neutral
                hsv[:, :, 1] *= sat_scale
                hsv[:, :, 1] = np.clip(hsv[:, :, 1], 0, 255)
                hsv[:, :, 2] = np.clip(hsv[:, :, 2], 0, 255) 
                image = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)

                # Encode to JPEG
                _, buffer = cv2.imencode('.jpg', image)
                byte_buffer = BytesIO(buffer.tobytes())

                # File naming
                base_name = overwrittenFilename or filename_key
                suffix = f"-{counter}" if multipleImages else ""
                file_key = f"uploads/{base_name}{suffix}_{timestamp}.jpg"

                # Upload to S3
                s3.put_object(
                    Bucket=BUCKET_NAME,
                    Key=file_key,
                    Body=byte_buffer,
                    ContentType="image/jpeg"
                )
                uploaded_urls.append(f"https://{BUCKET_NAME}.s3.amazonaws.com/{file_key}")
                counter += 1

            try:
                response = table.update_item(
                Key={
                    'uploadId': uploadId,
                },
                UpdateExpression="SET uploadedImage = :newVal",
                ExpressionAttributeValues={
                    ':newVal': list(image_list.keys())
                },
                ReturnValues="UPDATED_NEW"
                )
                print("Update succeeded:", response)
                return {
                    "statusCode": 200,
                    "body": json.dumps({"uploaded": uploaded_urls}),
                    "headers": cors_headers()
                }
            except ClientError as e:
                print("Update failed:", e.response['Error']['Message'])
                raise
        except Exception as e:
            return error_response(500, str(e))

    elif http_method == "DELETE":
        body = json.loads(event.get("body", "{}"))
        image_list = body.get("image", {})
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
                    "deletedUrl": f"https://{BUCKET_NAME}.s3.amazonaws.com/{uploadId}"
                }),
            }
        except ClientError as e:
            print("Delete failed:", e.response['Error']['Message'])
            raise
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
