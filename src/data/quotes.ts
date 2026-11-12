// Quotations for the quote check in the CitationBench section.
// src/data/quotes.json is the source; `node scripts/quote-pages.mjs` verifies
// each against the live library (and that its slip fails) and fills in `href`.
import data from "./quotes.json";

export interface Quote {
  key: string;
  text: string;
  cite: string;
  /** How Catchword names the source. */
  source: string;
  title: string;
  /** One word a careless quoter gets wrong, and what they write instead. */
  slip: [string, string];
  href: string;
}

export const quotes = data.quotes as unknown as Quote[];
