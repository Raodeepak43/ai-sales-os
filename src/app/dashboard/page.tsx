"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Users, CreditCard, TrendingUp, Copy, ExternalLink, Zap } from "lucide-react";
import Link from "next/link";

interface Stats {
  totalLeads: number;
  totalRevenue: number;
  conversionRate: number;
  closingLeads: number;
}

export default function DashboardOverview() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalLeads: 0, totalRevenue: 0, conversionRate: 0, closingLeads: 0 });
  const [handle, setHandle] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function fetchAll() {
      try {
        // Fetch handle
        const userSnap = await getDoc(doc(db, "users", user!.uid));
        if (userSnap.exists()) setHandle(userSnap.data().handle || "");

        // Fetch leads
        const leadsSnap = await getDocs(query(collection(db, "leads"), where("userId", "==", user!.uid)));
        const leads = leadsSnap.docs.map((d) => d.data());
        const totalLeads = leads.length;
        const converted = leads.filter((l) => l.status === "converted").length;
        const closing = leads.filter((l) => l.stage === "closing").length;
        const conversionRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;

        // Fetch revenue
        const paymentsSnap = await getDocs(query(collection(db, "payments"), where("userId", "==", user!.uid)));
        let totalRevenue = 0;
        paymentsSnap.forEach((d) => { totalRevenue += Number(d.data().amount || 0); });

        setStats({ totalLeads, totalRevenue, conversionRate, closingLeads: closing });
      } catch (e) {
        console.error("Error fetching analytics:", e);
      }
    }
    fetchAll();
  }, [user]);

  const profileUrl = typeof window !== "undefined" && handle ? `${window.location.origin}/u/${handle}` : "";

  const handleCopy = () => {
    if (!profileUrl) return;
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statCards = [
    {
      label: "Total Leads",
      value: stats.totalLeads,
      sub: `${stats.closingLeads} in closing`,
      icon: Users,
      color: "from-blue-500 to-blue-600",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      label: "Total Revenue",
      value: `₹${stats.totalRevenue.toLocaleString("en-IN")}`,
      sub: "from Razorpay",
      icon: CreditCard,
      color: "from-green-500 to-emerald-600",
      bg: "bg-green-50 dark:bg-green-900/20",
    },
    {
      label: "Conversion Rate",
      value: `${stats.conversionRate}%`,
      sub: `${stats.totalLeads > 0 ? Math.round(stats.totalLeads * (stats.conversionRate / 100)) : 0} converted`,
      icon: TrendingUp,
      color: "from-violet-500 to-purple-600",
      bg: "bg-violet-50 dark:bg-violet-900/20",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Overview</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your AI Sales Engine performance at a glance.</p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-3 py-1.5 rounded-full font-medium">
          <Zap className="w-3.5 h-3.5" />
          AI Agent Active
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                <card.icon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{card.value}</p>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-0.5">{card.label}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Agent link card */}
      <div className="bg-gradient-to-r from-blue-600 to-violet-600 rounded-2xl p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h2 className="text-lg font-bold mb-1">Your AI Agent Link</h2>
            <p className="text-blue-100 text-sm">Share this link on Instagram, WhatsApp, or anywhere to start converting leads.</p>
          </div>
          {handle ? (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur px-4 py-2 rounded-xl text-sm font-medium transition-all"
              >
                <Copy className="w-4 h-4" />
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <Link
                href={`/u/${handle}`}
                target="_blank"
                className="flex items-center gap-2 bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Open
              </Link>
            </div>
          ) : (
            <Link href="/dashboard/settings" className="shrink-0 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-medium transition-all">
              Set up handle →
            </Link>
          )}
        </div>
        {handle && (
          <p className="mt-4 font-mono text-xs text-blue-200 truncate">{profileUrl}</p>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/dashboard/leads" className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors shadow-sm group">
          <Users className="w-6 h-6 text-blue-500 mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Manage Leads</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">View & update all {stats.totalLeads} leads</p>
        </Link>
        <Link href="/dashboard/payments" className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 transition-colors shadow-sm group">
          <CreditCard className="w-6 h-6 text-green-500 mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">View Payments</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Revenue: ₹{stats.totalRevenue.toLocaleString("en-IN")}</p>
        </Link>
      </div>
    </div>
  );
}
