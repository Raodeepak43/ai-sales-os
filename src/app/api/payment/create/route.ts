import { NextResponse } from "next/server";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "dummy",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "dummy",
});

export async function POST(req: Request) {
  try {
    const { amount, userId } = await req.json();

    if (!amount) {
      return NextResponse.json({ error: "Amount is required" }, { status: 400 });
    }

    // Amount is in paise for INR
    const options = {
      amount: Math.round(Number(amount) * 100), 
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId,
      },
    };

    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== "dummy") {
      const order = await razorpay.orders.create(options);
      return NextResponse.json({ orderId: order.id, amount: options.amount });
    } else {
      // Mock mode for testing without real keys
      return NextResponse.json({ 
        orderId: `order_mock_${Date.now()}`, 
        amount: options.amount 
      });
    }

  } catch (error: any) {
    console.error("Razorpay Create Order Error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
