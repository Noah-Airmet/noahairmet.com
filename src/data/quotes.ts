// Quotations for the SafetyPage check. src/data/quotes.json is the source;
// `node scripts/quote-pages.mjs` verifies each against the live library and
// fills in `href` and `page` (the scan and where the quote sits on it).
import data from "./quotes.json";

export interface Quote {
  key: string;
  text: string;
  cite: string;
  /** How SafetyPage names the source. */
  source: string;
  title: string;
  /** One word a careless quoter gets wrong, and what they write instead. */
  slip: [string, string];
  href: string;
  page: { img: string; w: number; h: number; hl: number[][] };
}

export const quotes = data.quotes as unknown as Quote[];
