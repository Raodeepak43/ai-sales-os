"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, addDoc, getDocs, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Mail, Plus, Send, Users, TrendingUp, Loader2, CheckCircle, X } from "lucide-react";

interface Campaign {
  id: string;
  subject: string;
  body: string;
  status: "draft" | "sent";
  sentCount: number;
  timestamp: any;
}

interface EmailContact {
  id: string;
  email: string;
  name: string;
  status: "subscribed" | "unsubscribed";
  timestamp: any;
}

type Tab = "campaigns" | "contacts";

export default function EmailPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("campaigns");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contacts, setContacts] = useState<EmailContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ subject: "", body: "" });
  const [emailForm, setEmailForm] = useState({ email: "", name: "" });

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getDocs(query(collection(db, "campaigns"), where("userId", "==", user.uid))),
      getDocs(query(collection(db, "emails"), where("userId", "==", user.uid))),
    ]).then(([campSnap, emailSnap]) => {
      setCampaigns(campSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Campaign[]);
      setContacts(emailSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as EmailContact[]);
    }).finally(() => setLoading(false));
  }, [user]);

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.subject || !form.body) return;
    setSaving(true);
    try {
      const ref = await addDoc(collection(db, "campaigns"), {
        ...form, userId: user.uid, status: "draft", sentCount: 0, timestamp: serverTimestamp(),
      });
      setCampaigns((p) => [{ id: ref.id, ...form, status: "draft", sentCount: 0, timestamp: null }, ...p]);
      setForm({ subject: "", body: "" });
      setShowForm(false);
    } catch { alert("Failed to save"); }
    finally { setSaving(false); }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !emailForm.email) return;
    setSaving(true);
    try {
      const ref = await addDoc(collection(db, "emails"), {
        ...emailForm, userId: user.uid, status: "subscribed", timestamp: serverTimestamp(),
      });
      setContacts((p) => [{ id: ref.id, ...emailForm, status: "subscribed", timestamp: null }, ...p]);
      setEmailForm({ email: "", name: "" });
    } catch { alert("Failed to save"); }
    finally { setSaving(false); }
  };

  const handleSendCampaign = async (campaign: Campaign) => {
    if (!user) return;
    const count = contacts.filter((c) => c.status === "subscribed").length;
    await updateDoc(doc(db, "campaigns", campaign.id), { status: "sent", sentCount: count });
    setCampaigns((p) => p.map((c) => c.id === campaign.id ? { ...c, status: "sent", sentCount: count } : c));
    alert(`Campaign sent to ${count} subscribers! (Simulated — connect SendGrid/Resend for live emails)`);
  };

  const stats = [
    { label: "Total Subscribers", value: contacts.filter((c) => c.status === "subscribed").length, icon: Users, color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20" },
    { label: "Campaigns Sent", value: campaigns.filter((c) => c.status === "sent").length, icon: Send, color: "text-green-500 bg-green-50 dark:bg-green-900/20" },
    { label: "Total Reached", value: campaigns.reduce((s, c) => s + (c.sentCount || 0), 0), icon: TrendingUp, color: "text-violet-500 bg-violet-50 dark:bg-violet-900/20" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Marketing</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage campaigns and subscribers.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* New campaign form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Create Campaign</h3>
            <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSaveCampaign} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Subject Line</label>
              <input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Your compelling subject line" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Body</label>
              <textarea rows={6} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="Write your email content here..." value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} required />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-sm font-medium text-white flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Save as Draft
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        {(["campaigns", "contacts"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Campaigns Tab */}
      {tab === "campaigns" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
          : campaigns.length === 0 ? (
            <div className="py-16 text-center">
              <Mail className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No campaigns yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {campaigns.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{c.subject}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{c.body.substring(0, 60)}...</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {c.status === "sent" && <span className="text-xs text-gray-400">{c.sentCount} sent</span>}
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${c.status === "sent" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}>
                      {c.status}
                    </span>
                    {c.status === "draft" && (
                      <button onClick={() => handleSendCampaign(c)} className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                        <Send className="w-3 h-3" /> Send
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contacts Tab */}
      {tab === "contacts" && (
        <div className="space-y-4">
          <form onSubmit={handleAddContact} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm">Add Subscriber</h3>
            <div className="flex gap-3">
              <input className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Name" value={emailForm.name} onChange={(e) => setEmailForm((f) => ({ ...f, name: e.target.value }))} />
              <input type="email" required className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Email address" value={emailForm.email} onChange={(e) => setEmailForm((f) => ({ ...f, email: e.target.value }))} />
              <button type="submit" disabled={saving} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl flex items-center gap-2 transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add
              </button>
            </div>
          </form>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            {contacts.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No subscribers yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {contacts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name || "Unnamed"}</p>
                      <p className="text-xs text-gray-400">{c.email}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.status === "subscribed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
