import { NextResponse } from "next/server";
import { Webhook } from "svix"; // Used for webhook verification
import dynamoDb from "@/lib/dynamodb";
import { ClerkWebhookUserCreated } from "@/types/ClerkWebhookTypes";

const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET as string; // Set this in Vercel

export async function POST(req: Request) {
  const payload = await req.text();
  const headers = Object.fromEntries(req.headers.entries());
  try {
    const wh = new Webhook(CLERK_WEBHOOK_SECRET);
    const event = wh.verify(payload, headers) as ClerkWebhookUserCreated;

    console.log("Webhook received:", event);

    if (event.type === "user.created") {
      console.log("New user created:", event.data);
      await dynamoDb.put({
        TableName: "User",
        Item: {
          userId: event.data.id,
          username: event.data.username,
          email: event.data.email_addresses[0].email_address,
        },
      });

      return NextResponse.json({ message: "User added successfully!" });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
}
