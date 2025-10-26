// /lib/proof.ts
// Univerzální kontrola textu přes LanguageTool (pravopis, gramatika, styl).
// Default endpoint: veřejné API. Pro produkci doporučuji vlastní LT server.
// Dokumentace: https://languagetool.org/http-api/swagger-ui/

export type LTReplacement = { value: string };
export type LTMatch = {
  message: string;
  shortMessage?: string;
  offset: number;
  length: number;
  context?: { text: string; offset: number; length: number };
  replacements: LTReplacement[];
  rule: {
    id: string;
    description: string;
    issueType?: string; // "misspelling" / "typographical" / "grammar" / "style" ...
    category: { id: string; name: string };
    tags?: string[];
  };
};

export type ProofIssue = {
  type: "spelling" | "grammar" | "style" | "other";
  message: string;
  example?: string;
  start: number;
  end: number;
  text: string;
  suggestion?: string;
};

export type ProofResult = {
  issues: ProofIssue[];
  tokensForHighlight: { start: number; end: number }[]; // pro žluté zvýraznění
  counts: { spelling: number; grammar: number; style: number; other: number; total: number };
};

const DEFAULT_ENDPOINT = "https://api.languagetool.org/v2/check";
// Pokud budeš mít vlastní instanci, změň zde, nebo předej endpoint parametrem.

export async function proof(
  text: string,
  opts?: { language?: "en-US" | "en-GB"; endpoint?: string }
): Promise<ProofResult> {
  const endpoint = (opts?.endpoint || DEFAULT_ENDPOINT).trim();
  const language = opts?.language || "en-GB"; // STANAG většinou preferuje britskou EN, případně "en-US"

  if (!text || text.trim().length === 0) {
    return { issues: [], tokensForHighlight: [], counts: { spelling: 0, grammar: 0, style: 0, other: 0, total: 0 } };
  }

  // LT má limit ~20k znaků na dotaz – pro běžné STANAG texty OK.
  const body = new URLSearchParams();
  body.set("language", language);
  body.set("text", text);
  // Lepší návrhy:
  body.set("enabledOnly", "false");
  // Zvaž: "level": "picky" pro přísnější kontrolu, ale víc "šumu".
  // body.set("level", "picky");

  let matches: LTMatch[] = [];
  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!resp.ok) throw new Error(`LanguageTool error HTTP ${resp.status}`);
    const data = await resp.json();
    matches = (data?.matches || []) as LTMatch[];
  } catch (e) {
    // Fallback: když není dostupné API, vrátíme prázdné výsledky
    // (aplikace dál funguje, jen bez LT chyb).
    return {
      issues: [],
      tokensForHighlight: [],
      counts: { spelling: 0, grammar: 0, style: 0, other: 0, total: 0 },
    };
  }

  const classify = (m: LTMatch): ProofIssue["type"] => {
    const cat = m.rule?.category?.id?.toLowerCase() || "";
    const issue = m.rule?.issueType?.toLowerCase() || "";
    const desc = (m.rule?.description || "").toLowerCase();

    // heuristiky — LT někdy posílá různé kombinace
    if (issue.includes("misspell") || cat.includes("typos") || desc.includes("spelling")) return "spelling";
    if (issue.includes("grammar") || cat.includes("grammar")) return "grammar";
    if (issue.includes("style") || cat.includes("style") || cat.includes("punctuation")) return "style";
    return "other";
  };

  const issues: ProofIssue[] = matches.map((m) => {
    const type = classify(m);
    const start = Math.max(0, m.offset);
    const end = Math.max(start, m.offset + m.length);
    const suggestion = m.replacements?.[0]?.value;
    const contextText = m.context?.text || "";
    let example = "";
    if (contextText && m.context?.offset !== undefined && m.context?.length !== undefined) {
      const cStart = m.context.offset;
      const cEnd = cStart + m.context.length;
      example = contextText.slice(Math.max(0, cStart - 20), Math.min(contextText.length, cEnd + 20));
    }
    return {
      type,
      message: m.message || m.shortMessage || m.rule?.description || "Issue",
      example: example || undefined,
      start,
      end,
      text: "", // doplníme později, pokud bude potřeba
      suggestion,
    };
  });

  // tokeny pro zvýraznění: zvýrazníme jen spelling + vybrané grammar/style (např. chybějící článek)
  const tokensForHighlight = issues
    .filter((i) => i.type === "spelling" || i.type === "grammar")
    .map((i) => ({ start: i.start, end: i.end }));

  const counts = {
    spelling: issues.filter((i) => i.type === "spelling").length,
    grammar: issues.filter((i) => i.type === "grammar").length,
    style: issues.filter((i) => i.type === "style").length,
    other: issues.filter((i) => i.type === "other").length,
    total: issues.length,
  };

  return { issues, tokensForHighlight, counts };
}
