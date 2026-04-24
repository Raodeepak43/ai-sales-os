"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Loader2, CreditCard } from "lucide-react";

interface Payment {
  id: string;
  amount: number;
  status: string;
  orderId: string;
  paymentId: string;
  timestamp: any;
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPayments() {
      if (!user) return;
      try {
        const q = query(
          collection(db, "payments"),
          where("userId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);
        const fetched = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Payment[];
        
        fetched.sort((a, b) => {
          const timeA = a.timestamp?.seconds || 0;
          const timeB = b.timestamp?.seconds || 0;
          return timeB - timeA;
        });

        setPayments(fetched);
      } catch (error) {
        console.error("Error fetching payments:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPayments();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payments</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          View your successful Razorpay transactions.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
              <CreditCard className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No payments yet</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              Once leads successfully purchase your service through your Link-in-Bio or AI Agent, they will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">Transaction ID</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-900 dark:text-white">
                      {payment.paymentId || payment.orderId}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      ₹{payment.amount}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {payment.timestamp ? new Date(payment.timestamp.seconds * 1000).toLocaleString() : "Just now"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
