"use server";

import { User } from "@/types/User";
import dynamoDb from "./dynamodb";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";

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
