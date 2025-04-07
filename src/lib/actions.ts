"use server";

import { User } from "@/types/User";
import { dynamoDb, s3Client } from "./dynamodb";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { PutObjectCommand } from "@aws-sdk/client-s3";

export async function fetchUsers(): Promise<User[]> {
  try {
    const params = { TableName: "User" };
    const command = new ScanCommand(params);
    const data = await dynamoDb.send(command);

    return data.Items as User[];
  } catch (error) {
    console.error("DynamoDB Fetch Error:", error);
    throw new Error("Failed to fetch users");
  }
}

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
