"use client";
import insights from "@/data/insights.json";
import type { InsightCard } from "@/lib/types";
import { PSI_URL } from "@/lib/types";
import { pretty } from "@/lib/pretty";

const CARDS = (insights as unknown as { cards: InsightCard[] }).cards;
const COLS = [
  { key: "detection", title: "Detection", sub: "What will the smoke look like?" },
  { key: "suppression", title: "Suppression", sub: "What puts it out?" },
] as const;

// NASA's four prevention questions; each is answered by its own prevention sub-agent.
const QUESTIONS = [
  { key: "Q1", title: "Will the material burn, and how far will the flame spread?" },
  { key: "Q2", title: "How does oxygen-rich air change the risk?" },
  { key: "Q3", title: "What happens at lower pressure and partial gravity?" },
  { key: "Q4", title: "Where are the gaps?" },
] as const;
// The three original prevention cards, placed under the question they answer.
const BASE_Q: Record<string, string> = { P1: "Q1", P2: "Q2", P3: "Q4" };
const questionOf = (c: InsightCard) => c.question ?? BASE_Q[c.id] ?? "Q4";

function Card({ c }: { c: InsightCard }) {
  const gap = c.kind === "gap";
  return (
    <article className="panel p-4"
      style={gap ? { borderStyle: "dashed", borderColor: "var(--soot)", background: "var(--soot-soft)" } : undefined}>
      {(gap || c.source) && (
        <div className="flex flex-wrap gap-x-3 text-[12.5px] mb-1">
          {gap && <span className="font-semibold" style={{ color: "var(--soot)" }}>Evidence gap</span>}
          {c.source?.startsWith("agent:") && (
            <span className="text-[color:var(--ink-2)]">
              Found by the {c.source.slice(6)} {c.question ? `${c.question} sub-agent` : "agent"} · verified by script
            </span>
          )}
        </div>
      )}
      <h4 className="font-semibold leading-snug mb-2">{pretty(c.title)}</h4>
      <p className="text-[14px] mb-2">{pretty(c.text)}</p>
      <p className="text-[14px] text-[color:var(--ink-2)] mb-2"><span className="font-medium text-[color:var(--ink)]">Why it matters: </span>{pretty(c.so_what)}</p>
      <p className="text-[12.5px] text-[color:var(--muted)] mb-3">Limits: {pretty(c.caveat)}</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
        {c.cite.map((id) => <a key={id} className="link" href={PSI_URL(id)} target="_blank" rel="noreferrer">NASA {id}</a>)}
        {(c.related ?? []).map((r) => <a key={r.url + r.label} className="link" href={r.url} target="_blank" rel="noreferrer">{r.label}</a>)}
        {c.verified && (
          <span className="ml-auto text-[color:var(--ok)]" title={Object.entries(c.values).map(([k, v]) => `${k} = ${v}`).join("\n")}>
            ✓ Numbers recomputed from the records
          </span>
        )}
      </div>
    </article>
  );
}

export default function FindingsTab() {
  const prevention = CARDS.filter((c) => c.pillar === "prevention");
  return (
    <div>
      <p className="text-[14px] text-[color:var(--ink-2)] mb-5 max-w-[72ch]">
        NASA&apos;s fire-safety work has three tasks: prevent fires, detect them early, and put them out. Specialist agents search each
        task&apos;s NASA studies for findings; a script then recomputes every number from the records and rejects anything that does not
        match. Hover the check mark to see the numbers behind a finding.
      </p>

      <section aria-labelledby="col-prevention" className="mb-8">
        <h2 id="col-prevention" className="cond text-[22px] font-semibold leading-tight">Prevention</h2>
        <p className="text-[13.5px] text-[color:var(--ink-2)] mb-4 max-w-[72ch]">
          Will it ignite and keep burning? The prevention agent splits this into NASA&apos;s four questions, with one sub-agent for each.
        </p>
        <div className="space-y-6">
          {QUESTIONS.map((q, i) => {
            const cards = prevention.filter((c) => questionOf(c) === q.key);
            return (
              <div key={q.key} className="grid gap-3 lg:grid-cols-[220px_1fr] lg:gap-6">
                <h3 className="text-[15px] font-semibold leading-snug">
                  <span className="block text-[12.5px] font-normal text-[color:var(--muted)]">Question {i + 1}</span>
                  {q.title}
                </h3>
                {cards.length ? (
                  <div className="grid gap-4 md:grid-cols-2 items-start">{cards.map((c) => <Card key={c.id} c={c} />)}</div>
                ) : (
                  <p className="text-[13.5px] text-[color:var(--muted)]">No verified finding yet for this question.</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {COLS.map((col) => (
          <section key={col.key} aria-labelledby={`col-${col.key}`}>
            <h2 id={`col-${col.key}`} className="cond text-[22px] font-semibold leading-tight">{col.title}</h2>
            <p className="text-[13.5px] text-[color:var(--ink-2)] mb-3">{col.sub}</p>
            <div className="space-y-4">{CARDS.filter((c) => c.pillar === col.key).map((c) => <Card key={c.id} c={c} />)}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
