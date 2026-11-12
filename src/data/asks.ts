// Questions for the Catchword card, each answered with words that are on the
// page it cites. src/data/asks.json is the source; `node scripts/quote-pages.mjs`
// verifies every quote against the live library and fills in `href` and `page`
// (the library's scan of the page, and where the quote sits on it).
import data from "./asks.json";

export interface Ask {
  key: string;
  /** The question, as someone would type it. */
  ask: string;
  /** What the answer names before it quotes: the document, and nothing else. */
  lead: string;
  /** The source's own words. */
  quote: string;
  cite: string;
  /** How Catchword names the source. */
  source: string;
  title: string;
  href: string;
  page: { img: string; w: number; h: number; hl: number[][] };
}

export const asks = data.asks as unknown as Ask[];
