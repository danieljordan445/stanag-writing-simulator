// /lib/tasks.ts

export type TaskPoint = { id: string; text: string }
export type WritingTask = {
  id: string
  label: string
  type: "letter" | "email" | "memo" | "report"
  instruction: string
  minWords: number
  points: TaskPoint[] // povinné body k pokrytí
  sampleHints?: string[] // volitelné nápovědy (např. linking words)
}

// ===== Task 1: formal letter / e-mail (min. 120) =====
export const task1Pool: WritingTask[] = [
  {
    id: "t1_letter_apology",
    label: "Formal Letter (Apology)",
    type: "letter",
    instruction:
      "Write a formal letter to a partner unit informing them about a schedule change. Use formal style. Cover all three points.",
    minWords: 120,
    points: [
      { id: "p1", text: "Inform about the schedule change (what changed and why)" },
      { id: "p2", text: "Apologise for the inconvenience" },
      { id: "p3", text: "Ask for confirmation of arrival / receipt" },
    ],
    sampleHints: ["Dear Sir or Madam,", "I am writing to inform you…", "Yours faithfully,"],
  },
  {
    id: "t1_email_request",
    label: "Formal E-mail (Request)",
    type: "email",
    instruction:
      "Write a formal e-mail to a supplier requesting information and support. Use formal style. Cover all three points.",
    minWords: 120,
    points: [
      { id: "p1", text: "Request technical documentation / clarification" },
      { id: "p2", text: "Explain why it is urgent / important" },
      { id: "p3", text: "Ask for a deadline / confirmation" },
    ],
    sampleHints: ["To whom it may concern,", "Could you please…", "Best regards,"],
  },
  {
    id: "t1_memo_safety",
    label: "Memo (Safety Notice)",
    type: "memo",
    instruction:
      "Write a memo to your team about a safety procedure update. Use clear and concise formal style. Cover all three points.",
    minWords: 120,
    points: [
      { id: "p1", text: "State what is new in the procedure" },
      { id: "p2", text: "Explain the reason / risk" },
      { id: "p3", text: "Give an action / deadline for compliance" },
    ],
    sampleHints: ["MEMO", "Subject:", "Effective immediately,"],
  },
]

// ===== Task 2: report (min. 200) – vyber 1 ze 2 =====
export const task2Options: WritingTask[] = [
  {
    id: "t2_report_env",
    label: "Report: Environmental awareness",
    type: "report",
    instruction:
      "Write a report on environmental awareness in your unit/area. Use headings. Choose ONE of the two topics and cover all points.",
    minWords: 200,
    points: [
      { id: "p1", text: "Describe types of environmental problems" },
      { id: "p2", text: "Explain consequences / impact" },
      { id: "p3", text: "Propose ways to address them" },
    ],
    sampleHints: ["Introduction", "Findings", "Recommendations"],
  },
  {
    id: "t2_report_service",
    label: "Report: Perception of military service",
    type: "report",
    instruction:
      "Write a report on the perception of military service among young people. Use headings. Choose ONE of the two topics and cover all points.",
    minWords: 200,
    points: [
      { id: "p1", text: "State advantages and disadvantages" },
      { id: "p2", text: "Explain concerns/fears in society" },
      { id: "p3", text: "Recommend ways to promote recruitment" },
    ],
    sampleHints: ["Background", "Analysis", "Conclusion"],
  },
]
