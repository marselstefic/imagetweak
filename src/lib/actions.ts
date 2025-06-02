"use server";

import { ImageMetaData } from "@/types/ImageMetaData";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  DeleteCommand,
  PutCommand,
  PutCommandOutput,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { dynamoDb, s3Client } from "./dynamodb";

import sharp from "sharp";

export async function uploadImage(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  const resizedImageBuffer = await sharp(fileBuffer)
    .resize(400, 500) // Adjust dimensions as needed
    .toBuffer();

  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME as string,
    Key: fileName,
    Body: resizedImageBuffer,
    ContentType: contentType,
  };

  const command = new PutObjectCommand(params);
  await s3Client.send(command);

  return params.Key; // Return the S3 object key or URL if you build one
}

export async function uploadImageMetaData(
  imageMetaData: ImageMetaData
): Promise<PutCommandOutput> {
  const command = new PutCommand({
    TableName: "ImageMetaData",
    Item: imageMetaData,
  });

  const response = await dynamoDb.send(command);
  return response;
}

export async function fetchImage(
  user: string
): Promise<Map<string, string> | null> {
  let allImages: string[];
  try {
    const command = new QueryCommand({
      TableName: "ImageMetaData",
      IndexName: "user-index",
      KeyConditionExpression: "#usr = :userVal",
      ExpressionAttributeNames: {
        "#usr": "user",
      },
      ExpressionAttributeValues: {
        ":userVal": user,
      },
      ProjectionExpression: "imageName, startTime",
    });

    const { Items } = await dynamoDb.send(command);

    console.log("Amount of items: ", Items?.length ?? 0);

    const items = Items ?? [];

    //sorting by startTime (too lazy so I sort it in client)
    items.sort((a, b) => {
      const parseStartTime = (str: string) => {
        const [datePart, timePart] = str.split("_");
        const [day, month, year] = datePart.split(".").map(Number);
        const [hours, minutes, seconds] = timePart.split(":").map(Number);
        return new Date(year, month - 1, day, hours, minutes, seconds);
      };

      return (
        parseStartTime(b.startTime).getTime() -
        parseStartTime(a.startTime).getTime()
      );
    });

    allImages = items?.flatMap((item) => item.imageName ?? []) ?? [];
  } catch (error) {
    console.error("Dynamo Db fetching failed:", error);
    throw new Error("Failed to fetch image meta data");
  }

  const imageReceived: Map<string, string> = new Map();

  for (const imageKey of allImages) {
    try {
      const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: imageKey,
      };

      console.log("📦 Attempting S3 fetch for key:", imageKey);

      const command = new GetObjectCommand(params);
      const result = await s3Client.send(command);

      console.log("base64Strings:" + result.Body);
      const base64String = await streamToBase64(result.Body);
      imageReceived.set(imageKey, base64String);
    } catch (error) {
      console.error("S3 Fetch Error:", error);
      throw new Error("Failed to fetch image");
    }
  }

  return imageReceived.size > 0 ? imageReceived : null;
}

export async function deleteImageData(imageNameToDelete: string): Promise<void> {
  const bucketName = process.env.AWS_S3_BUCKET_NAME as string;

  console.log("TO DELETE: " + imageNameToDelete)

  // 1. Delete from S3
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: imageNameToDelete,
      })
    );
    console.log(`Deleted image from S3: ${imageNameToDelete}`);
  } catch (error) {
    console.error(`Error deleting image from S3: ${imageNameToDelete}`, error);
    throw new Error("Failed to delete image from S3.");
  }

  // 2. Find DynamoDB entry that contains this image name
  const scanCommand = new ScanCommand({
    TableName: "ImageMetaData",
    FilterExpression: "contains(imageName, :img)",
    ExpressionAttributeValues: {
      ":img": imageNameToDelete,
    },
  });

  const scanResult = await dynamoDb.send(scanCommand);

  if (!scanResult.Items || scanResult.Items.length === 0) {
    console.warn(`No DynamoDB entry found for image: ${imageNameToDelete}`);
    return;
  }

  // Assume only one match (you can extend this for multiple matches)
  const item = scanResult.Items[0];
  const { uploadId, imageName } = item;

  if (imageName.length === 1) {
    // 3a. Only one image in entry — delete the full item
    try {
      await dynamoDb.send(
        new DeleteCommand({
          TableName: "ImageMetaData",
          Key: { uploadId },
        })
      );
      console.log(`Deleted entire DynamoDB entry with uploadId: ${uploadId}`);
    } catch (err) {
      console.error(`Failed to delete DynamoDB entry with uploadId: ${uploadId}`, err);
      throw new Error("Failed to delete DynamoDB entry.");
    }
  } else {
    // 3b. Multiple images — remove just the imageName and update
    const updatedImageNames = imageName.filter((n: string) => n !== imageNameToDelete);

    try {
      await dynamoDb.send(
        new UpdateCommand({
          TableName: "ImageMetaData",
          Key: { uploadId },
          UpdateExpression: "SET imageName = :newList",
          ExpressionAttributeValues: {
            ":newList": updatedImageNames,
          },
        })
      );
      console.log(`Removed ${imageNameToDelete} from imageName array in DynamoDB`);
    } catch (err) {
      console.error(`Failed to update DynamoDB entry for uploadId: ${uploadId}`, err);
      throw new Error("Failed to update DynamoDB imageName array.");
    }
  }
}

export async function streamToBase64(stream: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on("data", (chunk: Uint8Array<ArrayBufferLike>) =>
      chunks.push(chunk)
    );
    stream.on("end", () => {
      const buffer = Buffer.concat(chunks);
      resolve(buffer.toString("base64")); // ✅ BASE64 conversion
    });
    stream.on("error", reject);
  });
}
