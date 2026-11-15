// POST /api/ask  { question: string }  ->  { answer, mode, evidence, sources }
// Ask FlameScope: Claude answers only from retrieved NASA PSI records.
// If ANTHROPIC_API_KEY is missing or the call fails, a deterministic answer is built from the verified cards,
// so the demo never breaks.
// SI note: drafted with Claude (Anthropic); reviewed by team SL-Pyronix.
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import tests from "@/data/tests.json";
import insights from "@/data/insights.json";
import investigations from "@/data/investigations.json";
import { buildContext } from "@/lib/retrieve";
import type { Card, Investigation } from "@/lib/retrieve";
import { SYSTEM_PROMPT, userMessage } from "@/lib/prompt";
import type { TestRecord } from "@/lib/evidenceGap";

export const runtime = "nodejs";
const MODEL = process.env.FLAMESCOPE_MODEL ?? "claude-sonnet-5-5";

const TESTS = tests as unknown as TestRecord[];
const CARDS = (insights as unknown as { cards: Card[] }).cards;
const INVS = investigations as unknown as Investigation[];

function fallbackAnswer(question: string, ctx: ReturnType<typeof buildContext>) {
  const words = question.toLowerCase();
  const pillar = /smoke|detect/.test(words) ? "detection" : /extinguish|suppress|put out|co2|helium/.test(words) ? "suppression" : "prevention";
  const qTerms = new Set(words.split(/[^a-z0-9]+/).filter((w) => w.length > 3));
  const moonish = /moon|lunar|rover|mars|3\d\s*%/.test(words);
  const scoreCard = (c: Card) => {
    const hay = `${c.title} ${c.text}`.toLowerCase();
    let s = c.pillar === pillar ? 2 : 0;
    qTerms.forEach((t) => { if (hay.includes(t)) s += 1; });
    if (moonish && /moon|30%|30-34|7\.35/.test(hay)) s += 3;
    return s;
  };
  const picked = [...CARDS].sort((a, b) => scoreCard(b) - scoreCard(a)).slice(0, 2);
  const lines = [
    ctx.gap ? `**Evidence status:** ${ctx.gap.headline}` : "",
    ...(ctx.gap?.reasons ?? []).map((r) => `- ${r}`),
    "**What the data shows:**",
    ...picked.map((c) => `- ${c.text} [${c.cite.join(", ")}, card ${c.id}]`),
    "_Prepared answer built from FlameScope's verified findings._",
  ];
  return lines.filter(Boolean).join("\n");
}

export async function POST(req: Request) {
  const { question } = (await req.json().catch(() => ({}))) as { question?: string };
  if (!question || question.trim().length < 3) {
    return NextResponse.json({ error: "Ask a question about microgravity fire data." }, { status: 400 });
  }
  const q = question.slice(0, 500);
  const ctx = buildContext(q, TESTS, CARDS, INVS);
  const evidence = ctx.gap ? { status: ctx.gap.status, headline: ctx.gap.headline, reasons: ctx.gap.reasons } : null;
  const sources = Array.from(new Set(ctx.rows.map((r) => r.investigation_id))).map((id) => {
    const inv = INVS.find((i) => i.investigation_id === id);
    return { id, name: inv?.acronym, doi: inv?.doi, url: `https://psi.nasa.gov/physci/repo/data/investigations/${id}` };
  });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ answer: fallbackAnswer(q, ctx), mode: "prepared", evidence, sources });
  }
  try {
    const client = new Anthropic(); // reads ANTHROPIC_API_KEY
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage(q, ctx.context) }],
    });
    const answer = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    return NextResponse.json({ answer, mode: "live", model: MODEL, evidence, sources });
  } catch (e) {
    console.error("ask failed", e);
    return NextResponse.json({ answer: fallbackAnswer(q, ctx), mode: "prepared", evidence, sources });
  }
}
