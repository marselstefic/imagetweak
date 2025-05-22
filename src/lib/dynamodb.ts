import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";

const awsConfig = {
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
  region: process.env.AWS_REGION || "eu-central-1",
};

// Initialize DynamoDB
const dynamoDbClient = new DynamoDBClient(awsConfig);
const dynamoDb = DynamoDBDocument.from(dynamoDbClient);

// Initialize S3
const s3Client = new S3Client(awsConfig);

export { dynamoDb, s3Client };
