// Evidence status: icon + label + colour, never colour alone.
const STYLE = {
  direct: { label: "Direct evidence", icon: "✓", fg: "var(--ok)", bg: "var(--ok-soft)" },
  related: { label: "Related evidence", icon: "◐", fg: "var(--soot)", bg: "var(--soot-soft)" },
  none: { label: "No direct evidence", icon: "○", fg: "var(--none)", bg: "var(--none-soft)" },
} as const;

export default function StatusBadge({ status, size = "md" }: { status: "direct" | "related" | "none"; size?: "sm" | "md" }) {
  const s = STYLE[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap"
      style={{ color: s.fg, background: s.bg, padding: size === "sm" ? "2px 8px" : "4px 12px", fontSize: size === "sm" ? 12.5 : 14 }}
    >
      <span aria-hidden>{s.icon}</span>
      {s.label}
    </span>
  );
}
