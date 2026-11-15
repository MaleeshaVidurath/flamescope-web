"use client";
// The atmosphere map: every NASA test placed by oxygen (x) and pressure (y), with habitat zones.
// One measure per axis, thin marks, legend + direct labels, hover tooltip per point.
import { useMemo, useState } from "react";
import type { HabitatKey, SlimTest } from "@/lib/types";
import { OUTCOME_LABEL } from "@/lib/types";

const W = 900, H = 470, M = { l: 56, r: 20, t: 18, b: 44 };
const STRIP_H = 96; // O2-only strip under the plot
const PLOT_H = H - M.t - M.b - STRIP_H - 18;
const X0 = 10, X1 = 102, Y0 = 0, Y1 = 50;
const x = (v: number) => M.l + ((v - X0) / (X1 - X0)) * (W - M.l - M.r);
const y = (v: number) => M.t + PLOT_H - ((Math.min(v, Y1) - Y0) / (Y1 - Y0)) * PLOT_H;

const ZONES: Record<HabitatKey, { x0: number; x1: number; y0: number; y1: number; label: string }> = {
  iss: { x0: 19.5, x1: 23.5, y0: 13.5, y1: 15.5, label: "ISS / spacecraft cabin" },
  moon_base: { x0: 30, x1: 101, y0: 0, y1: 10.2, label: "Moon base: ≥30% O₂, ≤10.2 psi" },
  rover: { x0: 30, x1: 101, y0: 0, y1: 10.2, label: "Pressurized rover: ≥30% O₂, ≤10.2 psi" },
  mars_base: { x0: 30, x1: 101, y0: 0, y1: 10.2, label: "Mars base (assumed Moon-base atmosphere)" },
};

type Series = "cfig_n" | "cfig_i" | "flex";
const SERIES: Record<Series, { label: string; color: string }> = {
  cfig_n: { label: "ACME CFI-G gas flames · cabin O₂", color: "var(--s1)" },
  cfig_i: { label: "ACME CFI-G inverse flames · O₂ from burner, not cabin", color: "var(--s2)" },
  flex: { label: "FLEX fuel droplets", color: "var(--s3)" },
};
const seriesOf = (t: SlimTest): Series | null =>
  t.investigation === "FLEX" ? "flex" : t.investigation === "ACME CFI-G" ? (t.test_id.startsWith("I-") ? "cfig_i" : "cfig_n") : null;

const STRIP = [
  { inv: "BASS-II", label: "BASS-II solid samples" },
  { inv: "SAFFIRE-II", label: "SAFFIRE-II large samples" },
  { inv: "ACME BRE", label: "ACME BRE emulated solids" },
];

export default function AtmosphereMap({ tests, habitat }: { tests: SlimTest[]; habitat: HabitatKey }) {
  const [hover, setHover] = useState<SlimTest | null>(null);
  const pts = useMemo(
    () => tests.filter((t) => t.o2_pct !== null && t.pressure_psi !== null && seriesOf(t)),
    [tests]
  );
  const strip = useMemo(
    () =>
      STRIP.map((s) => {
        const v = tests.filter((t) => t.investigation === s.inv && t.o2_pct !== null).map((t) => t.o2_pct as number);
        return { ...s, n: v.length, lo: v.length ? Math.min(...v) : null, hi: v.length ? Math.max(...v) : null };
      }),
    [tests]
  );
  const z = ZONES[habitat];
  const counts = useMemo(() => {
    const c: Record<Series, number> = { cfig_n: 0, cfig_i: 0, flex: 0 };
    pts.forEach((t) => (c[seriesOf(t) as Series] += 1));
    return c;
  }, [pts]);
  const stripTop = M.t + PLOT_H + 30;

  return (
    <figure className="relative">
      <div className="flex flex-wrap gap-x-5 gap-y-1 mb-2 text-[13px] text-[color:var(--ink-2)]" aria-label="Legend">
        {(Object.keys(SERIES) as Series[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <svg width="12" height="12" aria-hidden>
              {k === "cfig_i" ? (
                <rect x="2" y="2" width="8" height="8" transform="rotate(45 6 6)" fill="none" stroke={SERIES[k].color} strokeWidth="2" />
              ) : k === "flex" ? (
                <rect x="1.5" y="1.5" width="9" height="9" fill={SERIES[k].color} />
              ) : (
                <circle cx="6" cy="6" r="4.5" fill={SERIES[k].color} />
              )}
            </svg>
            {SERIES[k].label} <span className="num text-[color:var(--muted)]">({counts[k]})</span>
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
        aria-label="Scatter of NASA tests by oxygen percent and pressure in psi, with habitat zones">
        {/* grid + axes */}
        {[0, 10, 20, 30, 40, 50].map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke="var(--rule-soft)" />
            <text x={M.l - 8} y={y(v) + 4} textAnchor="end" fontSize="12" fill="var(--muted)" className="num">{v}</text>
          </g>
        ))}
        {[20, 40, 60, 80, 100].map((v) => (
          <g key={v}>
            <line x1={x(v)} x2={x(v)} y1={M.t} y2={stripTop + STRIP_H - 8} stroke="var(--rule-soft)" />
            <text x={x(v)} y={H - 18} textAnchor="middle" fontSize="12" fill="var(--muted)" className="num">{v}%</text>
          </g>
        ))}
        <text x={14} y={M.t + PLOT_H / 2} fontSize="12.5" fill="var(--ink-2)" transform={`rotate(-90 14 ${M.t + PLOT_H / 2})`} textAnchor="middle">Pressure (psi)</text>
        <text x={(M.l + W - M.r) / 2} y={H - 2} fontSize="12.5" fill="var(--ink-2)" textAnchor="middle">Oxygen in the surrounding gas (%)</text>

        {/* selected habitat zone */}
        <rect className="zone-glow" x={x(z.x0)} y={y(z.y1)} width={x(z.x1) - x(z.x0)} height={y(z.y0) - y(z.y1)}
          fill="var(--flame)" fillOpacity={0.12} stroke="var(--flame)" strokeOpacity={0.6} strokeDasharray="4 3" />
        <text x={habitat === "iss" ? x(z.x1) + 70 : x(56)} y={habitat === "iss" ? y(24) : y(1.6)}
          fontSize="12.5" fontWeight={600} fill="var(--flame)">{z.label}</text>

        {/* points */}
        {pts.map((t) => {
          const s = seriesOf(t) as Series;
          const cx = x(t.o2_pct as number), cy = y(t.pressure_psi as number);
          const common = { onMouseEnter: () => setHover(t), onMouseLeave: () => setHover(null), style: { cursor: "pointer" } };
          return (
            <g key={t.investigation_id + t.test_id} {...common}>
              <circle cx={cx} cy={cy} r={9} fill="transparent" />
              {s === "cfig_i" ? (
                <rect x={cx - 4} y={cy - 4} width={8} height={8} transform={`rotate(45 ${cx} ${cy})`} fill="var(--panel)" stroke={SERIES[s].color} strokeWidth={1.8} />
              ) : s === "flex" ? (
                <rect x={cx - 4} y={cy - 4} width={8} height={8} fill={SERIES[s].color} stroke="var(--panel)" strokeWidth={1.5} />
              ) : (
                <circle cx={cx} cy={cy} r={4.5} fill={SERIES[s].color} stroke="var(--panel)" strokeWidth={1.5} />
              )}
            </g>
          );
        })}

        {/* reference atmospheres */}
        {/* reference atmospheres, labels set clear of the data with a leader line */}
        {[{ o: 21, p: 14.7, lx: 27, ly: 22, l: "Earth air / ISS: 21%, 14.7 psi", end: false },
          { o: 100, p: 4.3, lx: 92, ly: 25, l: "Spacesuit: 100%, 4.3 psi", end: true }].map((r) => (
          <g key={r.l}>
            <line x1={x(r.o)} y1={y(r.p)} x2={x(r.lx)} y2={y(r.ly) + 4} stroke="var(--muted)" />
            <path d={`M ${x(r.o)} ${y(r.p) - 7} l 6 7 l -6 7 l -6 -7 z`} fill="var(--ink)" stroke="var(--panel)" strokeWidth={1.5} />
            <text x={r.end ? x(r.lx) + 30 : x(r.lx) + 4} y={y(r.ly)} textAnchor={r.end ? "end" : "start"} fontSize="12" fill="var(--ink)">{r.l}</text>
          </g>
        ))}

        {/* O2-only strip: studies that did not report pressure */}
        <text x={M.l} y={stripTop - 8} fontSize="12" fill="var(--ink-2)">Oxygen range only (these tables do not report pressure)</text>
        {strip.map((s, i) => {
          const yy = stripTop + 16 + i * 24;
          return (
            <g key={s.inv}>
              {s.lo !== null && s.hi !== null && (
                <line x1={x(s.lo)} x2={x(Math.max(s.hi, s.lo + 0.6))} y1={yy} y2={yy} stroke="var(--ink-2)" strokeWidth={7} strokeLinecap="round" />
              )}
              <text x={s.hi !== null ? x(s.hi) + 10 : M.l} y={yy + 4} fontSize="12" fill="var(--ink)">
                {s.label}{s.lo !== null ? ` · ${s.lo}–${s.hi}% O₂ · ${s.n} records` : " · filtered out"}
              </text>
            </g>
          );
        })}
      </svg>

      {hover && (
        <div className="absolute pointer-events-none panel px-3 py-2 text-[13px] shadow-sm"
          style={{ left: `${(x(hover.o2_pct as number) / W) * 100}%`, top: `${(y(hover.pressure_psi as number) / H) * 100}%`, transform: "translate(12px, -110%)", maxWidth: 280 }}>
          <div className="font-semibold">{hover.investigation} · {hover.test_id}</div>
          <div className="num">{hover.fuel} · {hover.o2_pct}% O₂ · {hover.pressure_psi} psi</div>
          {hover.diluent && hover.diluent !== "N2 only" && <div className="num">Diluent {hover.diluent} {hover.diluent_fraction}</div>}
          <div className="text-[color:var(--ink-2)]">{OUTCOME_LABEL[hover.outcome ?? ""] ?? hover.outcome}</div>
        </div>
      )}
      <figcaption className="sr-only">Each mark is one NASA test. The dashed box is the selected habitat atmosphere.</figcaption>
    </figure>
  );
}
