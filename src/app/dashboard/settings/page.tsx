"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Save, Loader2, Store, Bot, Link as LinkIcon, CheckCircle } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  const [formData, setFormData] = useState({
    businessName: "",
    handle: "",
    aiTone: "professional",
    price: "",
    serviceDescription: "",
    keyBenefits: "",
    targetAudience: "",
  });

  useEffect(() => {
    async function fetchUserData() {
      if (!user) return;
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({
            businessName: data.businessName || "",
            handle: data.handle || user.uid.substring(0, 8),
            aiTone: data.aiTone || "professional",
            price: data.price || "",
            serviceDescription: data.serviceDescription || "",
            keyBenefits: data.keyBenefits || "",
            targetAudience: data.targetAudience || "",
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchUserData();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaveStatus("idle");
    try {
      const docRef = doc(db, "users", user.uid);
      await updateDoc(docRef, {
        businessName: formData.businessName,
        handle: formData.handle.toLowerCase().replace(/[^a-z0-9-]/g, ""),
        aiTone: formData.aiTone,
        price: formData.price,
        serviceDescription: formData.serviceDescription,
        keyBenefits: formData.keyBenefits,
        targetAudience: formData.targetAudience,
      });
      setSaveStatus("success");
    } catch (error) {
      console.error("Error saving settings:", error);
      setSaveStatus("error");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5";

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure your business profile and AI agent behavior.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* Section 1: Public Profile */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/40 rounded-xl flex items-center justify-center">
              <Store className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Business Profile</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Shown on your public Link-in-Bio page.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Business Name</label>
              <input type="text" name="businessName" value={formData.businessName} onChange={handleChange}
                placeholder="e.g. Acme Studio" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Custom Handle</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">/u/</span>
                <input type="text" name="handle" value={formData.handle} onChange={handleChange}
                  placeholder="your-handle" className={`${inputClass} pl-10`} />
              </div>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Your public AI Agent URL.</p>
            </div>

            <div>
              <label className={labelClass}>Product / Service Price (₹)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                <input type="number" name="price" value={formData.price} onChange={handleChange}
                  placeholder="999" className={`${inputClass} pl-8`} />
              </div>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">The AI will close leads at this price.</p>
            </div>
          </div>
        </div>

        {/* Section 2: AI Layer 2 - Business Context */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-violet-50 dark:bg-violet-900/40 rounded-xl flex items-center justify-center">
              <Bot className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">AI Business Context</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">This is injected into the AI's brain as Layer 2 context. More detail = better sales conversations.</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className={labelClass}>Service / Product Description</label>
              <textarea name="serviceDescription" value={formData.serviceDescription} onChange={handleChange}
                rows={3} placeholder="e.g. We offer 1-on-1 Instagram growth coaching that helps creators reach 10k followers in 90 days."
                className={`${inputClass} resize-none`} />
            </div>

            <div>
              <label className={labelClass}>Key Benefits (comma-separated)</label>
              <input type="text" name="keyBenefits" value={formData.keyBenefits} onChange={handleChange}
                placeholder="e.g. Fast results, 24/7 support, money-back guarantee, proven system"
                className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Target Audience</label>
              <input type="text" name="targetAudience" value={formData.targetAudience} onChange={handleChange}
                placeholder="e.g. Small business owners, freelancers, coaches, and creators"
                className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>AI Conversational Tone</label>
              <select name="aiTone" value={formData.aiTone} onChange={handleChange} className={inputClass}>
                <option value="professional">Professional & Direct</option>
                <option value="friendly">Friendly & Casual</option>
                <option value="persuasive">Persuasive (Sales Focused)</option>
                <option value="empathetic">Empathetic & Consultative</option>
                <option value="bold">Bold & Energetic</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-4">
          {saveStatus === "success" && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4" /> Saved successfully
            </span>
          )}
          {saveStatus === "error" && (
            <span className="text-sm text-red-600 dark:text-red-400">Failed to save. Try again.</span>
          )}
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm shadow-blue-500/20"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
