"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { task1Pool, task2Options, type WritingTask } from "@/lib/tasks";
import { evaluateSubmission, type EvalResult } from "@/lib/evaluate";
import { checkSpelling, checkUnknownWords } from "@/lib/spell";

type Mode = "idle" | "task1" | "task2";

// HTML escape pro bezpečné zvýraznění
const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function buildHighlightedHTML(
  text: string,
  miss: {start:number; end:number}[],
  unknown: {start:number; end:number}[]
) {
  // sloučíme oba seznamy tokenů a vykreslíme: miss (žlutě), unknown (žlutě) – stejný vzhled
  const all = [...miss.map(t=>({ ...t, kind:"miss" as const })), ...unknown.map(t=>({ ...t, kind:"unk" as const }))].sort((a,b)=>a.start-b.start);
  if (!all.length) return escapeHtml(text);
  let i=0, out="";
  for (const t of all) {
    if (t.start < i) continue;
    out += escapeHtml(text.slice(i, t.start));
    const cls = "rounded px-0.5 bg-yellow-300/60 text-inherit";
    out += `<mark class="${cls}">${escapeHtml(text.slice(t.start, t.end))}</mark>`;
    i = t.end;
  }
  out += escapeHtml(text.slice(i));
  return out;
}

export default function WritingTestPage() {
  // ===== THEMING =====
  const [isDark, setIsDark] = useState(true);
  const bg = isDark ? "bg-black" : "bg-white";
  const text = isDark ? "text-white" : "text-black";
  const subText = isDark ? "text-neutral-300" : "text-neutral-600";
  const cardBg = isDark ? "bg-neutral-950" : "bg-neutral-50";
  const cardInner = isDark ? "bg-neutral-900" : "bg-neutral-100";
  const cardBorder = isDark ? "border-neutral-800" : "border-neutral-200";
  const chip = isDark ? "text-neutral-400" : "text-neutral-500";
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
  const [timer, setTimer] = useState(80 * 60);
  const [result, setResult] = useState<EvalResult | null>(null);

  // slovník (načte se z /public/dict/en-basic.txt)
  const [dict, setDict] = useState<Set<string> | null>(null);
  useEffect(() => {
    fetch("/dict/en-basic.txt")
      .then(r => r.text())
      .then(t => {
        const set = new Set(
          t.split(/\r?\n/).map(w => w.trim().toLowerCase()).filter(Boolean)
        );
        setDict(set);
      })
      .catch(() => setDict(null));
  }, []);

  // živá kontrola pro overlay (běží rychle, bez vyhodnocení skóre)
  const liveMiss = useMemo(() => checkSpelling(textValue).tokens, [textValue]);
  const liveUnk = useMemo(() => checkUnknownWords(textValue, dict || undefined).tokens, [textValue, dict]);
  const highlightedHTML = useMemo(
    () => buildHighlightedHTML(textValue, liveMiss, liveUnk),
    [textValue, liveMiss, liveUnk]
  );

  // persist
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
  useEffect(() => {
    localStorage.setItem("stanag_last_attempt", JSON.stringify({ mode, task, text: textValue, timer, result }));
  }, [mode, task, text, textValue, timer, result]);

  useEffect(() => {
    const m = textValue.trim().match(/[A-Za-zÀ-ž]+(?:'[A-Za-zÀ-ž]+)?/g);
    setWords(m ? m.length : 0);
  }, [textValue]);

  useEffect(() => {
    if (!task) return; if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer, task]);

  const displayTime = useMemo(() => {
    const mm = Math.floor(timer / 60).toString().padStart(2, "0");
    const ss = Math.floor(timer % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  }, [timer]);

  function startTask1() {
    const pick = task1Pool[Math.floor(Math.random() * task1Pool.length)];
    setMode("task1"); setTask(pick); setTextValue(""); setResult(null); setTimer(80 * 60);
  }
  function startTask2() {
    const pick = task2Options[Math.floor(Math.random() * task2Options.length)];
    setMode("task2"); setTask(pick); setTextValue(""); setResult(null); setTimer(80 * 60);
  }

  function handleEvaluate() {
    if (!task) return;
    const r = evaluateSubmission(textValue, task, dict || undefined);
    setResult(r);
  }
  function handleClear() { setTextValue(""); setResult(null); }

  // Auto-evaluate (debounce)
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (!task) return;
    if (words === 0) { setResult(null); return; }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setResult(evaluateSubmission(textValue, task, dict || undefined));
    }, 600);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [textValue, words, task, dict]);

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

  // styly overlay editoru
  const editorBorder = isDark ? "border-neutral-700" : "border-neutral-300";
  const editorBg = isDark ? "bg-black" : "bg-white";
  const editorText = isDark ? "text-white" : "text-black";
  const focusRing = isDark ? "focus:ring-white" : "focus:ring-black";

  return (
    <div className={`max-w-5xl mx-auto px-4 py-8 grid gap-8 ${text} ${bg} min-h-screen`}>
      <div className="flex items-center justify-between">
        <motion.h1 className="text-3xl font-bold tracking-tight">STANAG Writing Test Simulator</motion.h1>
        <button onClick={() => setIsDark(v => !v)} className={`${btnPrimary} px-3 py-1 rounded-lg`}>
          {isDark ? "Light mode" : "Dark mode"}
        </button>
      </div>

      {/* ===== Struktura zkoušky ===== */}
      <Card className={`${cardBg} ${cardBorder} ${text}`}>
        <CardContent className="p-6 grid gap-4">
          <h2 className="text-xl font-semibold">Struktura zkoušky</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className={`rounded-xl p-4 ${cardInner} border ${cardBorder}`}>
              <div className={`text-xs uppercase tracking-wide ${chip} mb-1`}>Task 1</div>
              <div className="font-semibold">
                Formal Letter / E-mail <span className={`${chip}`}>(min. 120 words)</span>
              </div>
              <p className={`text-sm mt-2 ${subText}`}><b>Instruction:</b> Write a formal letter/e-mail or memo on a job-related topic. Cover all three points.</p>
              <ul className={`list-disc pl-5 text-sm mt-2 ${isDark ? "text-neutral-200" : "text-neutral-700"}`}>
                <li>Formal style (no contractions, impersonal tone)</li>
                <li>Paragraphing with topic sentences</li>
                <li>Cover all 3 points from the prompt</li>
              </ul>
              <div className="mt-3"><Button className={`${btnPrimary}`} onClick={startTask1}>Start Task 1 (random)</Button></div>
            </div>

            <div className={`rounded-xl p-4 ${cardInner} border ${cardBorder}`}>
              <div className={`text-xs uppercase tracking-wide ${chip} mb-1`}>Task 2</div>
              <div className="font-semibold">
                Report <span className={`${chip}`}>(min. 200 words)</span>
              </div>
              <p className={`text-sm mt-2 ${subText}`}>Choose <b>one</b> of two topics and write a report with clear headings/paragraphs.</p>
              <div className="mt-3"><Button className={`${btnPrimary}`} onClick={startTask2}>Start Task 2 (random)</Button></div>
            </div>
          </div>
          <div className={`text-xs ${chip}`}>Time limit for the whole writing paper: 80 minutes.</div>
        </CardContent>
      </Card>

      {/* ===== Editor s overlay zvýrazněním ===== */}
      <Card className={`${cardBg} ${cardBorder} ${text}`}>
        <CardContent className="p-6 grid gap-4">
          <div className={`flex flex-wrap justify-between items-center text-sm ${subText} gap-2`}>
            <div>Min. {task?.minWords ?? 120} / 200 words · Timer: <span className="font-mono">{displayTime}</span></div>
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

          <div className={`relative rounded-xl border ${editorBorder}`}>
            <pre
              className={`pointer-events-none absolute inset-0 overflow-auto ${editorBg} ${editorText} rounded-xl p-4 whitespace-pre-wrap leading-relaxed`}
              aria-hidden="true"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: highlightedHTML || "&nbsp;" }}
            />
            <textarea
              className={`relative z-10 w-full h-64 bg-transparent ${editorText} rounded-xl p-4 focus:outline-none focus:ring-2 ${focusRing}`}
              placeholder="Write your answer here… (formal style, paragraphs, linking words)"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              spellCheck={true}
              lang="en"
              style={{ lineHeight: "1.625" }}
            />
          </div>

          {/* Varování podlimitu */}
          {task && (
            <div className={`text-sm mt-2 ${isDark ? "text-red-300" : "text-red-600"}`}>
              {words < Math.round((task.minWords ?? 120) * 0.5) && "Text je příliš krátký – skóre je limitováno (max 2/10)."}
              {words >= Math.round((task.minWords ?? 120) * 0.5) && words < Math.round((task.minWords ?? 120) * 0.7) && "Text je pod 70 % minima – skóre je limitováno (max 4/10)."}
            </div>
          )}

          <div className={`flex flex-wrap items-center justify-between gap-3 text-xs ${subText}`}>
            <div><b>Checklist:</b> cover all 3 points · use ≥3 linking words · formal style · topic sentences · meet word limit</div>
            <div className="flex gap-3">
              <Button className={`${
