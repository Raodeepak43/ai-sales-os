"use client";

import { useAuth } from "@/context/AuthContext";
import { Copy, ExternalLink, Bot } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function AgentPage() {
  const { user } = useAuth();
  const [handle, setHandle] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) {
        setHandle(snap.data().handle);
      }
    });
  }, [user]);

  const profileUrl = typeof window !== 'undefined' && handle ? `${window.location.origin}/u/${handle}` : '';

  const copyToClipboard = () => {
    if (!profileUrl) return;
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your AI Agent</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Share your public link to let customers chat with your AI assistant.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8 shadow-sm text-center">
        <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Bot className="w-10 h-10 text-blue-600 dark:text-blue-400" />
        </div>
        
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Your Agent is Ready!
        </h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8">
          Add this link to your Instagram bio, Twitter profile, or send it directly to leads. 
          The AI will handle the conversation and process payments.
        </p>

        {handle ? (
          <div className="max-w-lg mx-auto bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-2 flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-300 px-4 font-mono text-sm truncate">
              {profileUrl}
            </span>
            <div className="flex gap-2 shrink-0">
              <button 
                onClick={copyToClipboard}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {copied ? <span className="text-green-600">Copied!</span> : <><Copy className="w-4 h-4" /> Copy</>}
              </button>
              <Link
                href={`/u/${handle}`}
                target="_blank"
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                <ExternalLink className="w-4 h-4" /> Open
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-sm animate-pulse">Loading your link...</div>
        )}
      </div>
    </div>
  );
}
