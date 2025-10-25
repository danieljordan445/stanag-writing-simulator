// /lib/evaluate.ts
import type { WritingTask } from "./tasks"

export type EvalResult = {
  scores: { language: number; form: number; organisation: number; effect: number }
  total40: number
  coverage: { id: string; text: string; covered: boolean }[]
  advice: string[]
  facts: { words: number; paragraphs: number; linkingWords: number; contractions: number }
}

const LINKING_WORDS = [
  "firstly", "secondly", "however", "moreover", "therefore", "in addition",
  "for example", "for instance", "on the other hand", "as a result",
  "furthermore", "nevertheless", "in conclusion", "to sum up"
];

const FORMAL_CUES = [
  "dear sir or madam", "to whom it may concern", "i am writing to",
  "yours faithfully", "yours sincerely", "best regards", "regards",
  "introduction", "findings", "recommendations", "conclusion",
  "background", "analysis"
];

const CONTRACTIONS = [
  "I'm","I've","I'd","I'll","isn't","aren't","don't","doesn't","didn't",
  "won't","can't","couldn't","shouldn't","it's","that's","there's","we're","they're"
];

// robustnější počítání slov (bere i diakritiku, vynechá čísla samotná)
function wordCount(txt: string) {
  const m = txt.trim().match(/[A-Za-zÀ-ž]+(?:'[A-Za-zÀ-ž]+)?/g);
  return m ? m.length : 0;
}

// odstavec = prázdný řádek odděluje bloky; pokud text je jedním blokem, počítej jako 1
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

// spočítej reálné výskyty spojek (regex, whole word; pro víceslovné spojky prosté includes)
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
  // case-sensitive – „I'm“ apod.; navíc zachytíme i malá písmena
  const re = new RegExp(CONTRACTIONS.map(c => c.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join("|"), "g");
  const reLower = new RegExp(CONTRACTIONS.map(c => c.toLowerCase().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join("|"), "g");
  const m1 = txt.match(re)?.length ?? 0;
  const m2 = txt.toLowerCase().match(reLower)?.length ?? 0;
  return Math.max(m1, m2);
}

// velmi jednoduché „coverage“ – z každého task pointu vezmeme klíčová slova (bez stop slov) a ověříme výskyt alespoň 1–2
const STOP = new Set(["the","a","an","and","or","to","for","of","in","on","at","with","about","from","is","are","be","as","by","that","this","these","those"]);

function pointCovered(textLower: string, point: string) {
  const words = point.toLowerCase().split(/[^\p{L}]+/u).filter(w => w && !STOP.has(w));
  if (words.length === 0) return false;
  // požaduj výskyt alespoň dvou různých klíčových slov z bodu, pokud nějaká jsou
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

  const lower = txt.toLowerCase();
  const coverage = task.points.map(p => ({
    id: p.id,
    text: p.text,
    covered: pointCovered(lower, p.text)
  }));
  const coveredCount = coverage.filter(c => c.covered).length;

  // ----- LANGUAGE -----
  let language = 6;
  if (links >= 3) language += 1;
  if (links >= 5) language += 1;
  if (contractions === 0) language += 1;       // formální jazyk
  language = clamp(language, 0, 10);

  // ----- FORM -----
  let form = 6;
  if (words >= task.minWords) form += 2;
  if (words >= Math.round(task.minWords * 1.2)) form += 1;
  const formality = FORMAL_CUES.reduce((s, cue) => s + (lower.includes(cue) ? 1 : 0), 0);
  if (formality >= 1) form += 1;

  // penalizace při podlimitu
  if (words < task.minWords) {
    const deficitPct = (task.minWords - words) / task.minWords;
    if (deficitPct > 0.1) form -= 3; else form -= 1;
  }
  form = clamp(form, 0, 10);

  // ----- ORGANISATION -----
  let organisation = 6;
  if (paras >= 3) organisation += 2;
  if (links >= 3) organisation += 1;
  if (coveredCount === task.points.length) organisation += 1;
  organisation = clamp(organisation, 0, 10);

  // ----- EFFECT -----
  let effect = 6;
  if (formality >= 2) effect += 1;
  if (paras >= 3) effect += 1;
  if (words >= task.minWords) effect += 1;
  effect = clamp(effect, 0, 10);

  // Globální limit pokud nejsou pokryty body zadání
  if (coveredCount < task.points.length) {
    organisation = Math.min(organisation, 7);
    effect = Math.min(effect, 7);
  }

  const scores = { language, form, organisation, effect };
  const total40 = language + form + organisation + effect;

  const advice: string[] = [];
  if (coveredCount < task.points.length) advice.push("Doplň všechny body zadání – chybějící body snižují hodnocení.");
  if (words < task.minWords) advice.push(`Napiš alespoň ${task.minWords} slov (podlimit vede k penalizaci).`);
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
    facts: { words, paragraphs: paras, linkingWords: links, contractions },
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
