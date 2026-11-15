"use client";
import insights from "@/data/insights.json";
import type { InsightCard } from "@/lib/types";
import { PSI_URL } from "@/lib/types";
import { pretty } from "@/lib/pretty";

const CARDS = (insights as unknown as { cards: InsightCard[] }).cards;
const COLS = [
  { key: "prevention", title: "Prevention", sub: "Will it ignite and keep burning?" },
  { key: "detection", title: "Detection", sub: "What will the smoke look like?" },
  { key: "suppression", title: "Suppression", sub: "What puts it out?" },
] as const;

function Card({ c }: { c: InsightCard }) {
  const gap = c.kind === "gap";
  return (
    <article className="panel p-4"
      style={gap ? { borderStyle: "dashed", borderColor: "var(--soot)", background: "var(--soot-soft)" } : undefined}>
      {gap && <div className="text-[12.5px] font-semibold mb-1" style={{ color: "var(--soot)" }}>Evidence gap</div>}
      <h3 className="font-semibold leading-snug mb-2">{c.title}</h3>
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
  return (
    <div>
      <p className="text-[14px] text-[color:var(--ink-2)] mb-4 max-w-[72ch]">
        NASA&apos;s fire-safety work has three tasks: prevent fires, detect them early, and put them out. Each finding below is computed from the
        NASA records and re-checked automatically; hover the check mark to see the numbers behind it.
      </p>
      <div className="grid gap-5 lg:grid-cols-3">
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
