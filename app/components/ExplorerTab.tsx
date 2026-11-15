"use client";
import { useEffect, useMemo, useState } from "react";
import insights from "@/data/insights.json";
import type { HabitatKey, InsightCard, SlimTest } from "@/lib/types";
import { readHash, recordsHref } from "@/lib/hash";
import { pretty } from "@/lib/pretty";
import { OUTCOME_LABEL } from "@/lib/types";
import AtmosphereMap from "./AtmosphereMap";

const INVS = ["BASS-II", "BASS", "SAFFIRE-II", "ACME BRE", "ACME CFI-G", "SAME-R", "FLEX"];
const PAGE = 25;
const CARDS = (insights as unknown as { cards: InsightCard[] }).cards;
const COLS: (keyof SlimTest)[] = ["investigation_id", "investigation", "doi", "pillar", "test_id", "date", "fuel", "fuel_phase", "geometry",
  "o2_pct", "o2_basis", "pressure_psi", "flow_cm_s", "diluent", "diluent_fraction", "outcome", "outcome_detail", "quality_flags", "source_url"];
const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : Array.isArray(v) ? v.join(";") : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
// What each exported column means, for modelers.
const DICTIONARY: [string, string][] = [
  ["investigation_id, doi, source_url", "NASA PSI investigation and its DOI; cite these when you reuse the data."],
  ["pillar", "Fire-safety task the study informs: prevention, detection or suppression."],
  ["fuel, fuel_phase, geometry", "What burned and its form (solid sheet or rod, gas burner, liquid droplet, heated smoke sample)."],
  ["o2_pct, o2_basis", "Oxygen percent and how it was obtained. In ACME CFI-G inverse (I-) tests it is the burner oxygen stream, not cabin air."],
  ["pressure_psi", "Chamber pressure; blank where the table does not report it (e.g. BASS-II, SAFFIRE-II, SAME-R)."],
  ["flow_cm_s", "Airflow speed where stated in cm/s; BASS-II airflow exists only as raw controller settings (full file)."],
  ["diluent, diluent_fraction", "FLEX added gas (CO2, helium or nitrogen only) and its share."],
  ["outcome, outcome_detail", "Normalized result (e.g. extinction, blowoff, self-extinguished, smoke sample) and the original wording."],
  ["quality_flags", "Notes on missing or derived values; read before modeling."],
  ["m_* (full file only)", "Study-specific measurements: burn time, droplet and extinction diameters, flame temperature, heater ratio, aging times and more."],
];
const nr = (v: unknown, unit = "") => (v === null || v === undefined || v === "" ? <span className="text-[color:var(--muted)]">not reported</span> : <>{String(v)}{unit}</>);

export default function ExplorerTab({ tests, habitat }: { tests: SlimTest[]; habitat: HabitatKey }) {
  const [inv, setInv] = useState<string[]>(INVS);
  const [o2Min, setO2Min] = useState("");
  const [o2Max, setO2Max] = useState("");
  const [outcome, setOutcome] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  // Evidence mode: "#explorer?card=S2&m=hi" shows only the records behind one number of one finding.
  const [ev, setEv] = useState<{ card: string; m: string } | null>(null);
  useEffect(() => {
    const read = () => {
      const { tab, params } = readHash();
      const card = params.get("card"), m = params.get("m");
      setEv(tab === "explorer" && card && m ? { card, m } : null);
      setPage(0);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const evCard = ev ? CARDS.find((c) => c.id === ev.card) : undefined;
  const evMetric = evCard?.evidence_records?.find((e) => e.name === ev?.m);
  const base = useMemo(
    () => (evMetric ? evMetric.rows.map((i) => tests[i]).filter(Boolean) : tests),
    [evMetric, tests]
  );

  const outcomes = useMemo(() => Array.from(new Set(tests.map((t) => t.outcome).filter(Boolean))) as string[], [tests]);
  const filtered = useMemo(() => {
    const lo = o2Min === "" ? -Infinity : Number(o2Min), hi = o2Max === "" ? Infinity : Number(o2Max);
    const s = q.trim().toLowerCase();
    return base.filter((t) =>
      inv.includes(t.investigation) &&
      (o2Min === "" && o2Max === "" ? true : t.o2_pct !== null && t.o2_pct >= lo && t.o2_pct <= hi) &&
      (!outcome || t.outcome === outcome) &&
      (!s || `${t.fuel} ${t.test_id} ${t.geometry}`.toLowerCase().includes(s)));
  }, [base, inv, o2Min, o2Max, outcome, q]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const rows = filtered.slice(page * PAGE, page * PAGE + PAGE);
  const toggle = (n: string) => { setPage(0); setInv((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n])); };
  const reset = () => { setInv(INVS); setO2Min(""); setO2Max(""); setOutcome(""); setQ(""); setPage(0); };

  return (
    <div className="space-y-5">
      {evCard && evMetric && (
        <section className="panel p-5" aria-labelledby="ev-h" style={{ borderColor: "var(--flame)", background: "var(--flame-soft)" }}>
          <p className="text-[12.5px] text-[color:var(--ink-2)] mb-1">The NASA records behind finding {evCard.id}</p>
          <h2 id="ev-h" className="cond text-[21px] font-semibold leading-snug mb-1">{pretty(evCard.title)}</h2>
          <p className="text-[14px] mb-3 max-w-[85ch]">{pretty(evCard.text)}</p>
          <p className="text-[12.5px] text-[color:var(--ink-2)] mb-1.5">Each number in the finding, with its records. Pick one:</p>
          <div className="flex flex-wrap gap-1.5 mb-3" role="group" aria-label="Numbers in this finding">
            {(evCard.evidence_records ?? []).map((e) => (
              e.rows.length ? (
                <a key={e.name} className="chip" aria-current={e.name === evMetric.name ? "true" : undefined}
                  href={recordsHref(evCard.id, e.name)} title={pretty(e.how)}>
                  <span className="num font-semibold">{e.value}</span>
                  {String(e.rows.length) !== e.value && <span className="text-[12px]">from {e.rows.length} records</span>}
                </a>
              ) : (
                <span key={e.name} className="chip opacity-60" title={`${pretty(e.how)}: no records match`}>
                  <span className="num font-semibold">{e.value}</span>
                  <span className="text-[12px]">none</span>
                </span>
              )
            ))}
          </div>
          <p className="text-[13.5px]"><span className="font-medium">Showing: </span>{pretty(evMetric.how)} = <span className="num font-semibold">{evMetric.value}</span></p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px]">
            <a className="link" href={`#findings?card=${evCard.id}`}>Back to the finding</a>
            <a className="link" href="#explorer">Show all {tests.length.toLocaleString()} records</a>
          </div>
        </section>
      )}
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
            <span className="num">{filtered.length}</span> of <span className="num">{base.length}</span> {evMetric ? `records behind finding ${evCard?.id}` : "NASA records"}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <button className="btn-ghost" disabled={!filtered.length} onClick={() => download("flamescope_filtered_records.csv",
              [COLS.join(","), ...filtered.map((t) => COLS.map((c) => csvCell(t[c])).join(","))].join("\n"), "text/csv")}>
              Download {filtered.length} as CSV
            </button>
            <button className="btn-ghost" disabled={!filtered.length} onClick={() => download("flamescope_filtered_records.json",
              JSON.stringify(filtered, null, 2), "application/json")}>
              JSON
            </button>
            <span className="w-px h-5 bg-[color:var(--rule)]" aria-hidden="true" />
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

      <section className="panel p-5" aria-labelledby="dl-h">
        <h2 id="dl-h" className="cond text-[20px] font-semibold mb-1">Use this data for modeling</h2>
        <p className="text-[13.5px] text-[color:var(--ink-2)] mb-3 max-w-[78ch]">
          The buttons above export the records that match your filters. For flammability and fire-scenario models, the full file adds every
          study-specific measurement (44 columns starting with m_) for all 1,018 records.{" "}
          <a className="link" href="/data/flamescope_tests_full.csv" download>Download the full dataset (CSV)</a>
        </p>
        <details>
          <summary className="cursor-pointer text-[13.5px] font-medium">What each column means</summary>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-[minmax(0,15rem)_1fr]">
            {DICTIONARY.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="font-medium num">{k}</dt>
                <dd className="text-[color:var(--ink-2)]">{v}</dd>
              </div>
            ))}
          </dl>
        </details>
        <p className="mt-3 text-[12.5px] text-[color:var(--muted)]">
          Source: NASA PSI, CC0-1.0, normalized by FlameScope. Rocket and propellant fires are outside the PSI combustion data and this dashboard.
        </p>
      </section>
    </div>
  );
}
