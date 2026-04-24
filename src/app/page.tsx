"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <nav className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                AI
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">Sales OS</span>
            </div>
            <div className="flex items-center gap-4">
              {loading ? null : user ? (
                <Link
                  href="/dashboard"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 text-sm font-medium transition-colors hidden sm:block"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 text-center py-20 lg:py-32">
        <div className="max-w-3xl w-full">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-semibold mb-8 border border-blue-200 dark:border-blue-800 shadow-sm">
            <Sparkles className="w-4 h-4" />
            <span>The ultimate conversion platform</span>
          </div>
          <h1 className="text-5xl lg:text-7xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-6">
            Turn every click into a{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              paying customer.
            </span>
          </h1>
          <p className="text-xl text-gray-500 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            AI Sales OS gives you a smart link-in-bio and an AI agent that chats with leads, answers FAQs, and closes sales automatically 24/7.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl text-lg font-medium transition-all shadow-xl shadow-blue-500/20"
            >
              Start converting for free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
