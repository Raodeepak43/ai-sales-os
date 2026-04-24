"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Loader2, Users, RefreshCw } from "lucide-react";

type LeadStatus = "new" | "contacted" | "converted";
type ConversationStage = "new" | "problem_identified" | "solution_given" | "closing" | "converted";

interface Lead {
  id: string;
  name: string;
  contact?: string;
  status: LeadStatus;
  stage: ConversationStage;
  source: string;
  timestamp: any;
}

const STAGE_COLORS: Record<ConversationStage, string> = {
  new: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  problem_identified: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  solution_given: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  closing: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  converted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const STAGE_LABELS: Record<ConversationStage, string> = {
  new: "New",
  problem_identified: "Problem ID'd",
  solution_given: "Solution Given",
  closing: "Closing",
  converted: "Converted ✓",
};

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  contacted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  converted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export default function LeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeads = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, "leads"), where("userId", "==", user.uid));
      const snap = await getDocs(q);
      const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Lead[];
      fetched.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setLeads(fetched);
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchLeads(); }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLeads();
  };

  const updateStatus = async (leadId: string, newStatus: LeadStatus) => {
    try {
      await updateDoc(doc(db, "leads", leadId), { status: newStatus });
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));
    } catch (error) {
      alert("Failed to update status");
    }
  };

  // Summary counts
  const newCount = leads.filter((l) => l.status === "new").length;
  const closingCount = leads.filter((l) => l.stage === "closing").length;
  const convertedCount = leads.filter((l) => l.status === "converted").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leads</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            All leads captured by your AI Agent — track their journey to conversion.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "New Leads", value: newCount, color: "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20" },
          { label: "In Closing Stage", value: closingCount, color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20" },
          { label: "Converted", value: convertedCount, color: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20" },
        ].map((c) => (
          <div key={c.label} className={`rounded-2xl p-4 border border-gray-100 dark:border-gray-700 ${c.color}`}>
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-80">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Leads Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        {leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No leads yet</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">Share your AI Agent link to start capturing leads automatically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Name</th>
                  <th className="px-5 py-3.5">AI Stage</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Source</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5 text-right">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-5 py-4 font-medium text-gray-900 dark:text-white">
                      {lead.name}
                      {lead.contact && <span className="block text-xs text-gray-400 dark:text-gray-500 mt-0.5">{lead.contact}</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STAGE_COLORS[lead.stage || "new"]}`}>
                        {STAGE_LABELS[lead.stage || "new"]}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status || "new"]}`}>
                        {(lead.status || "new").charAt(0).toUpperCase() + (lead.status || "new").slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-4 capitalize text-gray-500 dark:text-gray-400">{lead.source || "chat"}</td>
                    <td className="px-5 py-4 text-gray-500 dark:text-gray-400 text-xs">
                      {lead.timestamp ? new Date(lead.timestamp.seconds * 1000).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <select
                        value={lead.status || "new"}
                        onChange={(e) => updateStatus(lead.id, e.target.value as LeadStatus)}
                        className="text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="converted">Converted</option>
                      </select>
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
