"use server";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { dynamoDb, s3Client } from "./dynamodb";
import { ImageMetaData } from "@/types/ImageMetaData";
import { GetCommand, PutCommand, PutCommandOutput } from "@aws-sdk/lib-dynamodb";

export async function uploadImage(file: File): Promise<string> {
  try {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: `uploads/${file.name}`,
      Body: file,
      ContentType: file.type,
    };

    const command = new PutObjectCommand(params);

    await s3Client.send(command);

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

export async function fetchImage(file: File): Promise<string> {

  const command = new GetCommand({
    TableName: "ImageMetaData",
    Item: imageMetaData,
  });

  const response = await dynamoDb.send(command);
  return response;

  try {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: `uploads/${file.name}`,
      Body: file,
      ContentType: file.type,
    };

    const command = new PutObjectCommand(params);

    await s3Client.send(command);

    return `https://${params.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
  } catch (error) {
    console.error("S3 Upload Error:", error);
    throw new Error("Failed to upload image");
  }
}