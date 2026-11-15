"use client";
import { useMemo } from "react";
import rankings from "@/data/rankings.json";
import { evidenceGap, HABITAT_PRESETS } from "@/lib/evidenceGap";
import type { TestRecord } from "@/lib/evidenceGap";
import type { HabitatKey, HabitatRanking, SlimTest } from "@/lib/types";
import { PSI_URL } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import { pretty } from "@/lib/pretty";

const R = rankings as unknown as { method: Record<string, string>; habitats: Record<HabitatKey, HabitatRanking> };
const SEG = [
  { key: "condition_match", w: 45, color: "var(--s1)", label: "Conditions match" },
  { key: "fuel_relevance", w: 30, color: "var(--s3)", label: "Fuel like cabin materials" },
  { key: "data_richness", w: 25, color: "var(--s4)", label: "Usable data" },
] as const;
const PILLAR_LABEL: Record<string, string> = { prevention: "Prevention", detection: "Detection", suppression: "Suppression" };

export default function ScenariosTab({ habitat, tests }: { habitat: HabitatKey; tests: SlimTest[] }) {
  const h = R.habitats[habitat];
  const gap = useMemo(
    () => (tests.length ? evidenceGap(tests as unknown as TestRecord[], HABITAT_PRESETS[habitat]) : null),
    [tests, habitat]
  );
  const preset = HABITAT_PRESETS[habitat];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.55fr)]">
      <section aria-labelledby="gap-h" className="space-y-4">
        <div className="panel p-5">
          <h2 id="gap-h" className="cond text-[22px] font-semibold leading-tight mb-1">{h.name}</h2>
          <p className="text-[color:var(--ink-2)] mb-4">{pretty(h.atmosphere)} · gravity {h.gravity}</p>
          {gap && (
            <>
              <StatusBadge status={gap.status} />
              <p className="mt-3 font-medium">{gap.headline}</p>
              <p className="text-[13px] text-[color:var(--muted)] mt-1 num">
                Checked for cabin materials at {preset.o2Pct}% O₂{preset.pressurePsi ? `, ${preset.pressurePsi} psi` : ""}
                {habitat !== "iss" ? " (an example point inside the brief's range)" : ""}; tolerance ±{gap.tolerances.o2Pct} points O₂, ±{gap.tolerances.pressureFrac * 100}% pressure.
              </p>
              {gap.reasons.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-[14px] list-disc pl-5">
                  {gap.reasons.map((r) => <li key={r}>{pretty(r)}</li>)}
                </ul>
              )}
            </>
          )}
        </div>
        {h.gaps.length > 0 && (
          <div className="panel p-5" style={{ borderColor: "var(--soot)", background: "var(--soot-soft)" }}>
            <h3 className="font-semibold mb-2" style={{ color: "var(--soot)" }}>What NASA has not tested yet</h3>
            <ul className="space-y-2 text-[14px] list-disc pl-5">{h.gaps.map((g) => <li key={g}>{pretty(g)}</li>)}</ul>
          </div>
        )}
        <div className="panel p-5">
          <h3 className="font-semibold mb-3">Best study for each safety task</h3>
          <dl className="grid grid-cols-[auto_1fr_auto] gap-x-4 gap-y-2 text-[14px]">
            {["prevention", "detection", "suppression"].map((p) => {
              const b = h.best_per_pillar[p];
              return b ? (
                <div key={p} className="contents">
                  <dt className="text-[color:var(--ink-2)]">{PILLAR_LABEL[p]}</dt>
                  <dd className="font-medium">{b.investigation}</dd>
                  <dd className="num text-right text-[color:var(--muted)]">rank {b.rank} · {b.score}</dd>
                </div>
              ) : null;
            })}
          </dl>
        </div>
      </section>

      <section aria-labelledby="rank-h" className="panel p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
          <h2 id="rank-h" className="cond text-[22px] font-semibold">Which studies matter most here</h2>
          <span className="text-[13px] text-[color:var(--muted)]">Score out of 100</span>
        </div>
        <p className="text-[13.5px] text-[color:var(--ink-2)] mb-3">
          Ranks how useful each study&apos;s evidence is for this habitat. It is not a fire-risk score.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-[color:var(--ink-2)] mb-4" aria-label="Score parts">
          {SEG.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: s.color }} />
              {s.label} (up to {s.w})
            </span>
          ))}
        </div>
        <ol className="space-y-4">
          {h.ranking.map((r) => (
            <li key={r.investigation_id} className="border-t border-[color:var(--rule-soft)] pt-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="num text-[color:var(--muted)] w-5">{r.rank}</span>
                <a href={PSI_URL(r.investigation_id)} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
                  {r.investigation}
                </a>
                <span className="text-[12.5px] text-[color:var(--muted)]">{PILLAR_LABEL[r.pillar]} · {r.investigation_id}</span>
                <span className="ml-auto flex items-center gap-2">
                  <StatusBadge status={r.evidence_status} size="sm" />
                  <span className="num font-semibold w-12 text-right">{r.score}</span>
                </span>
              </div>
              <div className="ml-8 mt-2">
                <div className="flex h-2.5 w-full rounded-full bg-[color:var(--rule-soft)] overflow-hidden"
                  role="img" aria-label={`Score ${r.score}: conditions ${Math.round(r.components.condition_match * 45)}, fuel ${Math.round(r.components.fuel_relevance * 30)}, data ${Math.round(r.components.data_richness * 25)}`}>
                  {SEG.map((s) => {
                    const v = r.components[s.key] * s.w;
                    return v > 0 ? <span key={s.key} style={{ width: `${v}%`, background: s.color, marginRight: 2 }} title={`${s.label}: ${v.toFixed(1)}`} /> : null;
                  })}
                </div>
                <ul className="mt-2 text-[13.5px] text-[color:var(--ink-2)] space-y-0.5">
                  {r.reasons.map((x) => <li key={x}>{pretty(x)}</li>)}
                </ul>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[12.5px] text-[color:var(--muted)]">{R.method.formula}. Fuel weights are an editorial judgement.</p>
      </section>
    </div>
  );
}
