import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * SOCIAL WEBHOOK ENGINE
 * This route handles incoming messages from Meta (Instagram/Facebook)
 * and replies using the AI Sales OS engine.
 */

// 1. VERIFICATION CHALLENGE (Required by Meta)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // This token should match the one set in Meta Developer Portal
  const VERIFY_TOKEN = process.env.SOCIAL_VERIFY_TOKEN || "aisalesos_secret_token";

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED");
      return new Response(challenge, { status: 200 });
    } else {
      return new Response("Forbidden", { status: 403 });
    }
  }
  return new Response("Bad Request", { status: 400 });
}

// 2. MESSAGE HANDLING
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Check if it's an Instagram or Facebook message
    if (body.object === "instagram" || body.object === "page") {
      const entry = body.entry?.[0];
      const messaging = entry?.messaging?.[0];
      const senderId = messaging?.sender?.id;
      const messageText = messaging?.message?.text;
      
      // Get the page/account ID to identify which user this belongs to
      const recipientId = messaging?.recipient?.id;

      if (!senderId || !messageText) return NextResponse.json({ ok: true });

      // TODO: Find the user in Firestore linked to this recipientId
      // For now, we'll log it as a lead
      const userQuery = query(collection(db, "users"), where("socialAccountId", "==", recipientId));
      const userSnap = await getDocs(userQuery);
      
      if (!userSnap.empty) {
        const userData = userSnap.docs[0].data();
        const userId = userSnap.docs[0].id;

        // Create a lead in Firestore
        const leadRef = await addDoc(collection(db, "leads"), {
          userId,
          name: "Social User",
          contact: senderId,
          source: body.object,
          status: "new",
          timestamp: serverTimestamp(),
        });

        // ──────────────────────────────────────────────────────────
        // AI ENGINE TRIGGER (SIMULATED FOR NOW)
        // ──────────────────────────────────────────────────────────
        // In a real production setup, you would now:
        // 1. Call your internal /api/chat logic
        // 2. Use the Meta Graph API to send the reply back to senderId
        
        console.log(`[SOCIAL AI] Replying to ${senderId} on ${body.object}: ${messageText}`);
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Not a valid event" }, { status: 400 });
  } catch (error) {
    console.error("WEBHOOK_ERROR:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
