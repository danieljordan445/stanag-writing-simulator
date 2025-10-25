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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// robustní počítání slov (bere i diakritiku)
function wordCount(txt: string) {
  const m = txt.trim().match(/[A-Za-zÀ-ž]+(?:'[A-Za-zÀ-ž]+)?/g);
  return m ? m.length : 0;
}

// odstavec = bloky oddělené prázdným řádkem; pokud je text jeden blok, vrátí 1
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
  const m = txt.match(re);
  return m ? m.length : 0;
}

// Type-Token Ratio — jednoduché měřítko bohatosti slovní zásoby
function typeTokenRatio(txt: string) {
  const tokens = (txt.toLowerCase().match(/[a-zà-ž]+(?:'[a-zà-ž]+)?/gi) || []).filter(Boolean);
  if (tokens.length === 0) return 0;
  const types = new Set(tokens);
  return types.size / tokens.length; // 0..1
}

// pokrytí bodů zadání — aspoň 1–2 klíčová slova z bodu
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
    id: p.id,
    text: p.text,
    covered: pointCovered(lower, p.text)
  }));
  const coveredCount = coverage.filter(c => c.covered).length;

  // Faktor délky 0..1 (jak moc se blížím minimu slov)
  const lengthFactor = clamp(words / task.minWords, 0, 1);

  // --- Edge case: skoro nic nenapsáno ---
  if (words < 20) {
    const base = words === 0 ? 0 : 1; // za pár slov max 1
    const scores = {
      language: base,
      form: base,
      organisation: base,
      effect: base
    };
    const total40 = scores.language + scores.form + scores.organisation + scores.effect;
    const advice: string[] = [];
    if (words === 0) advice.push("Napiš text – aktuálně není co hodnotit.");
    else advice.push("Přidej výrazně více textu – zatím je ho příliš málo na seriózní hodnocení.");
    advice.push(`Cíl pro tuto úlohu je alespoň ${task.minWords} slov.`);
    return {
      scores,
      total40,
      coverage,
      advice,
      facts: { words, paragraphs: paras, linkingWords: links, contractions, ttr }
    };
  }

  // ===== LANGUAGE =====
  // Start nízko a škáluj podle TTR, spojek a kontrakcí
  let language = 2;
  // TTR ~ 0.3 slabé, 0.5 dobré, 0.65+ velmi dobré
  if (ttr >= 0.3) language += 2;
  if (ttr >= 0.5) language += 2;
  if (ttr >= 0.65) language += 1;
  // linking words pomůžou
  if (links >= 2) language += 1;
  if (links >= 4) language += 1;
  // kontrakce uberou
  if (contractions === 0) language += 1; else if (contractions >= 2) language -= 1;
  // délka omezuje maximum
  language = Math.round(clamp(language * (0.5 + 0.5 * lengthFactor), 0, 10));

  // ===== FORM (format & requirements) =====
  let form = 2;
  const formalityCount = FORMAL_CUES.reduce((s, cue) => s + (lower.includes(cue) ? 1 : 0), 0);
  if (formalityCount >= 1) form += 2;
  if (formalityCount >= 3) form += 1;
  // splnění min. slov + rezerva
  if (words >= task.minWords) form += 3;
  if (words >= Math.round(task.minWords * 1.2)) form += 1;
  // kontrakce jsou proti formálnosti
  if (contractions === 0) form += 1; else if (contractions >= 3) form -= 1;

  // silná penalizace při podlimitu
  if (words < task.minWords) {
    const deficitPct = (task.minWords - words) / task.minWords; // 0..1+
    if (deficitPct > 0.3) form = 1;          // <70 % minima → skoro nula
    else if (deficitPct > 0.2) form = Math.min(form, 3);
    else form = Math.min(form, 5);
  }
  form = clamp(form, 0, 10);

  // ===== ORGANISATION & CONTENT =====
  let organisation = 2;
  if (paras >= 2) organisation += 2;
  if (paras >= 3) organisation += 2;
  if (links >= 3) organisation += 1;
  if (coveredCount === task.points.length) organisation += 2;
  // krátké texty nemůžou mít top organizaci
  organisation = Math.round(clamp(organisation * (0.6 + 0.4 * lengthFactor), 0, 10));

  // ===== EFFECT ON THE READER =====
  let effect = 2;
  if (formalityCount >= 2) effect += 2;
  if (paras >= 3) effect += 1;
  if (words >= task.minWords) effect += 2;
  // když chybí pokrytí, efekt klesá
  if (coveredCount < task.points.length) effect -= 1;
  effect = Math.round(clamp(effect * (0.6 + 0.4 * lengthFactor), 0, 10));

  // Globální cap, když nejsou pokryty body zadání
  if (coveredCount < task.points.length) {
    organisation = Math.min(organisation, 7);
    effect = Math.min(effect, 7);
  }

  const scores = { language, form, organisation, effect };
  const total40 = language + form + organisation + effect;

  const advice: string[] = [];
  if (coveredCount < task.points.length) advice.push("Doplň všechny body zadání – chybějící body snižují hodnocení.");
  if (words < task.minWords) advice.push(`Napiš alespoň ${task.minWords} slov (podlimit vede k silné penalizaci).`);
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
