"use client";
import { useMemo, useState } from "react";
import type { HabitatKey, SlimTest } from "@/lib/types";
import { OUTCOME_LABEL } from "@/lib/types";
import AtmosphereMap from "./AtmosphereMap";

const INVS = ["BASS-II", "BASS", "SAFFIRE-II", "ACME BRE", "ACME CFI-G", "SAME-R", "FLEX"];
const PAGE = 25;
const nr = (v: unknown, unit = "") => (v === null || v === undefined || v === "" ? <span className="text-[color:var(--muted)]">not reported</span> : <>{String(v)}{unit}</>);

export default function ExplorerTab({ tests, habitat }: { tests: SlimTest[]; habitat: HabitatKey }) {
  const [inv, setInv] = useState<string[]>(INVS);
  const [o2Min, setO2Min] = useState("");
  const [o2Max, setO2Max] = useState("");
  const [outcome, setOutcome] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  const outcomes = useMemo(() => Array.from(new Set(tests.map((t) => t.outcome).filter(Boolean))) as string[], [tests]);
  const filtered = useMemo(() => {
    const lo = o2Min === "" ? -Infinity : Number(o2Min), hi = o2Max === "" ? Infinity : Number(o2Max);
    const s = q.trim().toLowerCase();
    return tests.filter((t) =>
      inv.includes(t.investigation) &&
      (o2Min === "" && o2Max === "" ? true : t.o2_pct !== null && t.o2_pct >= lo && t.o2_pct <= hi) &&
      (!outcome || t.outcome === outcome) &&
      (!s || `${t.fuel} ${t.test_id} ${t.geometry}`.toLowerCase().includes(s)));
  }, [tests, inv, o2Min, o2Max, outcome, q]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const rows = filtered.slice(page * PAGE, page * PAGE + PAGE);
  const toggle = (n: string) => { setPage(0); setInv((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n])); };
  const reset = () => { setInv(INVS); setO2Min(""); setO2Max(""); setOutcome(""); setQ(""); setPage(0); };

  return (
    <div className="space-y-5">
      <div className="panel p-4 flex flex-wrap items-end gap-x-5 gap-y-3" role="group" aria-label="Filters">
        <div>
          <div className="text-[12.5px] text-[color:var(--ink-2)] mb-1.5">Study</div>
          <div className="flex flex-wrap gap-1.5">
            {INVS.map((n) => (
              <button key={n} className="chip" aria-pressed={inv.includes(n)} onClick={() => toggle(n)}>{n}</button>
            ))}
          </div>
        </div>
        <label className="text-[12.5px] text-[color:var(--ink-2)]">Oxygen %
          <span className="flex items-center gap-1 mt-1.5">
            <input className="field w-16 num" inputMode="decimal" placeholder="min" value={o2Min} onChange={(e) => { setO2Min(e.target.value); setPage(0); }} aria-label="Minimum oxygen percent" />
            <span>–</span>
            <input className="field w-16 num" inputMode="decimal" placeholder="max" value={o2Max} onChange={(e) => { setO2Max(e.target.value); setPage(0); }} aria-label="Maximum oxygen percent" />
          </span>
        </label>
        <label className="text-[12.5px] text-[color:var(--ink-2)]">Result
          <select className="field block mt-1.5" value={outcome} onChange={(e) => { setOutcome(e.target.value); setPage(0); }}>
            <option value="">Any result</option>
            {outcomes.map((o) => <option key={o} value={o}>{OUTCOME_LABEL[o] ?? o}</option>)}
          </select>
        </label>
        <label className="text-[12.5px] text-[color:var(--ink-2)]">Fuel or test ID
          <input className="field block mt-1.5 w-44" placeholder="e.g. PMMA, butane" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        </label>
        <button className="btn-ghost ml-auto" onClick={reset}>Clear filters</button>
      </div>

      <section className="panel p-5" aria-labelledby="map-h">
        <h2 id="map-h" className="cond text-[22px] font-semibold">Where NASA&apos;s tests sit against habitat atmospheres</h2>
        <p className="text-[13.5px] text-[color:var(--ink-2)] mb-3">Hover a mark for the test. The dashed box follows the habitat chosen above.</p>
        <AtmosphereMap tests={filtered} habitat={habitat} />
      </section>

      <section className="panel" aria-labelledby="tbl-h">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4 pb-3">
          <h2 id="tbl-h" className="cond text-[20px] font-semibold">
            <span className="num">{filtered.length}</span> of <span className="num">{tests.length}</span> NASA records
          </h2>
          <div className="flex items-center gap-2 text-[13px]">
            <button className="btn-ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <span className="num text-[color:var(--ink-2)]">Page {page + 1} of {pages}</span>
            <button className="btn-ghost" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data">
            <thead>
              <tr><th>Study</th><th>Test</th><th>Fuel</th><th className="r">O₂ %</th><th className="r">Pressure psi</th><th className="r">Flow cm/s</th><th>Result</th><th>Source</th></tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.investigation_id + t.test_id}>
                  <td className="whitespace-nowrap">{t.investigation}</td>
                  <td className="num whitespace-nowrap">{t.test_id}</td>
                  <td>{nr(t.fuel)}{t.diluent && t.diluent !== "N2 only" ? <span className="block text-[12px] text-[color:var(--muted)]">diluent {t.diluent} {t.diluent_fraction}</span> : null}</td>
                  <td className="r num">{nr(t.o2_pct)}{t.o2_basis?.includes("NOT") ? <span className="block text-[11.5px]" style={{ color: "var(--soot)" }}>burner stream</span> : null}</td>
                  <td className="r num">{nr(t.pressure_psi)}</td>
                  <td className="r num">{nr(t.flow_cm_s)}</td>
                  <td>{OUTCOME_LABEL[t.outcome ?? ""] ?? nr(t.outcome)}
                    {t.quality_flags.length > 0 && (
                      <span className="block text-[11.5px]" style={{ color: "var(--soot)" }} title={t.quality_flags.join("\n")}>
                        ⚠ {t.quality_flags.length} data note{t.quality_flags.length > 1 ? "s" : ""}
                      </span>)}
                  </td>
                  <td><a className="link text-[13px]" href={t.source_url} target="_blank" rel="noreferrer">{t.investigation_id}</a></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-[color:var(--ink-2)]">No records match these filters. Widen the oxygen range or clear filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
