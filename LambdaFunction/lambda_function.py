import json
import uuid
import base64
import boto3
import cv2
import numpy as np
from io import BytesIO

s3 = boto3.client("s3")
BUCKET_NAME = "image-tweak-bucket"

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
            image_list = body.get("image", [])
            brightness = body.get("brightness", 100)
            contrast = body.get("contrast", 100)
            saturation = body.get("saturation", 100)
            rotation = body.get("rotationState", 0)

            if not isinstance(image_list, list) or not image_list:
                return error_response(400, "No images provided")

            uploaded_urls = []

            for image_data in image_list:
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

                # Brightness and Contrast adjustment
                alpha = contrast / 100.0  # Contrast control (1.0 = original)
                beta = (brightness - 100) * 1.0  # Brightness control (0 = original)
                image = cv2.convertScaleAbs(image, alpha=alpha, beta=beta)

                # Saturation adjustment
                hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV).astype(np.float32)
                hsv[:, :, 1] *= saturation / 100.0
                hsv[:, :, 1] = np.clip(hsv[:, :, 1], 0, 255)
                image = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)

                # Encode to JPEG
                _, buffer = cv2.imencode('.jpg', image)
                byte_buffer = BytesIO(buffer.tobytes())

                # Upload to S3
                file_key = f"uploads/{uuid.uuid4()}.jpg"
                s3.put_object(
                    Bucket=BUCKET_NAME,
                    Key=file_key,
                    Body=byte_buffer,
                    ContentType="image/jpeg"
                )
                uploaded_urls.append(f"https://{BUCKET_NAME}.s3.amazonaws.com/{file_key}")

            return {
                "statusCode": 200,
                "body": json.dumps({"uploaded": uploaded_urls}),
                "headers": cors_headers()
            }

        except Exception as e:
            return error_response(500, str(e))

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
