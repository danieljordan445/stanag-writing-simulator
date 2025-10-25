"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { task1Pool, task2Options, type WritingTask } from "@/lib/tasks";
import { evaluateSubmission, type EvalResult } from "@/lib/evaluate";

type Mode = "idle" | "task1" | "task2";

export default function WritingTestPage() {
  // ===== THEMING (black/white) =====
  const [isDark, setIsDark] = useState(true);
  const bg = isDark ? "bg-black" : "bg-white";
  const text = isDark ? "text-white" : "text-black";
  const subText = isDark ? "text-neutral-300" : "text-neutral-600";
  const cardBg = isDark ? "bg-neutral-950" : "bg-neutral-50";
  const cardInner = isDark ? "bg-neutral-900" : "bg-neutral-100";
  const cardBorder = isDark ? "border-neutral-800" : "border-neutral-200";
  const chip = isDark ? "text-neutral-400" : "text-neutral-500";
  const areaBg = isDark
    ? "bg-black border-neutral-700 text-white placeholder-neutral-500"
    : "bg-white border-neutral-300 text-black placeholder-neutral-400";
  const btnPrimary = isDark
    ? "bg-white text-black hover:bg-neutral-200 border border-neutral-600"
    : "bg-black text-white hover:bg-neutral-900 border border-neutral-700";
  const btnOutline = isDark
    ? "bg-white text-black hover:bg-neutral-200 border border-neutral-600"
    : "bg-black text-white hover:bg-neutral-900 border border-neutral-700";

  // ===== STATE =====
  const [mode, setMode] = useState<Mode>("idle");
  const [task, setTask] = useState<WritingTask | null>(null);
  const [textValue, setTextValue] = useState("");
  const [words, setWords] = useState(0);
  const [timer, setTimer] = useState(80 * 60); // 80 minutes
  const [result, setResult] = useState<EvalResult | null>(null);

  // load previous attempt
  useEffect(() => {
    const saved = localStorage.getItem("stanag_last_attempt");
    if (saved) {
      const data = JSON.parse(saved);
      setTextValue(data.text || "");
      setMode(data.mode || "idle");
      setTimer(typeof data.timer === "number" ? data.timer : 80 * 60);
      if (data.task) setTask(data.task);
      if (data.result) setResult(data.result);
    }
  }, []);

  // auto-save
  useEffect(() => {
    localStorage.setItem(
      "stanag_last_attempt",
      JSON.stringify({ mode, task, text: textValue, timer, result })
    );
  }, [mode, task, textValue, timer, result]);

  // word count
  useEffect(() => {
    const m = textValue.trim().match(/[A-Za-zÀ-ž]+(?:'[A-Za-zÀ-ž]+)?/g);
    setWords(m ? m.length : 0);
  }, [textValue]);

  // timer
  useEffect(() => {
    if (!task) return;
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer, task]);

  const displayTime = useMemo(() => {
    const mm = Math.floor(timer / 60).toString().padStart(2, "0");
    const ss = Math.floor(timer % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  }, [timer]);

  // start handlers
  function startTask1() {
    const pick = task1Pool[Math.floor(Math.random() * task1Pool.length)];
    setMode("task1");
    setTask(pick);
    setTextValue("");
    setResult(null);
    setTimer(80 * 60);
  }
  function startTask2() {
    const pick = task2Options[Math.floor(Math.random() * task2Options.length)];
    setMode("task2");
    setTask(pick);
    setTextValue("");
    setResult(null);
    setTimer(80 * 60);
  }

  function handleEvaluate() {
    if (!task) return;
    const r = evaluateSubmission(textValue, task);
    setResult(r);
  }

  function handleClear() {
    setTextValue("");
    setResult(null);
  }

  // ===== Auto-evaluate (debounce) =====
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (!task) return;
    if (words === 0) { setResult(null); return; }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const r = evaluateSubmission(textValue, task);
      setResult(r);
    }, 600);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [textValue, words, task]);

  // ===== UI helpers =====
  const ScoreCard = ({ label, val }: { label: string; val: number }) => {
    const percent = Math.max(0, Math.min(100, val * 10));
    const track = isDark ? "bg-neutral-800" : "bg-neutral-200";
    const fill = isDark ? "bg-white" : "bg-black";
    return (
      <div className={`text-center ${cardInner} rounded-xl p-3 border ${cardBorder}`}>
        <div className={`text-xs ${chip}`}>{label}</div>
        <div className={`text-3xl font-bold ${text}`}>{val}</div>
        <div className={`text-xs ${chip}`}>{val} / 10</div>
        <div className={`mt-2 h-2 w-full rounded ${track}`}>
          <div className={`h-2 rounded ${fill}`} style={{ width: `${percent}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className={`max-w-5xl mx-auto px-4 py-8 grid gap-8 ${text} ${bg} min-h-screen`}>
      <div className="flex items-center justify-between">
        <motion.h1 className="text-3xl font-bold tracking-tight">
          STANAG Writing Test Simulator
        </motion.h1>
        <button onClick={() => setIsDark((v) => !v)} className={`${btnPrimary} px-3 py-1 rounded-lg`}>
          {isDark ? "Light mode" : "Dark mode"}
        </button>
      </div>

      {/* ===== Struktura zkoušky ===== */}
      <Card className={`${cardBg} ${cardBorder} ${text}`}>
        <CardContent className="p-6 grid gap-4">
          <h2 className="text-xl font-semibold">Struktura zkoušky</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Task 1 */}
            <div className={`rounded-xl p-4 ${cardInner} border ${cardBorder}`}>
              <div className={`text-xs uppercase tracking-wide ${chip} mb-1`}>Task 1</div>
              <div className="font-semibold">
                Formal Letter / E-mail <span className={`${chip}`}>(min. 120 words)</span>
              </div>
              <p className={`text-sm mt-2 ${subText}`}>
                <b>Instruction:</b> Write a formal letter/e-mail or memo on a job-related topic.
                Cover all three points.
              </p>
              <ul className={`list-disc pl-5 text-sm mt-2 ${isDark ? "text-neutral-200" : "text-neutral-700"}`}>
                <li>Formal style (no contractions, impersonal tone)</li>
                <li>Paragraphing with topic sentences</li>
                <li>Cover all 3 points from the prompt</li>
              </ul>
              <div className="mt-3">
                <Button className={`${btnPrimary}`} onClick={startTask1}>Start Task 1 (random)</Button>
              </div>
            </div>

            {/* Task 2 */}
            <div className={`rounded-xl p-4 ${cardInner} border ${cardBorder}`}>
              <div className={`text-xs uppercase tracking-wide ${chip} mb-1`}>Task 2</div>
              <div className="font-semibold">
                Report <span className={`${chip}`}>(min. 200 words)</span>
              </div>
              <p className={`text-sm mt-2 ${subText}`}>
                Choose <b>one</b> of two topics and write a report with clear headings/paragraphs.
              </p>
              <div className="mt-3">
                <Button className={`${btnPrimary}`} onClick={startTask2}>Start Task 2 (random)</Button>
              </div>
            </div>
          </div>
          <div className={`text-xs ${chip}`}>Time limit for the whole writing paper: 80 minutes.</div>
        </CardContent>
      </Card>

      {/* ===== Editor ===== */}
      <Card className={`${cardBg} ${cardBorder} ${text}`}>
        <CardContent className="p-6 grid gap-4">
          <div className={`flex flex-wrap justify-between items-center text-sm ${subText} gap-2`}>
            <div>
              Min. {task?.minWords ?? 120} / 200 words · Timer: <span className="font-mono">{displayTime}</span>
            </div>
            <div>Words: <span className="font-semibold">{words}</span></div>
          </div>

          {task && (
            <div className={`rounded-lg p-3 ${cardInner} border ${cardBorder}`}>
              <div className="text-sm font-semibold mb-1">{task.label}</div>
              <div className="text-sm">{task.instruction}</div>
              <ul className={`list-disc pl-5 text-sm mt-2 ${isDark ? "text-neutral-200" : "text-neutral-700"}`}>
                {task.points.map(p => (<li key={p.id}>{p.text}</li>))}
              </ul>
            </div>
          )}

          <textarea
            className={`w-full h-64 p-4 rounded-xl border focus:ring-2 ${areaBg} ${isDark ? "focus:ring-white" : "focus:ring-black"}`}
            placeholder="Write your answer here… (formal style, paragraphs, linking words)"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
          />

          {/* ⚠️ Varování při podlimitu */}
          {task && (
            <div className={`text-sm mt-2 ${isDark ? "text-red-300" : "text-red-600"}`}>
              {words < Math.round((task.minWords ?? 120) * 0.5) && "Text je příliš krátký – skóre je limitováno (max 2/10)."}
              {words >= Math.round((task.minWords ?? 120) * 0.5) && words < Math.round((task.minWords ?? 120) * 0.7) && "Text je pod 70 % minima – skóre je limitováno (max 4/10)."}
            </div>
          )}

          <div className={`flex flex-wrap items-center justify-between gap-3 text-xs ${subText}`}>
            <div>
              <b>Checklist:</b> cover all 3 points · use ≥3 linking words · formal style · topic sentences · meet word limit
            </div>
            <div className="flex gap-3">
              <Button className={`${btnOutline}`} onClick={handleClear}>Clear</Button>
              <Button className={`${btnPrimary}`} onClick={handleEvaluate} disabled={!task || words === 0}>Evaluate</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== Výsledek ===== */}
      <Card className={`${cardBg} ${cardBorder} ${text}`}>
        <CardContent className="p-6 grid gap-4">
          <h2 className="text-lg font-semibold">Výsledek</h2>

          {!result && <div className={`${chip} text-sm`}>Vyber Task, napiš text a skóre se začne počítat automaticky.</div>}

          {result && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ScoreCard label="Language resources & accuracy" val={result.scores.language} />
                <ScoreCard label="Form (format & requirements)" val={result.scores.form} />
                <ScoreCard label="Organisation & content" val={result.scores.organisation} />
                <ScoreCard label="Effect on the reader" val={result.scores.effect} />
              </div>

              <div className="text-sm">
                Celkem: <span className="font-semibold">{result.total40} / 40</span> ≈ <b>{(result.total40/4).toFixed(1)} / 10</b>
                <span className={`ml-2 ${chip}`}> (Words: {result.facts.words}, Paragraphs: {result.facts.paragraphs}, Linking: {result.facts.linkingWords})</span>
              </div>

              <div>
                <h3 className="font-semibold mb-1">Pokrytí bodů zadání:</h3>
                <ul className={`list-disc pl-5 text-sm ${isDark ? "text-neutral-200" : "text-neutral-700"}`}>
                  {result.coverage.map(c => (
                    <li key={c.id}>
                      {c.covered ? "✅" : "⚠️"} {c.text}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-1">Doporučení:</h3>
                <ul className={`list-disc pl-5 text-sm ${isDark ? "text-neutral-200" : "text-neutral-700"}`}>
                  {result.advice.map((a, i) => (<li key={i}>{a}</li>))}
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
