import { NextResponse } from "next/server";
import { Webhook } from "svix"; // Used for webhook verification

const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET as string; // Set this in Vercel

export async function POST(req: Request) {
  const payload = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  // Verify the webhook with Svix
  const svix = new Webhook(CLERK_WEBHOOK_SECRET);
  const event = svix.verify(payload, headers) as any;

  try {
    // Validate the webhook signature
    const wh = new Webhook(CLERK_WEBHOOK_SECRET);
    const evt = wh.verify(payload, headers) as ClerkWebhookEvent;

    console.log("✅ Webhook received:", evt);

    // Handle different Clerk events
    if (evt.type === "user.created") {
      console.log("🎉 New user created:", evt.data);
      // Save to DB or trigger other actions
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Webhook verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
}

// Type Clerk Webhook event (Optional but recommended)
interface ClerkWebhookEvent {
  type: string;
  data: any;
}
