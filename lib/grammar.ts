// /lib/grammar.ts
export type GrammarIssue = {
  type:
    | "repeatedWord"
    | "lowercaseI"
    | "articleAAn"
    | "sentenceStartLower"
    | "missingEndPunctuation"
    | "doubleSpace"
    | "spaceBeforePunct"
    | "noSpaceAfterPunct"
    | "sva3rd" // subject-verb agreement (he/she/it + verb w/o -s)
  message: string
  example?: string
  count: number
}

const WORD_RE = /[A-Za-z]+(?:'[A-Za-z]+)?/g

// hodně omezený seznam sloves pro detekci 3. os. j.č.
const BASE_VERBS = [
  "do","go","need","want","say","work","write","use","think","plan","ask","tell","make","like","call","know","see","seem","look","take","give","move","help","require","expect","include"
]

export function checkGrammar(text: string): { issues: GrammarIssue[]; total: number } {
  const issues: GrammarIssue[] = []
  const add = (i: GrammarIssue) => {
    const found = issues.find(x => x.type === i.type && x.message === i.message)
    if (found) found.count += i.count
    else issues.push(i)
  }

  const t = text
  const lower = t.toLowerCase()

  // 1) repeated word: "the the"
  const rep = lower.match(/\b([a-z]+)\s+\1\b/g) || []
  if (rep.length) add({ type: "repeatedWord", message: "Repeated word", example: rep[0], count: rep.length })

  // 2) lowercase standalone "i"
  const badI = t.match(/\bi\b/g) || []
  if (badI.length) add({ type: "lowercaseI", message: "Pronoun 'I' should be capitalized", example: "i", count: badI.length })

  // 3) article a/an mismatch: "a apple", "an car"
  const aAnBadA = lower.match(/\ba\s+[aeiou]\w*/g) || []
  const aAnBadAn = lower.match(/\ban\s+[^aeiou\s]\w*/g) || []
  const aAnCount = aAnBadA.length + aAnBadAn.length
  if (aAnCount)
    add({
      type: "articleAAn",
      message: "Use 'a' before consonant sound, 'an' before vowel sound",
      example: (aAnBadA[0] || aAnBadAn[0] || "").trim(),
      count: aAnCount
    })

  // 4) sentence start should be capital letter (heuristika)
  const sentences = t.split(/([.!?])\s+/).join(" ").split(/\n+/).join(" ").split(/(?<=[.!?])\s+/)
  let startLower = 0
  for (const s of sentences) {
    const trimmed = s.trim()
    if (!trimmed) continue
    const first = trimmed[0]
    if (/[a-z]/.test(first)) startLower++
  }
  if (startLower) add({ type: "sentenceStartLower", message: "Sentence should start with a capital letter", count: startLower })

  // 5) missing end punctuation (věty bez . ! ?)
  let missingEnd = 0
  for (const s of sentences) {
    const trimmed = s.trim()
    if (!trimmed) continue
    if (!/[.!?]$/.test(trimmed)) missingEnd++
  }
  if (missingEnd) add({ type: "missingEndPunctuation", message: "Finish sentences with . ! or ?", count: missingEnd })

  // 6) spacing
  const doubles = t.match(/  +/g) || []
  if (doubles.length) add({ type: "doubleSpace", message: "Use a single space between words", count: doubles.length })

  const spaceBefore = t.match(/\s[,.;:!?]/g) || []
  if (spaceBefore.length) add({ type: "spaceBeforePunct", message: "No space before punctuation", count: spaceBefore.length })

  const noSpaceAfter = t.match(/[,:;](?!\s)/g) || []
  if (noSpaceAfter.length) add({ type: "noSpaceAfterPunct", message: "Add a space after punctuation", count: noSpaceAfter.length })

  // 7) very simple SVA: he/she/it + base verb (no -s)
  const svaRegex = new RegExp(`\\b(he|she|it)\\s+(${BASE_VERBS.join("|")})\\b`, "gi")
  const sva = t.match(svaRegex) || []
  if (sva.length) add({ type: "sva3rd", message: "Use 3rd person singular: he/she/it + verb-s (e.g., 'he works')", count: sva.length })

  const total = issues.reduce((s, i) => s + i.count, 0)
  return { issues, total }
}
