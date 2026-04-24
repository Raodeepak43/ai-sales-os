"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, X, CreditCard, Bot, Sparkles, ShieldCheck } from "lucide-react";
import { db } from "@/lib/firebase";
import {
  collection, addDoc, serverTimestamp,
  doc, getDoc, updateDoc,
} from "firebase/firestore";
import type { ConversationStage } from "@/app/api/chat/route";

// ═══════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════
interface BusinessContext {
  businessName: string;
  serviceName?: string;
  price?: string;
  aiTone?: string;
  serviceDescription?: string;
  keyBenefits?: string;
  targetAudience?: string;
}

interface ChatInterfaceProps {
  userId: string;
  businessName: string;
  aiTone: string;
  onClose: () => void;
  onBuyTrigger: (leadId?: string) => void;
}

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  trigger?: string | null;
}

// ═══════════════════════════════════════════════════════════
//  TYPING ANIMATION HELPER
// ═══════════════════════════════════════════════════════════
const TYPING_DELAY_MS = 900; // simulated "AI is thinking" pause

export default function ChatInterface({ userId, businessName, aiTone, onClose, onBuyTrigger }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      sender: "ai",
      text: `Hi! 👋 Welcome to ${businessName}. What are you trying to achieve today?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [leadId, setLeadId] = useState<string>("");
  const [stage, setStage] = useState<ConversationStage>("new");
  const [businessContext, setBusinessContext] = useState<BusinessContext>({ businessName, aiTone });
  const [followUpTimer, setFollowUpTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Fetch full business context from Firestore ───────────
  useEffect(() => {
    async function fetchContext() {
      try {
        const snap = await getDoc(doc(db, "users", userId));
        if (snap.exists()) {
          const d = snap.data();
          setBusinessContext({
            businessName: d.businessName || businessName,
            serviceName: d.serviceName,
            price: d.price,
            aiTone: d.aiTone || aiTone,
            serviceDescription: d.serviceDescription,
            keyBenefits: d.keyBenefits,
            targetAudience: d.targetAudience,
          });
        }
      } catch (_) { /* fallback to props */ }
    }
    fetchContext();
  }, [userId, businessName, aiTone]);

  // ── Auto scroll to bottom ────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ── Follow-up timer: 2 min inactivity trigger ────────────
  const resetFollowUpTimer = useCallback(() => {
    if (followUpTimer) clearTimeout(followUpTimer);
    const timer = setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `followup-${Date.now()}`,
          sender: "ai",
          text: "Just checking 🙂 do you want help getting started?",
          trigger: "show_buy_button",
        },
      ]);
    }, 2 * 60 * 1000); // 2 minutes
    setFollowUpTimer(timer);
  }, [followUpTimer]);

  useEffect(() => {
    resetFollowUpTimer();
    return () => { if (followUpTimer) clearTimeout(followUpTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // ── Add AI message with typing delay ────────────────────
  const addAIMessage = (msg: Omit<Message, "id">) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [...prev, { id: Date.now().toString(), ...msg }]);
    }, TYPING_DELAY_MS);
  };

  // ── Main send handler ────────────────────────────────────
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userText = input.trim();
    setInput("");

    // Add user message immediately (no delay)
    setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "user", text: userText }]);
    setIsTyping(true);

    try {
      // ── Lead capture on first message ────────────────────
      let currentLeadId = leadId;
      if (!currentLeadId) {
        const docRef = await addDoc(collection(db, "leads"), {
          userId,
          name: userText,
          contact: "",
          status: "new",
          source: "chat",
          stage: "new",
          timestamp: serverTimestamp(),
        });
        currentLeadId = docRef.id;
        setLeadId(currentLeadId);
      }

      // Save user message to Firestore
      await addDoc(collection(db, "messages"), {
        leadId: currentLeadId,
        userId,
        sender: "user",
        text: userText,
        timestamp: serverTimestamp(),
      });

      // ── Build history for LLM ────────────────────────────
      const history = messages
        .filter((m) => m.id !== "0")
        .slice(-12)
        .map((m) => ({ role: m.sender === "ai" ? "assistant" : "user", content: m.text }));

      // ── Call 3-layer AI API ──────────────────────────────
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, history, businessContext, stage }),
      });

      const data = await res.json();

      if (!res.ok || data.error) throw new Error(data.error || "Failed");

      // ── Update conversation stage in Firestore ────────────
      const nextStage: ConversationStage = data.nextStage || stage;
      if (nextStage !== stage) {
        setStage(nextStage);
        if (currentLeadId) {
          updateDoc(doc(db, "leads", currentLeadId), { stage: nextStage }).catch(() => {});
        }
      }

      // ── Show AI reply with typing delay ───────────────────
      setIsTyping(false);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: data.reply,
        trigger: data.trigger,
      };
      setMessages((prev) => [...prev, aiMsg]);

      // Save AI message
      addDoc(collection(db, "messages"), {
        leadId: currentLeadId,
        userId,
        sender: "ai",
        text: data.reply,
        trigger: data.trigger || null,
        source: data.source || "llm",
        stage: nextStage,
        timestamp: serverTimestamp(),
      }).catch(() => {});

    } catch (error: any) {
      setIsTyping(false);
      const errText = error?.message?.includes("decommissioned")
        ? "AI model updating. Try again in a moment."
        : "Something went wrong. Please retry.";
      setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "ai", text: errText }]);
    }
  };

  // ── Stage label for display ──────────────────────────────
  const stageLabel: Record<ConversationStage, string> = {
    new: "New",
    problem_identified: "Problem Identified",
    solution_given: "Solution Presented",
    closing: "Closing",
    converted: "Converted ✓",
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-600 rounded-full flex items-center justify-center shadow">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{businessName}</p>
            <p className="text-xs text-green-500 font-medium">AI Sales Agent · Online</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Stage badge */}
          <span className="hidden sm:inline-flex items-center text-xs px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium">
            {stageLabel[stage]}
          </span>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-gray-50 dark:bg-gray-950">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
            {msg.sender === "ai" && (
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-violet-600 rounded-full flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div className="flex flex-col gap-2 max-w-[78%]">
              <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.sender === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-bl-sm shadow-sm"
              }`}>
                {msg.text}
              </div>
              {/* Inline trigger buttons */}
              {msg.sender === "ai" && msg.trigger === "show_buy_button" && (
                <button
                  onClick={() => onBuyTrigger(leadId)}
                  className="flex items-center justify-center gap-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 py-2.5 px-4 rounded-xl shadow-md hover:opacity-90 transition-opacity"
                >
                  <CreditCard className="w-4 h-4" />
                  Buy Now — {businessContext.price ? `₹${businessContext.price}` : "Get Started"}
                </button>
              )}
              {msg.sender === "ai" && msg.trigger === "show_payment_link" && (
                <button
                  onClick={() => onBuyTrigger(leadId)}
                  className="flex items-center justify-center gap-2 text-sm font-semibold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 py-2.5 px-4 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Send Payment Link — {businessContext.price ? `₹${businessContext.price}` : "Proceed"}
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-end gap-2 justify-start">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-violet-600 rounded-full flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:160ms]" />
                <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:320ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ──────────────────────────────────────────── */}
      <form onSubmit={handleSend} className="px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={isTyping}
            className="flex-1 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="w-10 h-10 bg-gradient-to-br from-blue-600 to-violet-600 text-white rounded-full flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-all shrink-0 shadow"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-400 dark:text-gray-600 mt-2">Secured by AI Sales OS</p>
      </form>
    </div>
  );
}
