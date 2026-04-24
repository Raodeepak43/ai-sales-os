import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, amount } = await req.json();

    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!secret || secret === "dummy") {
      // Mock mode success
      return NextResponse.json({ success: true, message: "Mock payment verified" });
    }

    const generated_signature = crypto
      .createHmac("sha256", secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature === razorpay_signature) {
      // Signature is valid
      // Note: For a production app, you would use firebase-admin here to securely update the database:
      // await adminDb.collection("payments").add({ userId, amount, status: "success", timestamp: admin.firestore.FieldValue.serverTimestamp() })
      
      return NextResponse.json({ success: true, message: "Payment verified successfully" });
    } else {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Razorpay Verify Error:", error);
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 });
  }
}
