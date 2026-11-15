/** The address-bar hash carries the tab and optional parameters, e.g. "#explorer?card=S2&m=hi". */
export function readHash(): { tab: string; params: URLSearchParams } {
  const raw = typeof window === "undefined" ? "" : window.location.hash.replace(/^#/, "");
  const [tab, query = ""] = raw.split("?");
  return { tab, params: new URLSearchParams(query) };
}

/** Link to the NASA records behind one number of one finding. */
export const recordsHref = (cardId: string, metric: string) =>
  `#explorer?card=${encodeURIComponent(cardId)}&m=${encodeURIComponent(metric)}`;
