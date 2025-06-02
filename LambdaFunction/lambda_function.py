import json
import uuid
import boto3
import cv2
import numpy as np
from io import BytesIO
from PIL import Image
from datetime import datetime
from botocore.exceptions import ClientError
import traceback

s3 = boto3.client("s3")
BUCKET_NAME = "image-tweak-bucket"

dynamodb = boto3.resource("dynamodb", region_name="eu-central-1")
table = dynamodb.Table("ImageMetaData")

SUPPORTED_FORMATS = {
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp"
}

def safe_float(val, default):
    try:
        return float(val)
    except (TypeError, ValueError):
        return default

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

            uploadId = body.get("uploadId", "")
            imageNames = body.get("imageName", [])
            imageParameters = body.get("imageParameters", {})

            if not uploadId or not imageNames:
                return error_response(400, "Missing uploadId or imageName")

            overwrittenFilename = imageParameters.get("overwrittenFilename", "")
            format = imageParameters.get("format", "").lower()
            brightness = max(0, min(100, safe_float(imageParameters.get("brightness"), 50)))
            contrast = max(0, min(100, safe_float(imageParameters.get("contrast"), 50)))
            saturation = max(0, min(100, safe_float(imageParameters.get("saturation"), 50)))
            rotation = safe_float(imageParameters.get("rotationState"), 0)
            resX = int(imageParameters.get("resX", 512))
            resY = int(imageParameters.get("resY", 512))
            opacity = max(0, min(100, safe_float(imageParameters.get("opacity"), 100)))
            if format not in SUPPORTED_FORMATS:
                format = None

            print(f"UploadId: {uploadId}\n imageNames: {imageNames}\n imageParameters: {imageParameters}")

            imageFileNames = []
            uploaded_urls = []

            for image_key in imageNames:
                print(f"Starting processing for image: {image_key}")
                response = s3.get_object(Bucket=BUCKET_NAME, Key=image_key)
                file_obj = response.get("Body")

                if file_obj is None:
                    raise ValueError(f"S3 object body is None for key {image_key}")

                file_bytes = file_obj.read()
                if not file_bytes:
                    raise ValueError(f"S3 object body is empty for key {image_key}")

                pil_image = Image.open(BytesIO(file_bytes))
                original_format = pil_image.format.lower()
                if original_format not in SUPPORTED_FORMATS:
                    return error_response(400, f"Unsupported image format: {original_format}")
                print("Original image loaded.")

                # Resize
                new_size = (resX, resY)
                pil_image = pil_image.resize(new_size, Image.Resampling.LANCZOS)
                print(f"Image resized to {new_size}.")

                # Convert to OpenCV
                image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
                print("Image converted to OpenCV.")

                # Rotate
                (h, w) = image.shape[:2]
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, rotation, 1.0)
                image = cv2.warpAffine(image, M, (w, h))
                print(f"Image rotated by {rotation} degrees.")

                # Brightness and Contrast
                alpha = contrast / 50
                beta = (brightness - 50) * 2
                image = cv2.convertScaleAbs(image, alpha=alpha, beta=beta)
                print(f"Brightness and contrast adjusted: alpha={alpha}, beta={beta}.")

                # Saturation
                hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV).astype(np.float32)
                hsv[:, :, 1] *= (saturation / 50)
                hsv[:, :, 1:] = np.clip(hsv[:, :, 1:], 0, 255)
                image = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
                print(f"Saturation adjusted by factor: {saturation / 50}.")

                # Convert back to PIL
                result_pil = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
                result_pil = result_pil.convert("RGBA")
                print("Image converted back to PIL format with RGBA.")

                if opacity < 100:
                    alpha_val = int(opacity * 2.55)
                    alpha_channel = Image.new("L", result_pil.size, alpha_val)
                    result_pil.putalpha(alpha_channel)
                    print(f"Opacity applied: {opacity}% ({alpha_val}/255).")
                else:
                    print("Opacity unchanged (100%).")


                # Operations done -> saving image
                file_ext = format or (original_format if original_format in SUPPORTED_FORMATS else "jpg")
                new_uuid = str(uuid.uuid4())
                base_name = overwrittenFilename or image_key.split("/")[-1].split(".")[0]
                new_filename = f"{base_name}_{new_uuid}.{file_ext}"
                s3_key = new_filename
                imageFileNames.append(new_filename)

                buffer = BytesIO()
                result_pil.save(buffer, format=file_ext.upper())
                buffer.seek(0)
                print(f"Image saved to buffer in format: {file_ext.upper()}.")

                s3.put_object(
                    Bucket=BUCKET_NAME,
                    Key=s3_key,
                    Body=buffer,
                    ContentType=SUPPORTED_FORMATS[file_ext]
                )
                print(f"Image uploaded to S3 as: {s3_key}")

                uploaded_urls.append(f"https://{BUCKET_NAME}.s3.amazonaws.com/{s3_key}")
                print(f"Processed and uploaded image: {new_filename}")

            return {
                "statusCode": 200,
                "body": json.dumps({
                    "message": "Images processed successfully",
                    "filenames": imageFileNames,
                    "urls": uploaded_urls
                }),
                "headers": cors_headers()
            }

        except Exception as e:
            error_msg = f"Unexpected error [{type(e).__name__}]: {str(e)}\n{traceback.format_exc()}"
            print(error_msg)
            return error_response(500, error_msg)

    elif http_method == "DELETE":
        return error_response(405, "DELETE not implemented")

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
