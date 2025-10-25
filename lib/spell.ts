// /lib/spell.ts
// Lehká kontrola pravopisu: detekuje nejčastější anglické překlepy
// a nabídne opravy. Běžné i britské/americké varianty jsou v pořádku.

export type SpellIssue = { word: string; suggestion: string; count: number };

const COMMON_MISSPELLINGS: Record<string, string> = {
  // very common
  recieve: "receive",
  recieveed: "received",
  seperate: "separate",
  definately: "definitely",
  occured: "occurred",
  ocurrence: "occurrence",
  adress: "address",
  accomodation: "accommodation",
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
  responsability: "responsibility",
  seperateley: "separately",
  succesful: "successful",
  suceed: "succeed",
  privilage: "privilege",
  writting: "writing",
  thier: "their",
  teh: "the",
  occurence: "occurrence",
  embarass: "embarrass",
  embarassment: "embarrassment",
  millenium: "millennium",
  haras: "harass",
  publically: "publicly",
  arguement: "argument",
  concensus: "consensus",
  adressing: "addressing",
  adressed: "addressed",
  recomendations: "recommendations",
  accomodate: "accommodate",
  acquitence: "acquaintance",
  manouver: "manoeuvre",
  persue: "pursue",
  persuit: "pursuit",
  liasion: "liaison",
  liason: "liaison",
  mantain: "maintain",
  maintanance: "maintenance",
};

// Slova ignorovaná při kontrole (zkratky, zkratky jednotek apod.)
const IGNORE = new Set([
  "usa","uk","eu","nato","hq","faq","id","ok","gps","pdf",
]);

const WORD_RE = /[A-Za-z]+(?:'[A-Za-z]+)?/g;

export function checkSpelling(text: string): { issues: SpellIssue[]; total: number } {
  const counts: Record<string, number> = {};
  const lower = text.toLowerCase();
  const tokens = lower.match(WORD_RE) || [];

  for (const w of tokens) {
    if (IGNORE.has(w)) continue;
    if (COMMON_MISSPELLINGS[w]) {
      counts[w] = (counts[w] || 0) + 1;
    }
  }

  const issues: SpellIssue[] = Object.entries(counts)
    .map(([w, c]) => ({ word: w, suggestion: COMMON_MISSPELLINGS[w], count: c }))
    .sort((a, b) => b.count - a.count);

  const total = issues.reduce((s, i) => s + i.count, 0);
  return { issues, total };
}
