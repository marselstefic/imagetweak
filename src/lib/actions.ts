"use server";

import { ImageMetaData } from "@/types/ImageMetaData";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { PutCommand, PutCommandOutput, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDb, s3Client } from "./dynamodb";
import { ImageDatatype } from "@/types/ImageDatatype";

export async function uploadImage(imageData: ImageDatatype): Promise<PutCommandOutput> {
  try {
    const names = Object.keys(imageData.image);
    const base64Encodes = Object.values(imageData.image);
    for(let i = 0; i < names.length; i++){
      const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: `uploads/${names[i]}`,
        Body: base64Encodes,
        ContentType: image.type,
      };
  
      const command = new PutObjectCommand(params);
  
      await s3Client.send(command);
    }
    

    return `https://${params.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
  } catch (error) {
    console.error("S3 Upload Error:", error);
    throw new Error("Failed to upload image");
  }
}

export async function uploadImageMetaData(imageMetaData: ImageMetaData): Promise<PutCommandOutput> {
  
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

    console.log("Amount of items: ", Items?.length ?? 0)

    allImages = Items?.flatMap(item => item.uploadedImage ?? []) ?? [];

  }catch (error) {
    console.error("Dynamo Db fetching failed:", error);
    throw new Error("Failed to fetch image meta data");
  }

  const imageReceived = []

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