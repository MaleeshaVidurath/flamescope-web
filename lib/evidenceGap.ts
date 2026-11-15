// FlameScope Evidence Gap Indicator.
// Given a habitat condition (O2 %, pressure psi, fuel phase), says how well NASA PSI tests cover it.
// SI note: drafted with Claude (Anthropic); logic reviewed by team SL-Pyronix.

export type FuelPhase = "solid" | "gas" | "liquid" | "any";

export interface TestRecord {
  investigation_id: string;
  investigation: string;
  test_id: string;
  fuel: string | null;
  fuel_phase: string | null;
  o2_pct: number | null;
  o2_basis: string | null;
  pressure_psi: number | null;
  outcome: string | null;
  source_url: string;
  doi: string;
}

export interface GapQuery {
  o2Pct: number;          // e.g. 34
  pressurePsi?: number;   // e.g. 8.2; omit if unknown
  fuel?: FuelPhase;       // what burns: "solid" for cabin fabrics/plastics
  partialGravity?: boolean; // true for Moon / Mars / rover
}

export type GapStatus = "direct" | "related" | "none";

export interface GapResult {
  status: GapStatus;
  headline: string;
  reasons: string[];          // why the match is imperfect (never "safe"/"unsafe")
  direct: TestRecord[];       // same fuel phase, O2 within tol, pressure within tol
  related: TestRecord[];      // close on some axes only
  tolerances: { o2Pct: number; pressureFrac: number };
}

const O2_TOL = 3;        // +/- percentage points
const P_TOL = 0.15;      // +/- 15 % of the requested pressure
// Tests run inside a crew cabin at its normal pressure, where the table omits pressure (BASS-II on ISS, SAFFIRE-II on Cygnus).
// For an Earth-normal query (13.5-15.5 psi) they count as direct, with an "assumed" note shown to the user.
const CABIN_TESTS = new Set(["PSI-25", "PSI-99"]);
const cabinQuery = (psi?: number) => psi !== undefined && psi >= 13.5 && psi <= 15.5;

// Only cabin-atmosphere oxygen counts. CFI-G inverse flames feed O2 from the burner: excluded.
export function isAmbient(t: TestRecord): boolean {
  const b = t.o2_basis ?? "";
  return t.o2_pct !== null && b.includes("ambient") && !b.includes("NOT");
}

function phaseOf(t: TestRecord): FuelPhase {
  const p = (t.fuel_phase ?? "").toLowerCase();
  if (p.startsWith("solid") || p.includes("emulator of solids")) return "solid";
  if (p.startsWith("gas")) return "gas";
  if (p.startsWith("liquid")) return "liquid";
  return "any";
}

export function evidenceGap(tests: TestRecord[], q: GapQuery): GapResult {
  const fuel = q.fuel ?? "any";
  const o2Ok = (t: TestRecord) => Math.abs((t.o2_pct as number) - q.o2Pct) <= O2_TOL;
  const pOk = (t: TestRecord) =>
    q.pressurePsi === undefined
      ? true
      : t.pressure_psi !== null && Math.abs(t.pressure_psi - q.pressurePsi) <= P_TOL * q.pressurePsi;
  const fuelOk = (t: TestRecord) => fuel === "any" || phaseOf(t) === fuel;

  const amb = tests.filter(isAmbient);
  // "direct" needs the pressure to be KNOWN when the user gave one
  const assumed = (t: TestRecord) =>
    t.pressure_psi === null && cabinQuery(q.pressurePsi) && CABIN_TESTS.has(t.investigation_id);
  const direct = amb.filter(
    (t) => o2Ok(t) && fuelOk(t) && (q.pressurePsi === undefined || (t.pressure_psi !== null && pOk(t)) || assumed(t))
  );
  const related = amb.filter((t) => !direct.includes(t) && o2Ok(t) && (pOk(t) || t.pressure_psi === null || fuelOk(t)));

  const reasons: string[] = [];
  const nAssumed = direct.filter(assumed).length;
  if (nAssumed) reasons.push(`${nAssumed} of the direct matches ran in a crew cabin that did not log pressure; cabin pressure (~14.7 psi) is assumed.`);
  if (q.partialGravity) {
    reasons.push(
      "All PSI flight tests are microgravity; no partial-gravity combustion data exists yet. " +
        "Microgravity and Earth-gravity results can only bound the answer."
    );
  }
  if (!direct.length && related.length) {
    const otherFuel = related.filter((t) => !fuelOk(t));
    const noP = related.filter((t) => t.pressure_psi === null);
    const otherP = related.filter((t) => t.pressure_psi !== null && !pOk(t));
    if (otherFuel.length) {
      const phases = Array.from(new Set(otherFuel.map(phaseOf))).join(" / ");
      reasons.push(`${otherFuel.length} tests match the oxygen level but burned ${phases} fuel, not ${fuel}.`);
    }
    if (noP.length) reasons.push(`${noP.length} tests match the oxygen level but did not report pressure.`);
    if (otherP.length) reasons.push(`${otherP.length} tests match the oxygen level at a different pressure.`);
  }
  if (!direct.length && !related.length) {
    const maxO2 = Math.max(...amb.filter(fuelOk).map((t) => t.o2_pct as number));
    reasons.push(
      `No test within ${O2_TOL} points of ${q.o2Pct}% O2` +
        (fuel !== "any" && isFinite(maxO2) ? `; ${fuel}-fuel tests stop at ${maxO2}% O2.` : ".")
    );
  }

  const status: GapStatus = direct.length ? "direct" : related.length ? "related" : "none";
  const headline =
    status === "direct"
      ? `Direct evidence: ${direct.length} NASA tests at these conditions.`
      : status === "related"
      ? `Related evidence only: ${related.length} tests are close, but conditions differ.`
      : "No direct evidence: NASA has not tested these conditions in these datasets.";
  // Missing data is never proof of safety or danger.
  return { status, headline, reasons, direct, related, tolerances: { o2Pct: O2_TOL, pressureFrac: P_TOL } };
}

// Habitat presets. ISS = Earth-normal cabin. Moon/rover: an example point inside the challenge brief's range
// (>=30% O2, <=10.2 psi) - label it as an example in the UI. Mars = assumption, label it too.
export const HABITAT_PRESETS: Record<string, GapQuery & { label: string }> = {
  iss: { label: "ISS / spacecraft cabin", o2Pct: 21, pressurePsi: 14.7, fuel: "solid" },
  moon_base: { label: "Moon base", o2Pct: 34, pressurePsi: 8.2, fuel: "solid", partialGravity: true },
  rover: { label: "Pressurized rover", o2Pct: 34, pressurePsi: 8.2, fuel: "solid", partialGravity: true },
  mars_base: { label: "Mars base (assumed Moon-base atmosphere)", o2Pct: 34, pressurePsi: 8.2, fuel: "solid", partialGravity: true },
};
