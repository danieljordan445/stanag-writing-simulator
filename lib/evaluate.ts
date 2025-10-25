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
  "firstly","secondly","however","moreover","therefore","in addition",
  "for example","for instance","on the other hand","as a result","furthermore","nevertheless"
]

const FORMAL_CUES = [
  "dear sir or madam","to whom it may concern","i am writing to",
  "yours faithfully","yours sincerely","best regards","regards",
  "introduction","findings","recommendations","conclusion","background","analysis"
]

const CONTRACTIONS = [
  "I'm","I've","I'd","I'll","isn't","aren't","don't","doesn't","didn't","won't","can't","couldn't","shouldn't","it's","that's","there's"
]

function wordCount(txt: string) {
  const m = txt.trim().match(/[A-Za-zÀ-ž']+/g)
  return m ? m.length : 0
}

function paragraphCount(txt: string) {
  return txt.trim().split(/\n{2,}|\r{2,}/).filter(Boolean).length || (txt.trim() ? 1 : 0)
}

function countOccurrences(txt: string, arr: string[], caseInsensitive = true) {
  const t = caseInsensitive ? txt.toLowerCase() : txt
  return arr.reduce((sum, w) => sum + (t.includes(caseInsensitive ? w.toLowerCase() : w) ? 1 : 0), 0)
}

function countLinkingWords(txt: string) {
  const t = txt.toLowerCase()
  let count = 0
  LINKING_WORDS.forEach(w => {
    if (t.includes(w)) count++
  })
  return count
}

export function evaluateSubmission(txt: string, task: WritingTask): EvalResult {
  const words = wordCount(txt)
  const paras = paragraphCount(txt)
  const links = countLinkingWords(txt)
  const contractions = countOccurrences(txt, CONTRACTIONS, false)

  const lower = txt.toLowerCase()
  const coverage = task.points.map(p => {
    const key = p.text.toLowerCase().split(/[^\w]+/).slice(0,4).join(" ")
    const covered = lower.includes(key.split(" ")[0]) || lower.includes(key.split(" ")[1] || "")
    return { id: p.id, text: p.text, covered }
  })
  const coveredCount = coverage.filter(c => c.covered).length

  let language = 6
  if (links >= 3) language += 1
  if (links >= 5) language += 1
  if (contractions === 0) language += 1
  language = Math.min(10, language)

  let form = 6
  if (words >= task.minWords) form += 2
  if (words >= Math.round(task.minWords * 1.2)) form += 1
  const formality = countOccurrences(lower, FORMAL_CUES, true)
  if (formality >= 1) form += 1
  if (words < task.minWords) {
    const deficitPct = (task.minWords - words) / task.minWords
    if (deficitPct > 0.1) form -= 3
    else form -= 1
  }
  form = Math.max(0, Math.min(10, form))

  let organisation = 6
  if (paras >= 3) organisation += 2
  if (links >= 3) organisation += 1
  if (coveredCount === task.points.length) organisation += 1
  organisation = Math.min(10, organisation)

  let effect = 6
  if (formality >= 2) effect += 1
  if (paras >= 3) effect += 1
  if (words >= task.minWords) effect += 1
  effect = Math.min(10, effect)

  if (coveredCount < task.points.length) {
    organisation = Math.max(0, Math.min(organisation, 7))
    effect = Math.max(0, Math.min(effect, 7))
  }

  const scores = { language, form, organisation, effect }
  const total40 = language + form + organisation + effect

  const advice: string[] = []
  if (coveredCount < task.points.length) advice.push("Doplň všechny body zadání – chybějící body snižují hodnocení.")
  if (words < task.minWords) advice.push(`Napiš alespoň ${task.minWords} slov (podlimit vede k penalizaci).`)
  if (links < 3) advice.push("Přidej více linking words (Firstly, However, Therefore, For example…).")
  if (contractions > 0) advice.push("Vyhni se kontrakcím (don't, won't…) – udrž formální styl.")
  if (paras < 3) advice.push("Rozděl text do minimálně tří odstavců s topic sentences.")
  if (task.type === "letter" || task.type === "email") advice.push("Použij formální úvod a závěr (Dear Sir or Madam…, Yours faithfully…).")
  if (task.type === "report") advice.push("Použij nadpisy/sekce (Introduction, Findings/Analysis, Conclusion/Recommendations).")

  return {
    scores,
    total40,
    coverage,
    advice,
    facts: { words, paragraphs: paras, linkingWords: links, contractions },
  }
}
