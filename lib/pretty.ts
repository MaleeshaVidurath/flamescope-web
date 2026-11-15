// Display-only text cleanup: ASCII comparison signs and chemical formulas to proper symbols.
export function pretty(s: string): string {
  return s
    .replace(/>=/g, "≥")
    .replace(/<=/g, "≤")
    .replace(/\bCO2\b/g, "CO₂")
    .replace(/\bO2\b/g, "O₂")
    .replace(/(\d)-(\d+(?:\.\d+)?)(?=\s*(?:%|psi))/g, "$1–$2");
}
