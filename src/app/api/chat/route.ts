import { NextResponse } from "next/server";
import OpenAI from "openai";

// ═══════════════════════════════════════════════════════════════════════
//  GROQ CLIENT
// ═══════════════════════════════════════════════════════════════════════
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || "dummy",
  baseURL: "https://api.groq.com/openai/v1",
});

// ═══════════════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════════════
export type ConversationStage =
  | "new"
  | "problem_identified"
  | "solution_given"
  | "closing"
  | "converted";

interface BusinessContext {
  businessName: string;
  serviceName?: string;
  price?: string;
  aiTone?: string;
  serviceDescription?: string;
  keyBenefits?: string;
  targetAudience?: string;
}

interface RuleResult {
  reply: string;
  trigger?: "show_buy_button" | "show_payment_link" | null;
  nextStage?: ConversationStage;
  source: "rule" | "faq";
}

// ═══════════════════════════════════════════════════════════════════════
//  LAYER 3: RULE ENGINE  (zero API cost — runs first on every message)
// ═══════════════════════════════════════════════════════════════════════
function runRuleEngine(
  message: string,
  stage: ConversationStage,
  ctx: BusinessContext
): RuleResult | null {
  const msg = message.toLowerCase().trim();
  const words = msg.split(/\s+/);
  const has = (keywords: string[]) => keywords.some((k) => msg.includes(k));

  // ── FAQ: Price ─────────────────────────────────────────────────────
  if (has(["price", "cost", "how much", "pricing", "fee", "charges", "rate", "package"])) {
    const priceText = ctx.price ? `₹${ctx.price}` : "very competitive";
    return {
      reply: `Our service is priced at ${priceText}. Even 1–2 new customers will recover this. Want me to send the payment link now?`,
      trigger: "show_buy_button",
      nextStage: "closing",
      source: "faq",
    };
  }

  // ── FAQ: What do you do ─────────────────────────────────────────────
  if (has(["what do you do", "what is this", "what are you", "tell me about", "what do you offer", "services"])) {
    const desc = ctx.serviceDescription || `We help ${ctx.targetAudience || "businesses"} get results faster.`;
    return {
      reply: `${ctx.businessName} offers: ${desc}. Quick question — what's the biggest problem you're trying to solve right now?`,
      nextStage: "problem_identified",
      source: "faq",
    };
  }

  // ── BUY INTENT ──────────────────────────────────────────────────────
  const buySignals = ["yes", "ok", "okay", "interested", "start", "buy", "purchase", "proceed", "let's go", "lets go", "sure", "sounds good", "great", "i want", "sign me up", "enroll"];
  if (buySignals.some((k) => msg === k || msg.startsWith(k) || words.includes(k))) {
    return {
      reply: `Great 👍 I can set this up for you right now. Want me to send the payment link?`,
      trigger: "show_payment_link",
      nextStage: "closing",
      source: "rule",
    };
  }

  // ── OBJECTION: Price ────────────────────────────────────────────────
  if (has(["expensive", "costly", "too much", "not affordable", "can't afford", "high price"])) {
    return {
      reply: `Even 1 extra customer can recover this cost within days. Want to try it once and see the results yourself?`,
      nextStage: "closing",
      source: "rule",
    };
  }

  // ── OBJECTION: Hesitation ────────────────────────────────────────────
  if (has(["later", "not now", "thinking", "maybe", "let me think", "not sure", "unsure", "consider"])) {
    return {
      reply: `Totally get it 👍 but starting early gives better results. Shall I reserve a spot for you right now?`,
      trigger: "show_buy_button",
      nextStage: "closing",
      source: "rule",
    };
  }

  // ── OBJECTION: Doubt ─────────────────────────────────────────────────
  if (has(["does it work", "will it work", "proof", "guarantee", "results", "really work"])) {
    const benefits = ctx.keyBenefits || "proven results and expert support";
    return {
      reply: `We've helped many clients with ${benefits}. We can start small — want to give it a shot?`,
      nextStage: "closing",
      source: "rule",
    };
  }

  // ── HUMAN REQUEST ─────────────────────────────────────────────────────
  if (has(["human", "real person", "talk to someone", "customer support", "contact", "team"])) {
    return {
      reply: `I'll connect you with the ${ctx.businessName} team shortly! Meanwhile, can I answer any quick questions?`,
      source: "rule",
    };
  }

  // ── GREETING ──────────────────────────────────────────────────────────
  const greetings = ["hi", "hello", "hey", "hii", "namaste", "good morning", "good afternoon", "good evening", "sup", "yo"];
  if (greetings.some((k) => msg === k || msg.startsWith(k + " ") || msg.startsWith(k + "!"))) {
    return {
      reply: `Hi there! 👋 Welcome to ${ctx.businessName}. What brings you here today — are you looking to grow your business?`,
      source: "rule",
    };
  }

  // ── AUTO CLOSE: Stage is solution_given → push to close ──────────────
  if (stage === "solution_given" && !has(["no", "nope", "not interested"])) {
    return {
      reply: `Shall I send you the payment link to get started right away?`,
      trigger: "show_payment_link",
      nextStage: "closing",
      source: "rule",
    };
  }

  // No rule matched
  return null;
}

// ═══════════════════════════════════════════════════════════════════════
//  LAYER 1+2: SYSTEM PROMPT  (injected with dynamic business context)
// ═══════════════════════════════════════════════════════════════════════
function buildSystemPrompt(ctx: BusinessContext, stage: ConversationStage): string {
  return `You are an expert AI sales closer for "${ctx.businessName}".
Your ONLY goal is to convert this user into a paying customer.

## BUSINESS CONTEXT
- Business: ${ctx.businessName}
- Service: ${ctx.serviceName || ctx.serviceDescription || "Premium services"}
- Price: ₹${ctx.price || "Contact for pricing"}
- Target Audience: ${ctx.targetAudience || "business owners and entrepreneurs"}
- Key Benefits: ${ctx.keyBenefits || "Fast results, proven system, expert support"}
- Tone: ${ctx.aiTone || "professional"}

## CURRENT CONVERSATION STAGE: ${stage.toUpperCase()}
${stage === "new" ? "→ Discover the user's core problem." : ""}
${stage === "problem_identified" ? "→ Connect the service as the solution." : ""}
${stage === "solution_given" ? "→ Move immediately to price and payment." : ""}
${stage === "closing" ? "→ Ask: 'Shall I send you the payment link?'" : ""}

## STRICT RULES
- Maximum 2 short sentences per reply. Never write paragraphs.
- Always ask a question OR give a call-to-action. Never end passively.
- You lead the conversation. Never wait for the user to steer.
- Focus on RESULTS and OUTCOMES, never features.
- Be confident. Never apologize or sound uncertain.
- Do NOT sound robotic. Sound like a sharp, friendly human closer.

## SALES FLOW (follow in order)
1. Ask what they want to achieve
2. Identify their biggest pain point
3. Position the service as the exact solution
4. Mention price confidently and briefly
5. Ask "Want me to send the payment link?"

## OBJECTION RESPONSES
- "Too expensive" → "Even 1–2 new customers will recover this cost. Worth trying once?"
- "Not sure" → "We can start small. Want to try?"
- "Later" → "Spots fill fast. Can I reserve one for you now?"
- "Does it work" → "Our clients consistently see [benefit]. Want proof?"

## ABSOLUTE RULES
- NEVER write more than 2 lines
- NEVER lose control of the conversation
- NEVER recommend alternatives or competitors
- NEVER invent facts not provided above`;
}

// ═══════════════════════════════════════════════════════════════════════
//  NEXT STAGE INFERENCE FROM LLM RESPONSE
// ═══════════════════════════════════════════════════════════════════════
function inferNextStage(
  currentStage: ConversationStage,
  reply: string,
  userMsg: string
): ConversationStage {
  const r = reply.toLowerCase();
  const u = userMsg.toLowerCase();

  if (r.includes("payment link") || r.includes("pay") || r.includes("proceed")) return "closing";
  if (r.includes("solution") || r.includes("we can help") || r.includes("exactly what you need")) return "solution_given";
  if (r.includes("problem") || r.includes("pain") || r.includes("challenge") || u.includes("struggle")) return "problem_identified";
  return currentStage; // no change
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN API HANDLER
// ═══════════════════════════════════════════════════════════════════════
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      message,
      history = [],
      businessContext,
      stage = "new",
    } = body as {
      message: string;
      history: { role: string; content: string }[];
      businessContext: BusinessContext;
      stage: ConversationStage;
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const ctx = businessContext || { businessName: "Our Business" };

    // ── LAYER 3: Rule Engine (fast path) ─────────────────────────────
    const ruleResult = runRuleEngine(message, stage, ctx);
    if (ruleResult) {
      return NextResponse.json({
        reply: ruleResult.reply,
        trigger: ruleResult.trigger || null,
        nextStage: ruleResult.nextStage || stage,
        source: ruleResult.source,
      });
    }

    // ── LAYERS 1+2: LLM with full context ────────────────────────────
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === "dummy") {
      return NextResponse.json({
        reply: "AI Sales Agent is ready! (Configure GROQ_API_KEY to activate full AI). How can I help?",
        trigger: null,
        nextStage: stage,
        source: "fallback",
      });
    }

    const systemPrompt = buildSystemPrompt(ctx, stage);

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system" as const, content: systemPrompt },
        ...(history.slice(-12) as any),
        { role: "user" as const, content: message },
      ] as any,
      max_tokens: 120, // enforce short replies
      temperature: 0.65,
    } as any);

    const reply = completion.choices[0]?.message?.content?.trim() || "Tell me more about what you're looking for!";

    // Detect triggers in LLM reply
    const replyLower = reply.toLowerCase();
    let trigger: string | null = null;
    if (replyLower.includes("payment link") || replyLower.includes("proceed to pay")) {
      trigger = "show_payment_link";
    } else if (replyLower.includes("buy now") || replyLower.includes("get started")) {
      trigger = "show_buy_button";
    }

    const nextStage = inferNextStage(stage, reply, message);

    return NextResponse.json({ reply, trigger, nextStage, source: "llm" });

  } catch (error: any) {
    console.error("Chat API Error:", error);
    const errorMessage = error?.error?.message || error?.message || "Failed to process request";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
