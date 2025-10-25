// /lib/spell.ts
// Pravopis: (A) běžné překlepy se známou opravou, (B) "unknown words" dle offline slovníku.
// Vrací i tokeny s přesnými pozicemi pro zvýraznění v editoru.

export type SpellIssue = { word: string; suggestion: string; count: number };
export type MissToken = { word: string; suggestion: string; start: number; end: number };

export const COMMON_MISSPELLINGS: Record<string, string> = {
  recieve: "receive",
  recieveed: "received",
  seperate: "separate",
  definately: "definitely",
  occured: "occurred",
  ocurrence: "occurrence",
  occurence: "occurrence",
  adress: "address",
  adressing: "addressing",
  adressed: "addressed",
  accomodation: "accommodation",
  accomodate: "accommodate",
  acheive: "achieve",
  beleive: "believe",
  calender: "calendar",
  commited: "committed",
  comittee: "committee",
  enviroment: "environment",
  goverment: "government",
  gaurd: "guard",
  independant: "independent",
  inteligent: "intelligent",
  interesing: "interesting",
  neccessary: "necessary",
  ocasion: "occasion",
  ocassion: "occasion",
  posession: "possession",
  preffered: "preferred",
  prefered: "preferred",
  recomend: "recommend",
  recomendation: "recommendation",
  recomendations: "recommendations",
  responsability: "responsibility",
  seperateley: "separately",
  succesful: "successful",
  suceed: "succeed",
  privilage: "privilege",
  writting: "writing",
  thier: "their",
  teh: "the",
  embarass: "embarrass",
  embarassment: "embarrassment",
  millenium: "millennium",
  haras: "harass",
  publically: "publicly",
  arguement: "argument",
  concensus: "consensus",
  manouver: "manoeuvre",
  persue: "pursue",
  persuit: "pursuit",
  liasion: "liaison",
  liason: "liaison",
  mantain: "maintain",
  maintanance: "maintenance",
};

const IGNORE = new Set(["usa","uk","eu","nato","hq","faq","id","ok","gps","pdf"]);

const WORD_RE = /[A-Za-z]+(?:'[A-Za-z]+)?/g;

/** A) Běžné překlepy se známou opravou */
export function checkSpelling(text: string): {
  issues: SpellIssue[];
  total: number;
  tokens: MissToken[];
} {
  const counts: Record<string, number> = {};
  const tokens: MissToken[] = [];

  let m: RegExpExecArray | null;
  while ((m = WORD_RE.exec(text)) !== null) {
    const word = m[0];
    const lw = word.toLowerCase();
    if (IGNORE.has(lw)) continue;
    const suggestion = COMMON_MISSPELLINGS[lw];
    if (suggestion) {
      counts[lw] = (counts[lw] || 0) + 1;
      tokens.push({ word, suggestion, start: m.index, end: m.index + word.length });
    }
  }

  const issues: SpellIssue[] = Object.entries(counts)
    .map(([w, c]) => ({ word: w, suggestion: COMMON_MISSPELLINGS[w], count: c }))
    .sort((a, b) => b.count - a.count);

  const total = issues.reduce((s, i) => s + i.count, 0);
  return { issues, total, tokens };
}

/** B) Unknown words – vše, co není ve slovníku (case-insensitive) */
export function checkUnknownWords(text: string, dict?: Set<string>): {
  issues: { word: string; count: number }[];
  total: number;
  tokens: MissToken[];
} {
  if (!dict) return { issues: [], total: 0, tokens: [] };

  const counts: Record<string, number> = {};
  const tokens: MissToken[] = [];

  let m: RegExpExecArray | null;
  while ((m = WORD_RE.exec(text)) !== null) {
    const raw = m[0];
    const lw = raw.toLowerCase();

    // ignoruj zkratky a velmi krátké tokeny (2 a méně), čísla, a známé překlepy (ty řeší checkSpelling)
    if (lw.length <= 2) continue;
    if (IGNORE.has(lw)) continue;
    if (/^\d+$/.test(lw)) continue;
    if (COMMON_MISSPELLINGS[lw]) continue;

    // povol kapitalizovaná vlastní jména na začátku věty (heuristika)
    const prevChar = m.index > 0 ? text[m.index - 1] : " ";
    const isSentenceStart = /[.!?]\s$/.test(text.slice(0, m.index)) || m.index === 0;
    const looksProperNoun = /^[A-Z]/.test(raw);
    if (looksProperNoun && isSentenceStart) {
      // začátek věty: velké písmeno je v pořádku, ale zkontroluj slovo bez case
      if (dict.has(lw)) continue;
    }

    if (!dict.has(lw)) {
      counts[lw] = (counts[lw] || 0) + 1;
      tokens.push({ word: raw, suggestion: "(check spelling)", start: m.index, end: m.index + raw.length });
    }
  }

  const issues = Object.entries(counts).map(([word, count]) => ({ word, count })).sort((a,b)=>b.count-a.count);
  const total = issues.reduce((s,i)=>s+i.count,0);
  return { issues, total, tokens };
}
