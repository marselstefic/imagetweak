"use server";

import { ImageMetaData } from "@/types/ImageMetaData";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  PutCommand,
  PutCommandOutput,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { dynamoDb, s3Client } from "./dynamodb";

type UploadImageParams = {
  imageMetaData: ImageMetaData;
  files: Array<{
    buffer: Buffer | Uint8Array;
    name: string;
    contentType: string;
  }>;
};

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
    Key: `${Date.now()}-${fileName}`,
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

export async function fetchImage(user: string): Promise<string[] | null> {
  let allImages: string[];
  try {
    const command = new QueryCommand({
      TableName: "ImageMetaData",
      IndexName: "user-index", // <-- must match the GSI name
      KeyConditionExpression: "#usr = :userVal",
      ExpressionAttributeNames: {
        "#usr": "user",
      },
      ExpressionAttributeValues: {
        ":userVal": user,
      },
      ProjectionExpression: "uploadedImage",
    });

    const { Items } = await dynamoDb.send(command);

    console.log("Amount of items: ", Items?.length ?? 0);

    allImages = Items?.flatMap((item) => item.uploadedImage ?? []) ?? [];
  } catch (error) {
    console.error("Dynamo Db fetching failed:", error);
    throw new Error("Failed to fetch image meta data");
  }

  const imageReceived = [];

  for (const imageKey of allImages) {
    try {
      const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: imageKey,
      };

      const command = new GetObjectCommand(params);
      const result = await s3Client.send(command);

      const base64String = await streamToString(result.Body);
      imageReceived.push(base64String);
    } catch (error) {
      console.error("S3 Fetch Error:", error);
      throw new Error("Failed to fetch image");
    }
  }

  return imageReceived.length > 0 ? imageReceived : null;
}

export async function streamToString(stream: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on("data", (chunk: Uint8Array) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    stream.on("error", reject);
  });
}
