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
    "jpg": "JPEG",
    "jpeg": "JPEG",
    "png": "PNG",
    "webp": "WEBP",
}

MIME_TYPES = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
}

def safe_float(val, default):
    try:
        return float(val)
    except (TypeError, ValueError):
        return default

def adjust_brightness_contrast(image, brightness, contrast):
    alpha = max(0.01, contrast / 50)
    beta = (brightness - 50) * 2
    return cv2.convertScaleAbs(image, alpha=alpha, beta=beta)

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
            image_keys = body.get("imageName", [])
            imageParameters = body.get("imageParameters", {})

            if not uploadId or not image_keys:
                return error_response(400, "Missing uploadId or imageName")

            overwrittenFilenames = imageParameters.get("overwrittenFilename", [])
            resXs = imageParameters.get("resX", [])
            resYs = imageParameters.get("resY", [])
            rotationStates = imageParameters.get("rotationState", [])
            brightnesses = imageParameters.get("brightness", [])
            contrasts = imageParameters.get("contrast", [])
            saturations = imageParameters.get("saturation", [])
            opacities = imageParameters.get("opacity", [])
            outputFormats = imageParameters.get("outputFormat", [])
            filters = imageParameters.get("filter", []) 

            imageFileNames = []
            uploaded_urls = []

            for i, image_key in enumerate(image_keys):
                print(f"Starting processing for image: {image_key}")

                response = s3.get_object(Bucket=BUCKET_NAME, Key=image_key)
                file_obj = response.get("Body")
                if file_obj is None:
                    raise ValueError(f"S3 object body is None for key {image_key}")

                file_bytes = file_obj.read()
                if not file_bytes:
                    raise ValueError(f"S3 object body is empty for key {image_key}")

                pil_image = Image.open(BytesIO(file_bytes))
                original_format = pil_image.format
                if not original_format or original_format.lower() not in SUPPORTED_FORMATS:
                    return error_response(400, f"Unsupported or unrecognized image format: {original_format}")
                original_format = original_format.lower()
                print("Original image loaded.")

                overwrittenFilename = overwrittenFilenames[i] if i < len(overwrittenFilenames) else ""
                output_format = outputFormats[i].lower() if i < len(outputFormats) else ""
                brightness_arr = brightnesses[i] if i < len(brightnesses) else [50]
                contrast_arr = contrasts[i] if i < len(contrasts) else [50]
                saturation_arr = saturations[i] if i < len(saturations) else [50]
                opacity_arr = opacities[i] if i < len(opacities) else [100]
                rotation = float(rotationStates[i]) if i < len(rotationStates) else 0
                resX = int(resXs[i]) if i < len(resXs) else 512
                resY = int(resYs[i]) if i < len(resYs) else 512

                brightness = max(0, min(100, safe_float(brightness_arr[0], 50)))
                contrast = max(0, min(100, safe_float(contrast_arr[0], 50)))
                saturation = max(0, min(100, safe_float(saturation_arr[0], 50)))
                opacity = max(0, min(100, safe_float(opacity_arr[0], 100)))

                file_ext = output_format or (original_format if original_format in SUPPORTED_FORMATS else "jpg")
                pillow_format = SUPPORTED_FORMATS.get(file_ext.lower(), "PNG")

                new_size = (resX, resY)
                pil_image = pil_image.resize(new_size, Image.Resampling.LANCZOS)
                print(f"Image resized to {new_size}.")

                image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
                print("Image converted to OpenCV.")

                (h, w) = image.shape[:2]
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, rotation, 1.0)
                image = cv2.warpAffine(image, M, (w, h))
                print(f"Image rotated by {rotation} degrees.")

                image = adjust_brightness_contrast(image, brightness, contrast)
                print(f"Brightness and contrast adjusted.")

                hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV).astype(np.float32)
                hsv[:, :, 1] *= (saturation / 50)
                hsv[:, :, 1:] = np.clip(hsv[:, :, 1:], 0, 255)
                image = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
                print(f"Saturation adjusted.")

                # NEW: Apply filter if specified
                selected_filter = filters[i].lower() if i < len(filters) else ""
                if selected_filter == "grayscale":
                    image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                    image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
                    print("Grayscale filter applied.")
                elif selected_filter == "sepia":
                    sepia_filter = np.array([[0.272, 0.534, 0.131],
                                            [0.349, 0.686, 0.168],
                                            [0.393, 0.769, 0.189]])
                    image = cv2.transform(image, sepia_filter)
                    image = np.clip(image, 0, 255).astype(np.uint8)
                    print("Sepia filter applied.")
                elif selected_filter == "blur":
                    image = cv2.GaussianBlur(image, (9, 9), 0)
                    print("Blur filter applied.")
                elif selected_filter == "invert":
                    image = cv2.bitwise_not(image)
                    print("Invert filter applied.")
                elif selected_filter == "sharpen":
                    kernel = np.array([[0, -1, 0],
                                    [-1, 5,-1],
                                    [0, -1, 0]])
                    image = cv2.filter2D(image, -1, kernel)
                    print("Sharpen filter applied.")
                else:
                    print("No valid filter applied or filter skipped.")

                hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV).astype(np.float32)
                hsv[:, :, 1] *= (saturation / 50)
                hsv[:, :, 1:] = np.clip(hsv[:, :, 1:], 0, 255)
                image = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
                print(f"Saturation adjusted.")

                result_pil = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))

                if opacity < 100 and pillow_format not in ["JPEG", "JPG"]:
                    result_pil = result_pil.convert("RGBA")
                    alpha_val = int(opacity * 2.55)
                    alpha_channel = Image.new("L", result_pil.size, alpha_val)
                    result_pil.putalpha(alpha_channel)
                    print(f"Opacity applied: {opacity}% ({alpha_val}/255).")
                else:
                    result_pil = result_pil.convert("RGB")
                    print("Opacity unchanged or JPEG format; converted to RGB.")

                #new_uuid = str(uuid.uuid4())
                base_name = overwrittenFilename or image_key.split("/")[-1].split(".")[0]
                new_filename = f"{base_name}.{file_ext}"
                s3_key = new_filename
                imageFileNames.append(new_filename)

                buffer = BytesIO()
                result_pil.save(buffer, format=pillow_format)
                buffer.seek(0)
                print(f"Image saved to buffer in format: {file_ext.upper()}.")

                s3.put_object(
                    Bucket=BUCKET_NAME,
                    Key=s3_key,
                    Body=buffer,
                    ContentType=MIME_TYPES.get(file_ext.lower(), "image/png")
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
