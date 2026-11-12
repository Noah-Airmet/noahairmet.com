// Quotations for the SafetyPage check. Each was verified against the live
// library (POST /api/verify) on 2026-11-12; `cite` is where it was found.
export interface Quote {
  text: string;
  cite: string;
  source: string;
  href: string;
}

const d = (path: string) => `https://safetypage.noahairmet.com/d/${path}`;

export const quotes: Quote[] = [
  {
    text: "AI risk management is a key component of responsible development and use of AI systems.",
    cite: "nist:nist.ai.100-1/r1/p6",
    source: "NIST AI Risk Management Framework 1.0, p. 6",
    href: d("nist/nist.ai.100-1/r1/p6"),
  },
  {
    text: "Mitigating the risk of extinction from AI should be a global priority alongside other societal-scale risks such as pandemics and nuclear war.",
    cite: "cais:press-release-ai-risk/r1/b3",
    source: "Center for AI Safety, Statement on AI Risk, ¶3",
    href: d("cais/press-release-ai-risk/r1/b3"),
  },
  {
    text: "Artificial intelligence (AI) holds extraordinary potential for both promise and peril.",
    cite: "us-eop:safe-secure-and-trustworthy-development-and-use-of-artificial-intelligence/r1/b22",
    source: "Executive Order 14110, ¶22",
    href: d("us-eop/safe-secure-and-trustworthy-development-and-use-of-artificial-intelligence/r1/b22"),
  },
  {
    text: "AI should be designed, developed, deployed, and used, in a manner that is safe, in such a way as to be human-centric, trustworthy and responsible.",
    cite: "uk-gov:ai-safety-summit-2023-the-bletchley-declaration/r1/b3",
    source: "The Bletchley Declaration, ¶3",
    href: d("uk-gov/ai-safety-summit-2023-the-bletchley-declaration/r1/b3"),
  },
];
