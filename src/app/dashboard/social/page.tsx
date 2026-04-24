"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, addDoc, getDocs, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Zap, Plus, Send, MessageSquare, Heart, AtSign, Loader2, ToggleLeft, ToggleRight, Bell, Globe, Share2 } from "lucide-react";

interface AutoReply {
  id: string;
  platform: string;
  trigger: string;
  response: string;
  active: boolean;
  sentCount: number;
  timestamp: any;
}

interface Notification {
  id: string;
  message: string;
  type: string;
  read: boolean;
  timestamp: any;
}

const PLATFORMS = [
  { id: "instagram", label: "Instagram DM", icon: Heart, color: "text-pink-500 bg-pink-50 dark:bg-pink-900/20" },
  { id: "whatsapp", label: "WhatsApp", icon: MessageSquare, color: "text-green-500 bg-green-50 dark:bg-green-900/20" },
  { id: "twitter", label: "Twitter/X DM", icon: AtSign, color: "text-sky-500 bg-sky-50 dark:bg-sky-900/20" },
];

export default function SocialPage() {
  const { user } = useAuth();
  const [replies, setReplies] = useState<AutoReply[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ platform: "instagram", trigger: "", response: "" });
  const [activeTab, setActiveTab] = useState<"rules" | "notifications">("rules");

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getDocs(query(collection(db, "autoReplies"), where("userId", "==", user.uid))),
      getDocs(query(collection(db, "notifications"), where("userId", "==", user.uid))),
    ]).then(([rSnap, nSnap]) => {
      setReplies(rSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as AutoReply[]);
      setNotifications(nSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Notification[]);
    }).finally(() => setLoading(false));
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.trigger || !form.response) return;
    setSaving(true);
    try {
      const ref = await addDoc(collection(db, "autoReplies"), {
        ...form, userId: user.uid, active: true, sentCount: 0, timestamp: serverTimestamp(),
      });
      setReplies((p) => [{ id: ref.id, ...form, active: true, sentCount: 0, timestamp: null }, ...p]);
      setForm({ platform: "instagram", trigger: "", response: "" });
      setShowForm(false);
    } catch { alert("Failed to save"); }
    finally { setSaving(false); }
  };

  const toggleRule = async (rule: AutoReply) => {
    await updateDoc(doc(db, "autoReplies", rule.id), { active: !rule.active });
    setReplies((p) => p.map((r) => r.id === rule.id ? { ...r, active: !r.active } : r));
  };

  const simulateSend = async (rule: AutoReply) => {
    const newCount = (rule.sentCount || 0) + 1;
    await updateDoc(doc(db, "autoReplies", rule.id), { sentCount: newCount });
    setReplies((p) => p.map((r) => r.id === rule.id ? { ...r, sentCount: newCount } : r));
    // Add notification
    const ref = await addDoc(collection(db, "notifications"), {
      userId: user!.uid,
      message: `Auto-reply sent on ${rule.platform} for trigger: "${rule.trigger}"`,
      type: "auto_reply",
      read: false,
      timestamp: serverTimestamp(),
    });
    setNotifications((p) => [{
      id: ref.id,
      message: `Auto-reply sent on ${rule.platform} for trigger: "${rule.trigger}"`,
      type: "auto_reply", read: false, timestamp: null,
    }, ...p]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Social Automation</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Set up auto-replies and track social notifications.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Add Rule
        </button>
      </div>

      {/* Platform cards */}
      <div className="grid grid-cols-3 gap-4">
        {PLATFORMS.map((p) => (
          <div key={p.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${p.color}`}>
              <p.icon className="w-5 h-5" />
            </div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{p.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {replies.filter((r) => r.platform === p.id && r.active).length} active rules
            </p>
          </div>
        ))}
      </div>

      {/* Webhook Configuration (FOR INSTAGRAM/FACEBOOK DEPLOYMENT) */}
      <div className="bg-gradient-to-br from-blue-600 to-violet-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-500/20">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Deploy AI to Social Platforms
            </h2>
            <p className="text-blue-100 text-sm mt-1 max-w-md">
              Use these credentials in the Meta Developer Portal to link your AI Sales Closer to Instagram & Facebook DMs.
            </p>
          </div>
          <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
            Production Ready
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-1">Webhook URL</p>
            <div className="flex items-center justify-between">
              <code className="text-xs font-mono truncate mr-2">https://{typeof window !== "undefined" ? window.location.host : "your-domain.com"}/api/social/webhook</code>
              <button onClick={() => navigator.clipboard.writeText(`https://${window.location.host}/api/social/webhook`)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                <Plus className="w-3.5 h-3.5 rotate-45" />
              </button>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-1">Verify Token</p>
            <div className="flex items-center justify-between">
              <code className="text-xs font-mono">aisalesos_secret_token</code>
              <button onClick={() => navigator.clipboard.writeText("aisalesos_secret_token")} className="p-1.5 hover:bg-white/10 rounded-xl transition-colors">
                <Plus className="w-3.5 h-3.5 rotate-45" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-5 flex items-center gap-4">
          <button className="text-xs font-bold bg-white text-blue-700 px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors">
            Setup Guide
          </button>
          <div className="flex -space-x-2">
            {[Heart, Share2, AtSign].map((Icon, i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-white/20 border-2 border-blue-600 flex items-center justify-center">
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New rule form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">New Auto-Reply Rule</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Platform</label>
                <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  value={form.platform} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}>
                  {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Trigger Keyword</label>
                <input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. price, info, buy" value={form.trigger} onChange={(e) => setForm((f) => ({ ...f, trigger: e.target.value }))} required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Auto-Reply Message</label>
              <textarea rows={3} className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="The message to auto-reply with..." value={form.response} onChange={(e) => setForm((f) => ({ ...f, response: e.target.value }))} required />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-sm font-medium text-white flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Save Rule
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        <button onClick={() => setActiveTab("rules")} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === "rules" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500"}`}>
          Auto-Reply Rules
        </button>
        <button onClick={() => setActiveTab("notifications")} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === "notifications" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500"}`}>
          Notifications
          {unreadCount > 0 && <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center">{unreadCount}</span>}
        </button>
      </div>

      {activeTab === "rules" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
          : replies.length === 0 ? (
            <div className="py-16 text-center">
              <Zap className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No automation rules yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {replies.map((r) => {
                const plat = PLATFORMS.find((p) => p.id === r.platform);
                return (
                  <div key={r.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                    <div className="flex items-center gap-4">
                      {plat && <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${plat.color}`}><plat.icon className="w-4 h-4" /></div>}
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Trigger: <span className="font-mono text-blue-600 dark:text-blue-400">"{r.trigger}"</span></p>
                        <p className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{r.response}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{r.sentCount || 0} sent</span>
                      <button onClick={() => simulateSend(r)} className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                        <Send className="w-3 h-3" /> Test
                      </button>
                      <button onClick={() => toggleRule(r)}>
                        {r.active
                          ? <ToggleRight className="w-6 h-6 text-blue-500" />
                          : <ToggleLeft className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                        }
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          {notifications.length === 0 ? (
            <div className="py-16 text-center">
              <Bell className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {notifications.map((n) => (
                <div key={n.id} className={`flex items-start gap-3 px-5 py-4 ${!n.read ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}>
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0 opacity-0 data-[unread=true]:opacity-100" data-unread={!n.read} />
                  <p className="text-sm text-gray-700 dark:text-gray-300">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
