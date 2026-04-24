import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, amount } = await req.json();

    const secret = process.env.RAZORPAY_KEY_SECRET;

    // Check if it's a mock payment
    if ((!secret || secret === "dummy") && razorpay_order_id.startsWith("order_mock_")) {
      // Mock mode success - save to DB
      await addDoc(collection(db, "payments"), {
        userId,
        amount: Number(amount),
        status: "success",
        orderId: razorpay_order_id,
        paymentId: "mock_payment_" + Date.now(),
        timestamp: serverTimestamp(),
      });
      return NextResponse.json({ success: true, message: "Mock payment verified and saved" });
    }

    if (!secret) {
      return NextResponse.json({ error: "Razorpay secret not configured" }, { status: 500 });
    }

    const generated_signature = crypto
      .createHmac("sha256", secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature === razorpay_signature) {
      // Signature is valid - save to DB
      await addDoc(collection(db, "payments"), {
        userId,
        amount: Number(amount),
        status: "success",
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        timestamp: serverTimestamp(),
      });
      
      return NextResponse.json({ success: true, message: "Payment verified successfully" });
    } else {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Razorpay Verify Error:", error);
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 });
  }
}
