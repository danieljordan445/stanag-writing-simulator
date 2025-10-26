// /lib/proof.ts
// Klientská funkce "proof" volá interní Next.js API /api/proof.
// Vrací sjednocený výsledek pro UI (issues + tokeny pro highlight).

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
    issueType?: string;
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
  suggestion?: string;
};

export type ProofResult = {
  issues: ProofIssue[];
  tokensForHighlight: { start: number; end: number }[];
  counts: { spelling: number; grammar: number; style: number; other: number; total: number };
};

function classify(m: LTMatch): ProofIssue["type"] {
  const cat = m.rule?.category?.id?.toLowerCase() || "";
  const issue = m.rule?.issueType?.toLowerCase() || "";
  const desc = (m.rule?.description || "").toLowerCase();
  if (issue.includes("misspell") || cat.includes("typos") || desc.includes("spelling")) return "spelling";
  if (issue.includes("grammar") || cat.includes("grammar")) return "grammar";
  if (issue.includes("style") || cat.includes("style") || cat.includes("punctuation")) return "style";
  return "other";
}

export async function proof(
  text: string,
  opts?: { language?: "en-GB" | "en-US" }
): Promise<ProofResult> {
  if (!text || text.trim().length === 0) {
    return {
      issues: [],
      tokensForHighlight: [],
      counts: { spelling: 0, grammar: 0, style: 0, other: 0, total: 0 },
    };
  }

  try {
    const resp = await fetch("/api/proof", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language: opts?.language || "en-GB" }),
    });
    if (!resp.ok) throw new Error(`API /api/proof ${resp.status}`);
    const data = await resp.json();
    const matches = (data?.matches || []) as LTMatch[];

    const issues: ProofIssue[] = matches.map((m) => {
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
        type: classify(m),
        message: m.message || m.shortMessage || m.rule?.description || "Issue",
        example: example || undefined,
        start,
        end,
        suggestion,
      };
    });

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
  } catch {
    // když by server/externí API nešlo, vrátíme prázdno (UI nezkolabuje)
    return {
      issues: [],
      tokensForHighlight: [],
      counts: { spelling: 0, grammar: 0, style: 0, other: 0, total: 0 },
    };
  }
}
