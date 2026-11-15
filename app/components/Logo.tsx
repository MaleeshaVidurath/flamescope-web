/** FlameScope mark: a microgravity flame (round blue core, orange edge) inside a target ring. */
export default function Logo({ size = 40, title }: { size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role={title ? "img" : undefined}
      aria-label={title} aria-hidden={title ? undefined : true} className="flex-none">
      <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="6" />
      <path d="M50 3 V15 M50 85 V97 M3 50 H15 M85 50 H97" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <circle cx="50" cy="50" r="24" fill="#f2a15a" />
      <circle cx="50" cy="50" r="15" fill="#2a6fdb" />
    </svg>
  );
}
