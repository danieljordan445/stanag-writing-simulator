"use client";

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function WritingTestMock() {
  const [isDark, setIsDark] = useState(true)

  const bg = isDark ? 'bg-black' : 'bg-white'
  const text = isDark ? 'text-white' : 'text-black'
  const subText = isDark ? 'text-neutral-300' : 'text-neutral-600'
  const cardBg = isDark ? 'bg-neutral-950' : 'bg-neutral-50'
  const cardInner = isDark ? 'bg-neutral-900' : 'bg-neutral-100'
  const cardBorder = isDark ? 'border-neutral-800' : 'border-neutral-200'
  const chip = isDark ? 'text-neutral-400' : 'text-neutral-500'
  const areaBg = isDark
    ? 'bg-black border-neutral-700 text-white placeholder-neutral-500'
    : 'bg-white border-neutral-300 text-black placeholder-neutral-400'
  const btnPrimary = isDark
    ? 'bg-white text-black hover:bg-neutral-200 border border-neutral-600'
    : 'bg-black text-white hover:bg-neutral-900 border border-neutral-700'
  const btnOutline = isDark
    ? 'bg-white text-black hover:bg-neutral-200 border border-neutral-600'
    : 'bg-black text-white hover:bg-neutral-900 border border-neutral-700'

  const ScoreCard = ({ label, val }: { label: string; val: number }) => {
    const percent = Math.max(0, Math.min(100, val * 10))
    const track = isDark ? 'bg-neutral-800' : 'bg-neutral-200'
    const fill = isDark ? 'bg-white' : 'bg-black'

    return (
      <div className={`text-center ${cardInner} rounded-xl p-3 border ${cardBorder}`}>
        <div className={`text-xs ${chip}`}>{label}</div>
        <div className={`text-3xl font-bold ${text}`}>{val}</div>
        <div className={`text-xs ${chip}`}>{val} / 10</div>
        <div className={`mt-2 h-2 w-full rounded ${track}`}>
          <div className={`h-2 rounded ${fill}`} style={{ width: `${percent}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div className={`max-w-5xl mx-auto px-4 py-8 grid gap-8 ${text} ${bg} min-h-screen`}>
      <div className="flex items-center justify-between">
        <motion.h1 className="text-3xl font-bold tracking-tight">
          STANAG Writing Test Simulator
        </motion.h1>
        <button
          onClick={() => setIsDark((v) => !v)}
          className={`${btnPrimary} px-3 py-1 rounded-lg`}
        >
          {isDark ? 'Light mode' : 'Dark mode'}
        </button>
      </div>

      {/* Struktura zkoušky */}
      <Card className={`${cardBg} ${cardBorder} ${text}`}>
        <CardContent className="p-6 grid gap-4">
          <h2 className="text-xl font-semibold">Struktura zkoušky</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Task 1 */}
            <div className={`rounded-xl p-4 ${cardInner} border ${cardBorder}`}>
              <div className={`text-xs uppercase tracking-wide ${chip} mb-1`}>Task 1</div>
              <div className="font-semibold">
                Formal Letter / E-mail{' '}
                <span className={`${chip}`}>(min. 120 words)</span>
              </div>
              <p className={`text-sm mt-2 ${subText}`}>
                <b>Instruction:</b> Write a formal letter/e-mail on a job-related topic.
                Cover all three points.
              </p>
              <ul className={`list-disc pl-5 text-sm mt-2 ${isDark ? 'text-neutral-200' : 'text-neutral-700'}`}>
                <li>Formal style (no contractions, impersonal tone)</li>
                <li>Paragraphing with topic sentences</li>
                <li>Cover all 3 points from the prompt</li>
              </ul>
              <div className={`mt-3 text-sm ${isDark ? 'text-neutral-100' : 'text-neutral-800'}`}>
                <b>Sample prompt:</b> Letter of Apology – inform about schedule change;
                apologise for inconvenience; ask for confirmation.
              </div>
              <div className="mt-3">
                <Button className={`${btnPrimary}`}>Start Task 1</Button>
              </div>
            </div>

            {/* Task 2 */}
            <div className={`rounded-xl p-4 ${cardInner} border ${cardBorder}`}>
              <div className={`text-xs uppercase tracking-wide ${chip} mb-1`}>Task 2</div>
              <div className="font-semibold">
                Report <span className={`${chip}`}>(min. 200 words)</span>
              </div>
              <p className={`text-sm mt-2 ${subText}`}>
                Choose <b>one</b> of two topics and write a report with clear
                headings/paragraphs.
              </p>
              <div className="grid gap-2 mt-2 text-sm">
                <div className={`rounded-lg p-3 ${isDark ? 'bg-neutral-950' : 'bg-neutral-200'} border ${cardBorder}`}>
                  <b>Topic A:</b> Environmental awareness – types of problems;
                  consequences; ways to address them.
                </div>
                <div className={`rounded-lg p-3 ${isDark ? 'bg-neutral-950' : 'bg-neutral-200'} border ${cardBorder}`}>
                  <b>Topic B:</b> Perception of military service –
                  advantages/disadvantages; social fears; ways to promote recruitment.
                </div>
              </div>
              <div className="mt-3">
                <Button className={`${btnPrimary}`}>Start Task 2</Button>
              </div>
            </div>
          </div>
          <div className={`text-xs ${chip}`}>
            Time limit for the whole writing paper: 80 minutes.
          </div>
        </CardContent>
      </Card>

      {/* Editor */}
      <Card className={`${cardBg} ${cardBorder} ${text}`}>
        <CardContent className="p-6 grid gap-4">
          <div className={`flex justify-between items-center text-sm ${subText}`}>
            <div>
              Min. 120 / 200 words · Timer: <span className="font-mono">79:42</span>
            </div>
            <div>
              Words: <span className="font-semibold">84</span>
            </div>
          </div>
          <textarea
            className={`w-full h-64 p-4 rounded-xl border focus:ring-2 ${areaBg} ${isDark ? 'focus:ring-white' : 'focus:ring-black'}`}
            placeholder="Write your answer here… (formal style, paragraphs, linking words)"
          />
          <div className={`flex flex-wrap items-center justify-between gap-3 text-xs ${subText}`}>
            <div>
              <b>Checklist:</b> cover all 3 points · use ≥3 linking words · formal
              style · topic sentences · meet word limit
            </div>
            <div className="flex gap-3">
              <Button className={`${btnOutline}`}>Clear</Button>
              <Button className={`${btnPrimary}`}>Evaluate</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Výsledek */}
      <Card className={`${cardBg} ${cardBorder} ${text}`}>
        <CardContent className="p-6 grid gap-4">
          <h2 className="text-lg font-semibold">Výsledek</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Language resources & accuracy', val: 7 },
              { label: 'Form (format & requirements)', val: 8 },
              { label: 'Organisation & content', val: 6 },
              { label: 'Effect on the reader', val: 7 }
            ].map((s, i) => (
              <ScoreCard key={i} label={s.label} val={s.val} />
            ))}
          </div>
          <div className="text-sm">
            Celkem: <span className="font-semibold">28 / 40</span> ≈ <b>7 / 10</b>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Pokrytí bodů zadání:</h3>
            <ul className={`list-disc pl-5 text-sm ${isDark ? 'text-neutral-200' : 'text-neutral-700'}`}>
              <li>✅ Inform about schedule change</li>
              <li>✅ Apologise for inconvenience</li>
              <li>⚠️ Ask for confirmation of arrival</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Doporučení:</h3>
            <ul className={`list-disc pl-5 text-sm ${isDark ? 'text-neutral-200' : 'text-neutral-700'}`}>
              <li>Přidej více linking words (Firstly, However, Therefore, For example).</li>
              <li>
                Pohlídej formální formát (oslovení, závěr „Yours faithfully, XYZ“ u dopisu).
              </li>
              <li>Dej každému bodu vlastní odstavec s topic sentence.</li>
              <li>Nepodkroč minimální počet slov (≤ -10 % = výrazná penalizace).</li>
            </ul>
          </div>
          <div className={`text-xs ${chip}`}>
            Pozn.: Pokud není pokryt alespoň jeden z vyžadovaných bodů zadání, skóre
            je omezeno (snížení dílčích kategorií).
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
