"use client";
import { useState } from "react";
import StatusBadge from "./StatusBadge";
import { pretty } from "@/lib/pretty";

const SUGGESTED = [
  "Can cabin fabrics burn in a Moon base atmosphere at 34% oxygen?",
  "How well does CO2 put out droplet fires?",
  "What does SAFFIRE show about silicone?",
];

interface AskResult {
  answer: string;
  mode: "live" | "prepared";
  evidence: { status: "direct" | "related" | "none"; headline: string; reasons: string[] } | null;
  sources: { id: string; name?: string; doi?: string; url: string }[];
  error?: string;
}

// Minimal markdown: **bold**, "- " bullets, _italic_ lines, paragraphs. No HTML is injected.
function Md({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const inline = (s: string, k: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") ? <strong key={k + i}>{part.slice(2, -2)}</strong> : <span key={k + i}>{part.replace(/^_(.*)_$/, "$1")}</span>);
  const flush = () => { if (list.length) { blocks.push(<ul key={"u" + blocks.length}>{list.map((l, i) => <li key={i}>{inline(l, "l" + i)}</li>)}</ul>); list = []; } };
  text.split("\n").forEach((line, i) => {
    const t = line.trim();
    if (/^[-*] /.test(t)) list.push(t.slice(2));
    else { flush(); if (t) blocks.push(<p key={"p" + i}>{inline(t, "p" + i)}</p>); }
  });
  flush();
  return <div className="prose-answer">{blocks}</div>;
}

export default function AskTab() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<AskResult | null>(null);
  const [asked, setAsked] = useState("");

  async function ask(question: string) {
    if (question.trim().length < 3) return;
    setBusy(true); setAsked(question); setRes(null);
    try {
      const r = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
      setRes(await r.json());
    } catch {
      setRes({ answer: "", mode: "prepared", evidence: null, sources: [], error: "The answer service did not respond. Check your connection and ask again." });
    } finally { setBusy(false); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <section className="panel p-5" aria-labelledby="ask-h">
        <h2 id="ask-h" className="cond text-[22px] font-semibold">Ask the NASA data</h2>
        <p className="text-[13.5px] text-[color:var(--ink-2)] mb-4 max-w-[64ch]">
          Answers come only from the 1,018 NASA records in FlameScope, with the test IDs they rely on. If the data does not cover a question, the answer says so.
        </p>
        <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex gap-2">
          <label htmlFor="q" className="sr-only">Your question</label>
          <input id="q" className="field flex-1 text-[15px] py-2.5" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. Do flames go out by themselves at 30% oxygen?" maxLength={500} />
          <button className="btn" disabled={busy || q.trim().length < 3}>{busy ? "Checking…" : "Ask"}</button>
        </form>
        <div className="mt-3 flex flex-col gap-2">
          {SUGGESTED.map((s) => (
            <button key={s} className="btn-ghost" onClick={() => { setQ(s); ask(s); }} disabled={busy}>{s}</button>
          ))}
        </div>
      </section>

      <section className="panel p-5 min-h-[260px]" aria-live="polite" aria-labelledby="ans-h">
        <h2 id="ans-h" className="sr-only">Answer</h2>
        {!res && !busy && <p className="text-[color:var(--ink-2)]">Pick a question or type your own. The answer appears here with its evidence status and NASA sources.</p>}
        {busy && <p className="text-[color:var(--ink-2)]">Reading the NASA records for “{asked}”…</p>}
        {res?.error && <p style={{ color: "var(--soot)" }}>{res.error}</p>}
        {res && !res.error && (
          <div>
            <p className="text-[13px] text-[color:var(--muted)] mb-2">“{asked}”</p>
            {res.evidence && <div className="mb-3"><StatusBadge status={res.evidence.status} /></div>}
            <Md text={pretty(res.answer)} />
            {res.sources.length > 0 && (
              <div className="mt-4 pt-3 border-t border-[color:var(--rule-soft)] text-[13px]">
                <div className="text-[color:var(--ink-2)] mb-1">NASA sources used</div>
                <ul className="flex flex-wrap gap-x-4 gap-y-1">
                  {res.sources.map((s) => <li key={s.id}><a className="link" href={s.url} target="_blank" rel="noreferrer">{s.name ?? s.id} ({s.id})</a></li>)}
                </ul>
              </div>
            )}
            <p className="mt-3 text-[12px] text-[color:var(--muted)]">
              {res.mode === "live" ? "Answer written by Claude (Anthropic) from the records above." : "Prepared answer, assembled from verified findings and the evidence-gap check. Live Claude answers run only where an API key is configured."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
