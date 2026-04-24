"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MessageSquare, CreditCard, Loader2, Store } from "lucide-react";
import { useParams } from "next/navigation";
import ChatInterface from "@/components/ChatInterface";
import Script from "next/script";

interface UserProfile {
  id: string;
  businessName: string;
  price: string;
  aiTone: string;
}

export default function LinkInBioPage() {
  const { username } = useParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      if (!username) return;
      try {
        const q = query(
          collection(db, "users"),
          where("handle", "==", username)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          setProfile({ id: doc.id, ...doc.data() } as UserProfile);
        }
      } catch (error) {
        console.error("Error fetching profile", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [username]);

  const handleBuyNow = async (leadId?: string) => {
    if (!profile) return;
    setPaymentLoading(true);
    
    try {
      // 1. Create order on backend
      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          amount: Number(profile.price || 0), 
          userId: profile.id 
        }),
      });
      const data = await res.json();
      
      if (!data.orderId) throw new Error("Failed to create order");

      // 2. Open Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_dummy",
        amount: data.amount,
        currency: "INR",
        name: profile.businessName,
        description: "Payment for Services",
        order_id: data.orderId,
        handler: async function (response: any) {
          // 3. Verify payment on backend
          const verifyRes = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              userId: profile.id,
              amount: data.amount,
            }),
          });
          const verifyData = await verifyRes.json();
          
          if (verifyData.success) {
            // Save payment to Firestore
            await addDoc(collection(db, "payments"), {
              userId: profile.id,
              amount: Number(profile.price),
              status: "success",
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              timestamp: new Date(),
            });
            
            // Update Lead status to "converted"
            if (typeof leadId === "string" && leadId.length > 0) {
              try {
                await updateDoc(doc(db, "leads", leadId), { status: "converted" });
              } catch (updateErr) {
                console.error("Failed to update lead status:", updateErr);
              }
            }
            
            alert("Payment Successful! Thank you.");
          } else {
            alert("Payment verification failed.");
          }
        },
        theme: {
          color: "#2563eb",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment error", error);
      alert("Payment failed. Please try again.");
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile not found</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">The link you followed may be broken.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      
      <div className="max-w-md mx-auto">
        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
          <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
          <div className="px-6 pb-8">
            <div className="relative flex justify-center -mt-12 mb-4">
              <div className="w-24 h-24 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-gray-800">
                <span className="text-3xl font-bold text-blue-600">
                  {profile.businessName?.charAt(0).toUpperCase() || "B"}
                </span>
              </div>
            </div>
            
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {profile.businessName || "Business Name"}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Hi! Let's chat about how we can help you.
              </p>
            </div>

            <div className="space-y-4">
              {profile.price && (
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-2xl p-4 text-center border border-blue-100 dark:border-blue-800 mb-6">
                  <span className="block text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">Premium Service</span>
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">₹{profile.price}</span>
                </div>
              )}

              <button
                onClick={() => setShowChat(true)}
                className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-4 rounded-2xl font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shadow-md"
              >
                <MessageSquare className="w-5 h-5" />
                Chat with AI
              </button>

              <button
                onClick={handleBuyNow}
                disabled={paymentLoading || !profile.price}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-2xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-500/25"
              >
                {paymentLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                Buy Now
              </button>
            </div>
          </div>
        </div>

        {/* Chat Interface Modal */}
        {showChat && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/50 backdrop-blur-sm p-0 sm:p-4">
            <div className="w-full max-w-md h-[80vh] sm:h-[600px] bg-white dark:bg-gray-800 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 duration-300">
              <ChatInterface 
                userId={profile.id} 
                businessName={profile.businessName}
                aiTone={profile.aiTone}
                onClose={() => setShowChat(false)}
                onBuyTrigger={handleBuyNow}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
