"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, Store, IndianRupee, Link as LinkIcon } from "lucide-react";

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    price: "",
    handle: "",
  });

  useEffect(() => {
    async function checkOnboarding() {
      if (!user) return;
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.businessName && data.price) {
            // Already onboarded
            router.push("/dashboard");
          } else {
            setFormData({
              businessName: data.businessName || "",
              price: data.price || "",
              handle: data.handle || user.uid.substring(0, 8),
            });
          }
        }
      } catch (error) {
        console.error("Error fetching user data", error);
      } finally {
        setLoading(false);
      }
    }
    checkOnboarding();
  }, [user, router]);

  const handleNext = () => setStep(step + 1);
  const handlePrev = () => setStep(step - 1);

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        businessName: formData.businessName,
        price: formData.price,
        handle: formData.handle,
      });
      router.push("/dashboard");
    } catch (error) {
      console.error("Error saving onboarding data", error);
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
        
        {/* Progress Bar */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-2 flex-1 rounded-full ${step >= s ? 'bg-blue-600' : 'bg-gray-100 dark:bg-gray-700'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-2xl flex items-center justify-center mb-6">
              <Store className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome! What's your business name?</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">This will appear on your public Link-in-Bio profile.</p>
            
            <input
              type="text"
              className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all mb-6"
              placeholder="e.g. Acme Marketing"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
            />
            
            <button
              onClick={handleNext}
              disabled={!formData.businessName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20"
            >
              Continue <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-2xl flex items-center justify-center mb-6">
              <IndianRupee className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Set your pricing</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">How much does your main product or service cost?</p>
            
            <div className="relative mb-6">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
              <input
                type="number"
                className="w-full p-4 pl-8 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="999"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handlePrev}
                className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-4 rounded-xl transition-all"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!formData.price || Number(formData.price) <= 0}
                className="flex-2 w-2/3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20"
              >
                Continue <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/50 rounded-2xl flex items-center justify-center mb-6">
              <LinkIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Claim your public link</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">This is where your AI agent will live. Make it memorable.</p>
            
            <div className="flex items-center gap-2 mb-6 bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
              <span className="text-gray-500 dark:text-gray-400 text-sm">aisales.os/u/</span>
              <input
                type="text"
                className="flex-1 bg-transparent text-gray-900 dark:text-white font-medium focus:outline-none"
                placeholder="your-handle"
                value={formData.handle}
                onChange={(e) => setFormData({ ...formData, handle: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handlePrev}
                className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-4 rounded-xl transition-all"
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                disabled={saving || !formData.handle}
                className="flex-2 w-2/3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Finish Setup"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
