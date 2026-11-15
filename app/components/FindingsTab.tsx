"use client";
import insights from "@/data/insights.json";
import type { InsightCard } from "@/lib/types";
import { PSI_URL } from "@/lib/types";
import { pretty } from "@/lib/pretty";

const CARDS = (insights as unknown as { cards: InsightCard[] }).cards;
// NASA's four questions per pillar; each is answered by its own sub-agent.
const PILLARS = [
  {
    key: "prevention", title: "Prevention", sub: "Will it ignite and keep burning?",
    questions: [
      "Will the material burn, and how far will the flame spread?",
      "How does oxygen-rich air change the risk?",
      "What happens at lower pressure and partial gravity?",
      "Where are the gaps?",
    ],
  },
  {
    key: "detection", title: "Detection", sub: "What will the smoke look like?",
    questions: [
      "What does smoke from each material look like?",
      "How do heating level and airflow change the smoke?",
      "How does smoke change as it ages and travels?",
      "Where are the gaps?",
    ],
  },
] as const;
// The original cards, placed under the question they answer.
const BASE_Q: Record<string, string> = { P1: "Q1", P2: "Q2", P3: "Q4", D1: "Q1", D2: "Q4" };
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

function QuestionPillar({ p }: { p: (typeof PILLARS)[number] }) {
  const cards = CARDS.filter((c) => c.pillar === p.key);
  return (
    <section aria-labelledby={`col-${p.key}`} className="mb-10">
      <h2 id={`col-${p.key}`} className="cond text-[22px] font-semibold leading-tight">{p.title}</h2>
      <p className="text-[13.5px] text-[color:var(--ink-2)] mb-4 max-w-[72ch]">
        {p.sub} The {p.key} agent splits this into NASA&apos;s four questions, with one sub-agent for each.
      </p>
      <div className="space-y-6">
        {p.questions.map((title, i) => {
          const qc = cards.filter((c) => questionOf(c) === `Q${i + 1}`);
          return (
            <div key={title} className="grid gap-3 lg:grid-cols-[220px_1fr] lg:gap-6">
              <h3 className="text-[15px] font-semibold leading-snug">
                <span className="block text-[12.5px] font-normal text-[color:var(--muted)]">Question {i + 1}</span>
                {title}
              </h3>
              {qc.length ? (
                <div className="grid gap-4 md:grid-cols-2 items-start">{qc.map((c) => <Card key={c.id} c={c} />)}</div>
              ) : (
                <p className="text-[13.5px] text-[color:var(--muted)]">No verified finding yet for this question.</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function FindingsTab() {
  return (
    <div>
      <p className="text-[14px] text-[color:var(--ink-2)] mb-5 max-w-[72ch]">
        NASA&apos;s fire-safety work has three tasks: prevent fires, detect them early, and put them out. Specialist agents search each
        task&apos;s NASA studies for findings; a script then recomputes every number from the records and rejects anything that does not
        match. Hover the check mark to see the numbers behind a finding.
      </p>
      {PILLARS.map((p) => <QuestionPillar key={p.key} p={p} />)}
      <section aria-labelledby="col-suppression">
        <h2 id="col-suppression" className="cond text-[22px] font-semibold leading-tight">Suppression</h2>
        <p className="text-[13.5px] text-[color:var(--ink-2)] mb-3">What puts it out?</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-start">
          {CARDS.filter((c) => c.pillar === "suppression").map((c) => <Card key={c.id} c={c} />)}
        </div>
      </section>
    </div>
  );
}
