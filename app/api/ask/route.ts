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

const STOP = new Set(["the", "and", "for", "are", "was", "what", "does", "how", "can", "with", "from", "that", "this", "show",
  "about", "well", "into", "they", "there", "have", "has", "will", "would", "when", "which", "their", "them", "out", "put"]);
// Question words mapped to the wording the findings use.
const SYNONYMS: Record<string, string[]> = {
  co2: ["co2"], "carbon": ["co2"], extinguish: ["went out", "extinction"], suppress: ["went out", "suppress"],
  fabric: ["fabric", "cotton", "sibal", "cabin material"], fabrics: ["fabric", "cotton", "sibal", "cabin material"],
  smoke: ["smoke"], detector: ["detector", "smoke"], airflow: ["airflow", "flow"], ventilation: ["airflow", "ventilation"],
  oxygen: ["o2", "oxygen"], moon: ["moon"], mars: ["mars"], pressure: ["psi", "pressure"],
};
const cardText = (c: Card) => `${c.title} ${c.text}`.toLowerCase();

function pickCards(question: string) {
  const words = question.toLowerCase();
  const terms = Array.from(new Set(words.split(/[^a-z0-9.]+/).filter((w) => w.length >= 3 && !STOP.has(w))));
  // Rare words (co2, silicone, saffire) count for more than common ones (flame, tests): inverse document frequency.
  const idf = (needle: string) => {
    const df = CARDS.filter((c) => cardText(c).includes(needle)).length;
    return df ? Math.log((CARDS.length + 1) / df) : 0;
  };
  const pillarHint = /smoke|detect/.test(words) ? "detection" : /extinguish|suppress|put out|co2|helium|go out|went out/.test(words) ? "suppression" : null;
  const moonish = /moon|lunar|rover|mars|3\d\s*%/.test(words);
  const score = (c: Card) => {
    const hay = cardText(c), title = c.title.toLowerCase();
    let s = pillarHint && c.pillar === pillarHint ? 1 : 0;
    let matched = 0;
    for (const t of terms) {
      let hit = false;
      for (const n of SYNONYMS[t] ?? [t]) {
        if (hay.includes(n)) { s += idf(n) * (title.includes(n) ? 1.5 : 1); hit = true; }
      }
      if (hit) matched += 1;
    }
    if (moonish && /moon|30%|30-34|7\.35/.test(hay)) s += 1.5;
    // A finding must share at least two of the question's words; one stray word ("water") is not a match.
    return matched >= 2 ? s : 0;
  };
  const ranked = CARDS.map((c) => ({ c, s: score(c) })).sort((a, b) => b.s - a.s);
  const top = ranked[0]?.s ?? 0;
  // Keep up to three findings that score at least half as well as the best one.
  return ranked.filter((r) => r.s > 0 && r.s >= top * 0.5).slice(0, 3).map((r) => r.c);
}

function fallbackAnswer(picked: Card[], ctx: ReturnType<typeof buildContext>) {
  const lines = [
    ctx.gap ? `**Evidence status:** ${ctx.gap.headline}` : "",
    ...(ctx.gap?.reasons ?? []).map((r) => `- ${r}`),
    picked.length ? "**What the data shows:**" : "**None of FlameScope's reviewed findings covers this question.** It answers questions about NASA's microgravity fire tests: oxygen, pressure, airflow, materials, smoke and CO2. To look at the raw records, use the Evidence explorer.",
    ...picked.map((c) => `- ${c.text} [${c.cite.join(", ")}, finding ${c.id}]`),
    "_Prepared answer built from FlameScope's reviewed findings._",
  ];
  return lines.filter(Boolean).join("\n");
}

// The findings an answer used, so the reader can open each one and its NASA records.
const usedFindings = (picked: Card[]) =>
  picked.map((c) => {
    const ev = (c as Card & { evidence_records?: { name: string; rows: number[] }[] }).evidence_records ?? [];
    const first = ev.find((e) => e.rows.length > 0);
    return { id: c.id, title: c.title, kind: c.kind, metric: first?.name ?? null, records: first?.rows.length ?? 0 };
  });

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

  const picked = pickCards(q);
  const findings = usedFindings(picked);
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ answer: fallbackAnswer(picked, ctx), mode: "prepared", evidence, sources, findings });
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
    return NextResponse.json({ answer, mode: "live", model: MODEL, evidence, sources, findings });
  } catch (e) {
    console.error("ask failed", e);
    return NextResponse.json({ answer: fallbackAnswer(picked, ctx), mode: "prepared", evidence, sources, findings });
  }
}
