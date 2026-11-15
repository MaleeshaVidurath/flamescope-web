"use client";
import { useEffect, useMemo, useState } from "react";
import type { HabitatKey, SlimTest } from "@/lib/types";
import { HABITATS } from "@/lib/types";
import ScenariosTab from "./components/ScenariosTab";
import ExplorerTab from "./components/ExplorerTab";
import FindingsTab from "./components/FindingsTab";
import AskTab from "./components/AskTab";

const TABS = [
  { key: "scenarios", label: "Mission scenarios" },
  { key: "explorer", label: "Evidence explorer" },
  { key: "findings", label: "Prevention · Detection · Suppression" },
  { key: "ask", label: "Ask FlameScope" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function Home() {
  const [tab, setTab] = useState<TabKey>("scenarios");
  const [habitat, setHabitat] = useState<HabitatKey>("moon_base");
  const [tests, setTests] = useState<SlimTest[]>([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch("/data/tests_slim.json").then((r) => r.json()).then(setTests).catch(() => setLoadError(true));
    const fromHash = () => {
      const h = window.location.hash.replace("#", "") as TabKey;
      if (TABS.some((t) => t.key === h)) setTab(h);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);
  // At-a-glance numbers, computed from the records themselves (Moon-base air per the challenge brief: >=30% cabin O2, <=10.2 psi).
  const glance = useMemo(() => {
    const ambient = (t: SlimTest) => t.o2_pct !== null && (t.o2_basis ?? "").includes("ambient") && !(t.o2_basis ?? "").includes("NOT");
    const moon = tests.filter((t) => ambient(t) && (t.o2_pct as number) >= 30 && t.pressure_psi !== null && t.pressure_psi <= 10.2);
    return {
      records: tests.length,
      studies: new Set(tests.map((t) => t.investigation_id)).size,
      moon: moon.length,
      moonSolids: moon.filter((t) => (t.fuel_phase ?? "").startsWith("solid")).length,
    };
  }, [tests]);
  const go = (k: TabKey) => { setTab(k); history.replaceState(null, "", `#${k}`); };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[color:var(--rule)] bg-[color:var(--panel)]">
        <div className="mx-auto max-w-[1240px] px-5 pt-6 pb-0">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <div className="max-w-[60ch]">
              <h1 className="cond text-[40px] leading-none font-semibold tracking-tight">FlameScope</h1>
              <p className="mt-2 text-[15.5px] text-[color:var(--ink-2)]">
                NASA&apos;s microgravity fire experiments, checked against the air crews will breathe on the ISS, the Moon and Mars.
                <span className="num"> {(tests.length || 1018).toLocaleString()}</span> test records from 7 NASA studies, every number traceable to its source.
              </p>
            </div>
            <div>
              <div id="hab-label" className="text-[12.5px] text-[color:var(--ink-2)] mb-1.5">Habitat</div>
              <div className="seg" role="group" aria-labelledby="hab-label">
                {HABITATS.map((h) => (
                  <button key={h.key} aria-pressed={habitat === h.key} onClick={() => setHabitat(h.key)}>{h.short}</button>
                ))}
              </div>
            </div>
          </div>
          {tests.length > 0 && (
            <dl className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--rule)] border border-[color:var(--rule)] rounded-[10px] overflow-hidden">
              {[
                { v: glance.records, l: "NASA test records, one format", tab: "explorer" as TabKey },
                { v: glance.studies, l: "microgravity fire studies combined", tab: "explorer" as TabKey },
                { v: glance.moon, l: "tests in Moon-base air (≥30% O₂, ≤10.2 psi), all gas flames", tab: "scenarios" as TabKey },
                { v: glance.moonSolids, l: "cabin materials burned in Moon-base air in these 7 studies", tab: "findings" as TabKey },
              ].map((g, i) => (
                <button key={g.l} onClick={() => { if (i >= 2) setHabitat("moon_base"); go(g.tab); }}
                  className="text-left bg-[color:var(--panel)] px-4 py-3 hover:bg-[color:var(--paper)]">
                  <dt className="sr-only">{g.l}</dt>
                  <dd className="cond num text-[30px] font-semibold leading-none"
                    style={i === 3 ? { color: "var(--soot)" } : undefined}>{g.v.toLocaleString()}</dd>
                  <dd className="mt-1 text-[13px] text-[color:var(--ink-2)] leading-snug">{g.l}</dd>
                </button>
              ))}
            </dl>
          )}
          <nav className="mt-5 flex flex-wrap" role="tablist" aria-label="Sections">
            {TABS.map((t) => (
              <button key={t.key} role="tab" className="tab" aria-selected={tab === t.key} aria-controls={`panel-${t.key}`} onClick={() => go(t.key)}>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-[1240px] px-5 py-6">
        {loadError && <p className="panel p-4 mb-4" style={{ color: "var(--soot)" }}>The test records did not load. Refresh the page; if it persists, check that /data/tests_slim.json is deployed.</p>}
        <div id={`panel-${tab}`} role="tabpanel">
          {tab === "scenarios" && <ScenariosTab habitat={habitat} tests={tests} />}
          {tab === "explorer" && <ExplorerTab habitat={habitat} tests={tests} />}
          {tab === "findings" && <FindingsTab />}
          {tab === "ask" && <AskTab />}
        </div>
      </main>

      <footer className="border-t border-[color:var(--rule)] bg-[color:var(--panel)]">
        <div className="mx-auto max-w-[1240px] px-5 py-5 text-[12.5px] text-[color:var(--ink-2)] grid gap-2 md:grid-cols-2">
          <p>
            Data: NASA Physical Sciences Informatics (PSI), CC0-1.0. Investigations PSI-25, PSI-26, PSI-99, PSI-20, PSI-159, PSI-101 and PSI-69.{" "}
            <a className="link" href="https://psi.nasa.gov/physci/repo/search" target="_blank" rel="noreferrer">Browse PSI</a>
          </p>
          <p>
            Built with SI assistance (Claude, Anthropic): data pipeline, scoring, insight wording and parts of this interface were AI-drafted and checked
            by team SL-Pyronix against the NASA records. A research prototype, not a safety certification tool. Rocket and propellant fires are outside the scope of the PSI data used here.
          </p>
        </div>
      </footer>
    </div>
  );
}
