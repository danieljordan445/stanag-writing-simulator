// /lib/evaluate.ts
import type { WritingTask } from "./tasks"

export type EvalResult = {
  scores: { language: number; form: number; organisation: number; effect: number }
  total40: number
  coverage: { id: string; text: string; covered: boolean }[]
  advice: string[]
  facts: { words: number; paragraphs: number; linkingWords: number; contractions: number; ttr: number }
}

const LINKING_WORDS = [
  "firstly","secondly","however","moreover","therefore","in addition",
  "for example","for instance","on the other hand","as a result",
  "furthermore","nevertheless","in conclusion","to sum up"
];

const FORMAL_CUES = [
  "dear sir or madam","to whom it may concern","i am writing to",
  "yours faithfully","yours sincerely","best regards","regards",
  "introduction","findings","recommendations","conclusion","background","analysis"
];

const CONTRACTIONS = [
  "I'm","I've","I'd","I'll","isn't","aren't","don't","doesn't","didn't",
  "won't","can't","couldn't","shouldn't","it's","that's","there's","we're","they're"
];

const STOP = new Set(["the","a","an","and","or","to","for","of","in","on","at","with","about","from","is","are","be","as","by","that","this","these","those"]);

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

// — počty —
function wordCount(txt: string) {
  const m = txt.trim().match(/[A-Za-zÀ-ž]+(?:'[A-Za-zÀ-ž]+)?/g);
  return m ? m.length : 0;
}
function paragraphCount(txt: string) {
  const blocks = txt
    .split(/\r?\n/)
    .map(s => s.trim())
    .reduce<string[]>((acc, line) => {
      if (line === "") acc.push(""); else acc[acc.length - 1] = (acc[acc.length - 1] || "") + "\n" + line;
      return acc;
    }, [""])
    .filter(b => b.trim().length > 0);
  if (blocks.length === 0 && txt.trim().length > 0) return 1;
  return blocks.length;
}
function countLinkingWords(txt: string) {
  const t = " " + txt.toLowerCase() + " ";
  let count = 0;
  LINKING_WORDS.forEach(w => {
    if (w.includes(" ")) {
      if (t.includes(" " + w + " ")) count++;
    } else {
      const re = new RegExp(`\\b${w}\\b`, "g");
      if (t.match(re)) count++;
    }
  });
  return count;
}
function countContractions(txt: string) {
  const re = new RegExp(CONTRACTIONS.map(c => c.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join("|"), "gi");
  return txt.match(re)?.length ?? 0;
}
function typeTokenRatio(txt: string) {
  const tokens = (txt.toLowerCase().match(/[a-zà-ž]+(?:'[a-zà-ž]+)?/gi) || []).filter(Boolean);
  if (tokens.length === 0) return 0;
  const types = new Set(tokens);
  return types.size / tokens.length;
}
function pointCovered(textLower: string, point: string) {
  const words = point.toLowerCase().split(/[^\p{L}]+/u).filter(w => w && !STOP.has(w));
  if (words.length === 0) return false;
  const uniq = Array.from(new Set(words));
  const hits = uniq.filter(w => textLower.includes(w));
  if (uniq.length >= 3) return hits.length >= 2;
  if (uniq.length === 2) return hits.length >= 1;
  return hits.length >= 1;
}

export function evaluateSubmission(txt: string, task: WritingTask): EvalResult {
  const words = wordCount(txt);
  const paras = paragraphCount(txt);
  const links = countLinkingWords(txt);
  const contractions = countContractions(txt);
  const ttr = typeTokenRatio(txt);
  const lower = txt.toLowerCase();

  const coverage = task.points.map(p => ({
    id: p.id, text: p.text, covered: pointCovered(lower, p.text)
  }));
  const coveredCount = coverage.filter(c => c.covered).length;

  // ---- TVRDÉ LIMITY PODLE DÉLKY ----
  const fiftyPct = Math.round(task.minWords * 0.5);
  const seventyPct = Math.round(task.minWords * 0.7);

  // 0) Prakticky bez textu → nula
  if (words < 5) {
    const scores = { language: 0, form: 0, organisation: 0, effect: 0 };
    return {
      scores, total40: 0, coverage,
      advice: [
        "Napiš text – aktuálně není co hodnotit.",
        `Cíl: alespoň ${task.minWords} slov.`
      ],
      facts: { words, paragraphs: paras, linkingWords: links, contractions, ttr: Number(ttr.toFixed(2)) }
    };
  }

  // 1) <50 % minima → max 2/10 v každé kategorii
  let hardCap = 10;
  if (words < fiftyPct) hardCap = 2;
  // 2) 50–70 % minima → max 4/10
  else if (words < seventyPct) hardCap = 4;

  // ===== ZÁKLADNÍ VÝPOČTY =====
  const formality = FORMAL_CUES.reduce((s, cue) => s + (lower.includes(cue) ? 1 : 0), 0);

  // LANGUAGE – TTR + linking + kontrakce
  let language = 0;
  if (ttr >= 0.30) language += 2;
  if (ttr >= 0.50) language += 2;
  if (ttr >= 0.65) language += 1;
  if (links >= 2) language += 1;
  if (links >= 4) language += 1;
  if (contractions === 0) language += 2;
  else if (contractions >= 2) language -= 1;
  language = clamp(language, 0, 10);

  // FORM – formální znaky + splnění minima
  let form = 0;
  if (formality >= 1) form += 2;
  if (formality >= 3) form += 1;
  if (words >= task.minWords) form += 4;
  if (words >= Math.round(task.minWords * 1.2)) form += 1;
  if (contractions === 0) form += 1; else if (contractions >= 3) form -= 1;
  form = clamp(form, 0, 10);

  // ORGANISATION – odstavce + linking + coverage
  let organisation = 0;
  if (paras >= 2) organisation += 2;
  if (paras >= 3) organisation += 2;
  if (links >= 3) organisation += 1;
  if (coveredCount === task.points.length) organisation += 3;
  organisation = clamp(organisation, 0, 10);

  // EFFECT – dojem + formálnost + délka
  let effect = 0;
  if (formality >= 2) effect += 2;
  if (paras >= 3) effect += 1;
  if (words >= task.minWords) effect += 3;
  if (coveredCount < task.points.length) effect -= 1;
  effect = clamp(effect, 0, 10);

  // Globální omezení, pokud nejsou pokryty body zadání
  if (coveredCount < task.points.length) {
    organisation = Math.min(organisation, 7);
    effect = Math.min(effect, 7);
  }

  // Uplatni cap podle délky
  language = Math.min(language, hardCap);
  form = Math.min(form, hardCap);
  organisation = Math.min(organisation, hardCap);
  effect = Math.min(effect, hardCap);

  const scores = { language, form, organisation, effect };
  const total40 = language + form + organisation + effect;

  const advice: string[] = [];
  if (words < task.minWords) {
    if (words < fiftyPct) advice.push(`Text je příliš krátký (< ${fiftyPct} slov). Cíl: ≥ ${task.minWords} slov.`);
    else if (words < seventyPct) advice.push(`Přidej obsah (aktuálně < 70 % minima). Cíl: ≥ ${task.minWords} slov.`);
    else advice.push(`Doplň pár vět, ať splníš minimum ${task.minWords} slov.`);
  }
  if (coveredCount < task.points.length) advice.push("Doplň všechny body zadání – chybějící body snižují hodnocení.");
  if (links < 3) advice.push("Přidej více linking words (Firstly, However, Therefore, For example…).");
  if (contractions > 0) advice.push("Vyhni se kontrakcím (don't, won't…) – drž formální styl.");
  if (paras < 3) advice.push("Rozděl text do minimálně tří odstavců s topic sentences.");
  if (task.type === "letter" || task.type === "email") advice.push("Použij formální úvod a závěr (Dear Sir or Madam…, Yours faithfully…).");
  if (task.type === "report") advice.push("Použij nadpisy/sekce (Introduction, Findings/Analysis, Conclusion/Recommendations).");

  return {
    scores,
    total40,
    coverage,
    advice,
    facts: { words, paragraphs: paras, linkingWords: links, contractions, ttr: Number(ttr.toFixed(2)) },
  };
}
