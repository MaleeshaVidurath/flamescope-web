"use client";
import insights from "@/data/insights.json";
import type { InsightCard, PillarSummary, SummaryPoint } from "@/lib/types";
import { PSI_URL } from "@/lib/types";
import { pretty } from "@/lib/pretty";
import { useEffect, useState } from "react";
import { readHash, recordsHref } from "@/lib/hash";

const DATA = insights as unknown as { cards: InsightCard[]; summaries?: Record<string, PillarSummary> };
const CARDS = DATA.cards;
const SUMMARIES = DATA.summaries ?? {};
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
      "Which materials&apos; smoke was sampled, and how?",
      "How do heating level and airflow change the smoke?",
      "How does smoke change as it ages and travels?",
      "Where are the gaps?",
    ],
  },
  {
    key: "suppression", title: "Suppression", sub: "What puts it out?",
    questions: [
      "What puts the flame out?",
      "How do oxygen-rich air, fuel and pressure change that?",
      "Can airflow or venting put a fire out?",
      "Where are the gaps?",
    ],
  },
] as const;
// The original cards, placed under the question they answer.
const BASE_Q: Record<string, string> = { P1: "Q1", P2: "Q2", P3: "Q4", D1: "Q1", D2: "Q4", S1: "Q1", S2: "Q2" };
const questionOf = (c: InsightCard) => c.question ?? BASE_Q[c.id] ?? "Q4";

function Evidence({ c }: { c: InsightCard }) {
  const ev = c.evidence_records ?? [];
  if (!ev.length) return null;
  return (
    <div className="mt-2 mb-3 rounded-[var(--radius-sm)] border border-[color:var(--rule)] bg-[color:var(--panel)] p-3">
      <p className="text-[12.5px] text-[color:var(--ink-2)] mb-2">
        Every number above was counted by code from the NASA records. Click a count to see exactly which records.
      </p>
      <ul className="space-y-1.5 text-[13px]">
        {ev.map((e) => (
          <li key={e.name} className="flex flex-wrap items-baseline gap-x-2">
            <span className="num font-semibold min-w-[3.5ch] text-right">{e.value}</span>
            <span className="text-[color:var(--ink-2)] flex-1 min-w-[12rem]">{pretty(e.how)}</span>
            {e.rows.length > 0 ? (
              <a className="link whitespace-nowrap" href={recordsHref(c.id, e.name)}>
                {e.rows.length} record{e.rows.length > 1 ? "s" : ""}
              </a>
            ) : (
              <span className="text-[color:var(--muted)] whitespace-nowrap">no records match</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Card({ c }: { c: InsightCard }) {
  const gap = c.kind === "gap";
  const [open, setOpen] = useState(false);
  const first = (c.evidence_records ?? []).find((e) => e.rows.length > 0);
  return (
    <article id={`card-${c.id}`} className="panel p-4 scroll-mt-4 transition-shadow"
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
      {(c.evidence_records ?? []).length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <button type="button" className="btn-ghost text-[13px]" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? "Hide how we got these numbers" : "How we got these numbers"}
          </button>
          {first && (
            <a className="btn-ghost text-[13px]" href={recordsHref(c.id, first.name)}>
              See the {first.rows.length} NASA records
            </a>
          )}
        </div>
      )}
      {open && <Evidence c={c} />}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
        {c.cite.map((id) => <a key={id} className="link" href={PSI_URL(id)} target="_blank" rel="noreferrer">NASA {id}</a>)}
        {(c.related ?? []).map((r) => <a key={r.url + r.label} className="link" href={r.url} target="_blank" rel="noreferrer">{r.label}</a>)}
        {c.verified && (
          <span className="ml-auto text-[color:var(--ok)]" title={Object.entries(c.values).map(([k, v]) => `${k} = ${v}`).join("\n")}>
            ✓ Numbers recomputed from the records
          </span>
        )}
        {c.review?.resolved && (
          <span className="w-full text-right text-[color:var(--ok)]"
            title={c.review.verdict === "ok" ? "Passed the independent fairness review as written" : "Wording revised after the independent fairness review"}>
            ✓ Reviewed for a fair comparison
          </span>
        )}
      </div>
    </article>
  );
}

function CardRefs({ ids }: { ids: string[] }) {
  return (
    <span className="whitespace-nowrap text-[12px]">
      {ids.map((id) => (
        <a key={id} href={`#card-${id}`} className="link ml-1.5">{id}</a>
      ))}
    </span>
  );
}

function SummaryBlock({ label, point }: { label: string; point: SummaryPoint }) {
  return (
    <div className="mt-3 pt-3 border-t border-[color:var(--rule-soft)]">
      <p className="text-[12.5px] font-semibold text-[color:var(--ink-2)] mb-0.5">{label}</p>
      <p className="text-[14px]">{pretty(point.text)} <CardRefs ids={point.cards} /></p>
    </div>
  );
}

function OverallBrief() {
  const s = SUMMARIES.overall;
  if (!s) return null;
  return (
    <article className="panel p-5 mb-5" aria-labelledby="sum-overall" style={{ borderColor: "var(--flame)" }}>
      <p className="text-[12.5px] text-[color:var(--ink-2)] mb-1">All three tasks together, for Moon and Mars missions</p>
      <h2 id="sum-overall" className="cond text-[24px] font-semibold leading-tight mb-2">{pretty(s.headline)}</h2>
      <p className="text-[14.5px] text-[color:var(--ink-2)] mb-4 max-w-[80ch]">{pretty(s.summary)}</p>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div>
          <p className="text-[12.5px] font-semibold text-[color:var(--ink-2)] mb-1">What connects the findings</p>
          <ul className="space-y-2 text-[14px] list-disc pl-5">
            {s.key_points.map((k) => (
              <li key={k.text}>{pretty(k.text)} <CardRefs ids={k.cards} /></li>
            ))}
          </ul>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 content-start">
          {(s.missions ?? []).map((m) => (
            <div key={m.mission} className="rounded-[var(--radius-sm)] p-3" style={{ background: "var(--flame-soft)" }}>
              <p className="text-[13px] font-semibold mb-0.5">{m.mission}</p>
              <p className="text-[14px]">{pretty(m.text)} <CardRefs ids={m.cards} /></p>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-x-6 sm:grid-cols-2">
        <SummaryBlock label="Biggest gap across all three tasks" point={s.top_gap} />
        <SummaryBlock label="First test for NASA" point={s.next_test} />
      </div>
      <p className="mt-4 text-[12.5px] text-[color:var(--ok)]">✓ Merged by one agent from the three task summaries; every number checked against verified findings</p>
    </article>
  );
}

function SummaryCard({ p }: { p: (typeof PILLARS)[number] }) {
  const s = SUMMARIES[p.key];
  const n = CARDS.filter((c) => c.pillar === p.key).length;
  if (!s) return null;
  return (
    <article className="panel p-5 flex flex-col" aria-labelledby={`sum-${p.key}`}>
      <p className="cond text-[20px] font-semibold leading-none mb-1">{p.title}</p>
      <p className="text-[12.5px] text-[color:var(--muted)] mb-3">{p.sub}</p>
      <h3 id={`sum-${p.key}`} className="text-[17px] font-semibold leading-snug mb-2">{pretty(s.headline)}</h3>
      <p className="text-[14px] text-[color:var(--ink-2)] mb-3">{pretty(s.summary)}</p>
      <ul className="space-y-2 text-[14px] list-disc pl-5">
        {s.key_points.map((k) => (
          <li key={k.text}>{pretty(k.text)} <CardRefs ids={k.cards} /></li>
        ))}
      </ul>
      <SummaryBlock label="Biggest gap" point={s.top_gap} />
      <SummaryBlock label="Next test for NASA" point={s.next_test} />
      {s.equipment && <SummaryBlock label="For fire-safety controls and equipment" point={s.equipment} />}
      {s.earth && <SummaryBlock label="On Earth (context, not tested in these studies)" point={s.earth} />}
      <div className="mt-auto pt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
        <a className="link" href={`#col-${p.key}`}>See all {n} verified findings</a>
        <span className="ml-auto text-[color:var(--ok)]">✓ Organized by the {p.key} agent from verified findings</span>
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
  // Arriving from the Explorer ("Back to the finding"): scroll to that card and outline it briefly.
  useEffect(() => {
    const id = readHash().params.get("card");
    const el = id ? document.getElementById(`card-${id}`) : null;
    if (!el) return;
    el.scrollIntoView({ block: "start" });
    el.style.boxShadow = "0 0 0 3px var(--flame)";
    const t = setTimeout(() => { el.style.boxShadow = ""; }, 2500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div>
      <p className="text-[14px] text-[color:var(--ink-2)] mb-5 max-w-[72ch]">
        NASA&apos;s fire-safety work has three tasks: prevent fires, detect them early, and put them out. Question sub-agents search each
        task&apos;s NASA studies for findings, a script recomputes every number from the records, and independent reviewer agents check
        that each comparison is fair. An organizer agent per task sums up the reviewed findings, and one merge agent joins all three
        into the mission brief below. Hover a check mark to see the numbers behind a finding.
      </p>
      <OverallBrief />
      {Object.keys(SUMMARIES).length > 0 && (
        <div className="grid gap-5 lg:grid-cols-3 items-stretch mb-10">
          {PILLARS.map((p) => <SummaryCard key={p.key} p={p} />)}
        </div>
      )}
      {PILLARS.map((p) => <QuestionPillar key={p.key} p={p} />)}
    </div>
  );
}
