// FlameScope retrieval: pick the NASA records relevant to a question and pack them as compact context.
// No vector DB needed: the dataset is ~1,000 rows, so keyword + number matching is enough and fully explainable.
// SI note: drafted with Claude (Anthropic); reviewed by team SL-Pyronix.
import { evidenceGap } from "./evidenceGap";
import type { GapResult, TestRecord, FuelPhase } from "./evidenceGap";

export interface Card { id: string; pillar: string; kind: string; title: string; text: string; so_what: string; caveat: string; cite: string[] }
export interface Investigation { investigation_id: string; acronym: string; title: string; doi: string; hardware: string; flight_platform: string; objective: string; pillar?: string[]; role?: string }

const NAMES: Record<string, string[]> = {
  "PSI-25": ["bass-ii", "bass 2", "bass2"], "PSI-26": ["bass"], "PSI-99": ["saffire", "saffire-ii"],
  "PSI-20": ["bre", "burning rate emulator"], "PSI-159": ["cfi-g", "cool flame", "cfig"],
  "PSI-101": ["same-r", "smoke", "same"], "PSI-69": ["flex", "droplet", "extinguish", "suppression"],
};
const MATERIALS = ["pmma", "sibal", "cotton", "nomex", "silicone", "kapton", "teflon", "lampwick", "pyrell",
  "ethane", "propane", "butane", "methane", "ethylene", "methanol", "heptane", "wax", "ultem"];

export function parseQuestion(q: string) {
  const s = q.toLowerCase();
  const o2 = s.match(/(\d{1,3}(?:\.\d+)?)\s*%\s*(?:o2|o₂|oxygen)?/);
  const psi = s.match(/(\d{1,2}(?:\.\d+)?)\s*psi/);
  const partial = /moon|lunar|mars|rover|partial/.test(s);
  const habitatO2 = /moon|lunar|rover|mars/.test(s) ? 34 : /iss|station|spacecraft|cabin/.test(s) ? 21 : undefined;
  const habitatPsi = /moon|lunar|rover|mars/.test(s) ? 8.2 : /iss|station|spacecraft|cabin/.test(s) ? 14.7 : undefined;
  const fuel: FuelPhase = /fabric|plastic|material|solid|pmma|cotton|nomex|silicone/.test(s) ? "solid"
    : /gas|propane|ethane|butane|methane/.test(s) ? "gas" : /droplet|liquid|heptane|methanol/.test(s) ? "liquid" : "any";
  const invs = Object.entries(NAMES).filter(([, keys]) => keys.some((k) => s.includes(k))).map(([id]) => id);
  const mats = MATERIALS.filter((m) => s.includes(m));
  return {
    o2Pct: o2 ? parseFloat(o2[1]) : habitatO2,
    pressurePsi: psi ? parseFloat(psi[1]) : habitatPsi,
    fuel, partialGravity: partial, investigations: invs, materials: mats,
  };
}

type Row = TestRecord & { flow_cm_s?: number | null; diluent?: string | null; diluent_fraction?: number | null };
const compact = (t: Row) =>
  `${t.investigation}|${t.test_id}|fuel=${t.fuel ?? "n/r"}|O2=${t.o2_pct ?? "n/r"}%(${(t.o2_basis ?? "").split(" ")[0]})` +
  `|p=${t.pressure_psi !== null ? t.pressure_psi + "psi" : "n/r"}|flow=${t.flow_cm_s ?? "n/r"}|outcome=${t.outcome ?? "n/r"}` +
  (t.diluent && t.diluent !== "N2 only" ? `|diluent=${t.diluent}:${t.diluent_fraction}` : "");

export function buildContext(question: string, tests: TestRecord[], cards: Card[], invs: Investigation[], maxRows = 40) {
  const p = parseQuestion(question);
  let gap: GapResult | null = null;
  if (p.o2Pct !== undefined) {
    gap = evidenceGap(tests, { o2Pct: p.o2Pct, pressurePsi: p.pressurePsi, fuel: p.fuel, partialGravity: p.partialGravity });
  }
  // rows: gap matches first, then rows of named investigations / materials
  const picked: TestRecord[] = [];
  const add = (rs: TestRecord[]) => { for (const r of rs) if (picked.length < maxRows && !picked.includes(r)) picked.push(r); };
  const ql = question.toLowerCase();
  const dil = /co2|co₂|carbon dioxide/.test(ql) ? "CO2" : /helium|\bhe\b/.test(ql) ? "He" : null;
  if (dil) add(tests.filter((t) => (t as Row).diluent === dil));
  if (gap) { add(gap.direct); add(gap.related); }
  add(tests.filter((t) => p.investigations.includes(t.investigation_id)));
  add(tests.filter((t) => p.materials.some((m) => (t.fuel ?? "").toLowerCase().includes(m))));

  const invText = invs.map((i) =>
    `${i.investigation_id} ${i.acronym} (DOI ${i.doi}; ${i.flight_platform}; ${i.hardware}). Role: ${i.role ?? ""}. ` +
    `Objective: ${(i.objective ?? "").replace(/\s+/g, " ").slice(0, 300)}`).join("\n");
  const cardText = cards.map((c) => `[${c.id}|${c.pillar}|${c.kind}] ${c.title}: ${c.text} Caveat: ${c.caveat} (cites ${c.cite.join(", ")})`).join("\n");
  const gapText = gap
    ? `status=${gap.status}; ${gap.headline} Reasons: ${gap.reasons.join(" ")} (query O2=${p.o2Pct}%, p=${p.pressurePsi ?? "any"} psi, fuel=${p.fuel})`
    : "no oxygen level in the question; no gap check run";
  const rowsText = picked.map(compact).join("\n") || "(no matching test rows)";

  const context =
    `## Investigations\n${invText}\n\n## Verified insight cards\n${cardText}\n\n## Evidence gap check\n${gapText}\n\n` +
    `## Matching test records (${picked.length} shown; n/r = not reported)\n${rowsText}`;
  return { context, gap, parsed: p, rows: picked };
}
