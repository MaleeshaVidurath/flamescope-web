export type HabitatKey = "iss" | "moon_base" | "rover" | "mars_base";

export interface SlimTest {
  investigation_id: string;
  investigation: string;
  pillar: string;
  test_id: string;
  date: string | null;
  fuel: string | null;
  fuel_phase: string | null;
  geometry: string | null;
  o2_pct: number | null;
  o2_basis: string | null;
  pressure_psi: number | null;
  flow_cm_s: number | null;
  diluent: string | null;
  diluent_fraction: number | null;
  outcome: string | null;
  outcome_detail: string | null;
  quality_flags: string[];
  source_url: string;
  doi: string;
}

export interface RankRow {
  investigation_id: string;
  investigation: string;
  pillar: string;
  doi: string;
  score: number;
  rank: number;
  components: { condition_match: number; fuel_relevance: number; data_richness: number };
  evidence_counts: { direct: number; near: number; o2_only: number };
  evidence_status: "direct" | "related" | "none";
  reasons: string[];
}

export interface HabitatRanking {
  name: string;
  atmosphere: string;
  gravity: string;
  o2_window_pct: [number, number];
  pressure_window_psi: [number, number];
  overall_evidence: string;
  gaps: string[];
  best_per_pillar: Record<string, { investigation: string; score: number; rank: number }>;
  ranking: RankRow[];
}

export interface InsightCard {
  id: string;
  pillar: "prevention" | "detection" | "suppression";
  kind: "finding" | "gap";
  title: string;
  text: string;
  so_what: string;
  caveat: string;
  cite: string[];
  verified: boolean;
  values: Record<string, number>;
  related?: { label: string; url: string }[];
  source?: string;
}

export const HABITATS: { key: HabitatKey; label: string; short: string }[] = [
  { key: "iss", label: "ISS / spacecraft cabin", short: "ISS / spacecraft" },
  { key: "moon_base", label: "Moon base", short: "Moon base" },
  { key: "rover", label: "Pressurized rover", short: "Rover" },
  { key: "mars_base", label: "Mars base", short: "Mars base" },
];

export const PSI_URL = (id: string) => `https://psi.nasa.gov/physci/repo/data/investigations/${id}`;

export const OUTCOME_LABEL: Record<string, string> = {
  extinction: "Flame went out",
  disruption: "Droplet broke apart",
  completion: "Burned to completion",
  self_extinguished: "Went out on its own",
  flow_terminated: "Stopped by cutting fuel",
  no_hot_ignition: "No hot flame",
  cool_flame_only: "Cool flame only",
  flash_then_out: "Brief flash",
  blowoff: "Blown off by airflow",
  no_ignition: "Did not ignite",
  burned: "Burned",
  no_sustained_burning: "No sustained burning",
  burned_or_not_stated: "Burned / not stated",
  not_in_table: "Not in table",
  "ignited (day total)": "Ignited (day summary)",
  "no_ignition (day total)": "No ignition (day summary)",
  smoke_sample: "Smoke sample",
  smoke_sample_aged_measurement: "Aged smoke reading",
};
