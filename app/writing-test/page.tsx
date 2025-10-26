// /app/writing-test/page.tsx
"use client";

/* eslint-disable react/no-danger */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { task1Pool, task2Options, type WritingTask } from "@/lib/tasks";
import { evaluateSubmission, type EvalResult } from "@/lib/evaluate";

type Mode = "idle" | "task1" | "task2";
type Lang = "en-GB" | "en-US";

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function buildHighlightedHTML(text: string, tokens: { start: number; end: number }[]) {
  if (!tokens.length) return escapeHtml(text);
  const sorted = [...tokens].sort((a, b) => a.start - b.start);
  let i = 0, out = "";
  for (const t of sorted) {
    if (t.start < i) continue;
    out += escapeHtml(text.slice(i, t.start));
    out += `<mark class="rounded px-0.5 bg-yellow-300/60 text-inherit">${escapeHtml(text.slice(t.start, t.end))}</mark>`;
    i = t.end;
  }
  out += escapeHtml(text.slice(i));
  return out;
}

function Score({ label, val, cardInner, cardBorder, text, chip }:{
  label:string; val:number; cardInner:string; cardBorder:string; text:string; chip:string;
}) {
  const percent = Math.max(0, Math.min(100, val * 10));
  return (
    <div className={`text-center ${cardInner} rounded-xl p-3 border ${cardBorder}`}>
      <div className={`text-xs ${chip}`}>{label}</div>
      <div className={`text-3xl font-bold ${text}`}>{val}</div>
      <div className={`text-xs ${chip}`}>{val} / 10</div>
      <div className={`mt-2 h-2 w-full rounded ${"bg-neutral-800"}`}>
        <div className={`h-2 rounded ${"bg-white"}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function LangToggle({ lang, setLang, isDark, cardBorder, chip }:{
  lang:Lang; setLang:(l:Lang)=>void; isDark:boolean; cardBorder:string; chip:string;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className={`text-xs ${chip}`}>Language</span>
      <div className={`inline-flex rounded-lg overflow-hidden border ${cardBorder}`}>
        {(["en-GB","en-US"] as Lang[]).map(l=>(
          <button key={l} type="button" onClick={()=>setLang(l)} aria-pressed={lang===l}
            className={`px-3 py-1 text-xs ${
              lang===l ? (isDark?"bg-white text-black":"bg-black text-white")
                       : (isDark?"bg-neutral-900 text-neutral-200":"bg-neutral-100 text-neutral-700")}`}>
            {l}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function WritingTestPage() {
  // THEME
  const [isDark, setIsDark] = useState(true);
  const bg = isDark ? "bg-black" : "bg-white";
  const text = isDark ? "text-white" : "text-black";
  const subText = isDark ? "text-neutral-300" : "text-neutral-600";
  const cardBg = isDark ? "bg-neutral-950" : "bg-neutral-50";
  const cardInner = isDark ? "bg-neutral-900" : "bg-neutral-100";
  const cardBorder = isDark ? "border-neutral-800" : "border-neutral-200";
  const chip = isDark ? "text-neutral-400" : "text-neutral-500";
  const btnPrimary = isDark ? "bg-white text-black hover:bg-neutral-200 border border-neutral-600"
                            : "bg-black text-white hover:bg-neutral-900 border border-neutral-700";
  const btnOutline = btnPrimary;

  // STATE
  const [mode, setMode] = useState<Mode>("idle");
  const [task, setTask] = useState<WritingTask | null>(null);
  const [textValue, setTextValue] = useState("");
  const [words, setWords] = useState(0);
  const [timer, setTimer] = useState(80 * 60);
  const [result, setResult] = useState<EvalResult | null>(null);
  const [lang, setLang] = useState<Lang>("en-GB");
  const [tokens, setTokens] = useState<{ start: number; end: number }[]>([]);

  const highlightedHTML = useMemo(() => buildHighlightedHTML(textValue, tokens), [textValue, tokens]);

  // persist
  useEffect(() => {
    const saved = localStorage.getItem("stanag_last_attempt");
    if (saved) {
      const data = JSON.parse(saved);
      setTextValue(data.text || "");
      setMode((data.mode as Mode) || "idle");
      setTimer(typeof data.timer === "number" ? data.timer : 80 * 60);
      if (data.task) setTask(data.task as WritingTask);
      if (data.result) setResult(data.result as EvalResult);
      if (data.lang === "en-GB" || data.lang === "en-US") setLang(data.lang as Lang);
      if (Array.isArray(data.tokens)) setTokens(data.tokens);
    }
  }, []);
  useEffect(() => {
    localStorage.setItem("stanag_last_attempt", JSON.stringify({ mode, task, text: textValue, timer, result, lang, tokens }));
  }, [mode, task, textValue, timer, result, lang, tokens]);

  useEffect(() => {
    const m = textValue.trim().match(/[A-Za-zÀ-ž]+(?:'[A-Za-zÀ-ž]+)?/g);
    setWords(m ? m.length : 0);
  }, [textValue]);

  useEffect(() => {
    if (!task || timer <= 0) return;
    const id = window.setInterval(() => setTimer((t) => t - 1), 1000);
    return () => window.clearInterval(id);
  }, [timer, task]);

  const displayTime = useMemo(() => {
    const mm = Math.floor(timer / 60).toString().padStart(2, "0");
    const ss = Math.floor(timer % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  }, [timer]);

  function startTask1() {
    const pick = task1Pool[Math.floor(Math.random() * task1Pool.length)];
    setMode("task1"); setTask(pick); setTextValue(""); setResult(null); setTimer(80*60); setTokens([]);
  }
  function startTask2() {
    const pick = task2Options[Math.floor(Math.random() * task2Options.length)];
    setMode("task2"); setTask(pick); setTextValue(""); setResult(null); setTimer(80*60); setTokens([]);
  }

  async function handleEvaluate() {
    if (!task) return;
    const r = await evaluateSubmission(textValue, task, { language: lang });
    setResult(r);
    setTokens(r.spellingTokens || []);
  }
  function handleClear() { setTextValue(""); setResult(null); setTokens([]); }

  // overlay scroll sync
  const preRef = useRef<HTMLPreElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  return (
    <div className={`max-w-5xl mx-auto px-4 py-8 grid gap-8 ${text} ${bg} min-h-screen`}>
      <div className="flex items-center justify-between gap-3">
        <motion.h1 className="text-3xl font-bold tracking-tight">STANAG Writing Test Simulator</motion.h1>
        <div className="flex items-center gap-2">
          <LangToggle lang={lang} setLang={setLang} isDark={isDark} cardBorder={cardBorder} chip={chip} />
          <button onClick={() => setIsDark(v => !v)} className={`${btnPrimary} px-3 py-1 rounded-lg`}>
            {isDark ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </div>

      {/* Zadání */}
      <Card className={`${cardBg} ${cardBorder} ${text}`}>
        <CardContent className="p-6 grid gap-4">
          <h2 className="text-xl font-semibold">Struktura zkoušky</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className={`rounded-xl p-4 ${cardInner} border ${cardBorder}`}>
              <div className={`text-xs uppercase tracking-wide ${chip} mb-1`}>Task 1</div>
              <div className="font-semibold">Formal Letter / E-mail <span className={`${chip}`}>(min. 120 words)</span></div>
              <p className={`text-sm mt-2 ${subText}`}><b>Instruction:</b> Write a formal letter/e-mail or memo on a job-related topic. Cover all three points.</p>
              <ul className={`list-disc pl-5 text-sm mt-2 ${isDark ? "text-neutral-200" : "text-neutral-700"}`}>
                <li>Formal style (no contractions, impersonal tone)</li>
                <li>Paragraphing with topic sentences</li>
                <li>Cover all 3 points from the prompt</li>
              </ul>
              <div className="mt-3">
                <Button className={`${btnPrimary}`} onClick={startTask1}>Start Task 1 (random)</Button>
              </div>
            </div>
            <div className={`rounded-xl p-4 ${cardInner} border ${cardBorder}`}>
              <div className={`text-xs uppercase tracking-wide ${chip} mb-1`}>Task 2</div>
              <div className="font-semibold">Report <span className={`${chip}`}>(min. 200 words)</span></div>
              <p className={`text-sm mt-2 ${subText}`}>Choose <b>one</b> of two topics and write a report with clear headings/paragraphs.</p>
              <div className="mt-3">
                <Button className={`${btnPrimary}`} onClick={startTask2}>Start Task 2 (random)</Button>
              </div>
            </div>
          </div>
          <div className={`text-xs ${chip}`}>Time limit for the whole writing paper: 80 minutes.</div>
        </CardContent>
      </Card>

      {/* Editor s highlightem po Evaluate */}
      <Card className={`${cardBg} ${cardBorder} ${text}`}>
        <CardContent className="p-6 grid gap-4">
          <div className={`flex flex-wrap justify-between items-center text-sm ${subText} gap-2`}>
            <div>Min. {task?.minWords ?? 120} / 200 words · Timer: <span className="font-mono">{displayTime}</span></div>
            <div>Words: <span className="font-semibold">{words}</span></div>
          </div>

          {task && (
            <div className={`rounded-xl p-3 ${cardInner} border ${cardBorder}`}>
              <div className="text-sm font-semibold mb-1">{task.label}</div>
              <div className="text-sm">{task.instruction}</div>
              <ul className={`list-disc pl-5 text-sm mt-2 ${isDark ? "text-neutral-200" : "text-neutral-700"}`}>
                {task.points.map(p => (<li key={p.id}>{p.text}</li>))}
              </ul>
            </div>
          )}

          <div className={`relative rounded-xl border ${isDark ? "border-neutral-700" : "border-neutral-300"}`}>
            <pre
              ref={preRef}
              className={`pointer-events-none absolute inset-0 overflow-auto ${isDark?"bg-black":"bg-white"} ${isDark?"text-white":"text-black"} rounded-xl p-4 whitespace-pre-wrap leading-relaxed`}
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: highlightedHTML || "&nbsp;" }}
            />
            <textarea
              ref={taRef}
              className={`relative z-10 w-full h-64 bg-transparent ${isDark?"text-white":"text-black"} rounded-xl p-4 focus:outline-none focus:ring-2 ${isDark?"focus:ring-white":"focus:ring-black"}`}
              placeholder="Write your answer here… (formal style, paragraphs, linking words)"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onScroll={() => {
                if (!preRef.current || !taRef.current) return;
                preRef.current.scrollTop = taRef.current.scrollTop;
                preRef.current.scrollLeft = taRef.current.scrollLeft;
              }}
              spellCheck={false}
              lang="en"
              style={{ lineHeight: "1.625" }}
            />
          </div>

          {task && (
            <div className={`text-sm mt-2 ${isDark ? "text-red-300" : "text-red-600"}`}>
              {words < Math.round((task.minWords ?? 120) * 0.5) && "Text je příliš krátký – skóre je limitováno (max 2/10)."}
              {words >= Math.round((task.minWords ?? 120) * 0.5) && words < Math.round((task.minWords ?? 120) * 0.7) && "Text je pod 70 % minima – skóre je limitováno (max 4/10)."}
            </div>
          )}

          <div className={`flex flex-wrap items-center justify-between gap-3 text-xs ${subText}`}>
            <div><b>Checklist:</b> cover all 3 points · use ≥3 linking words · formal style · topic sentences · meet word limit</div>
            <div className="flex gap-3">
              <Button className={`${btnOutline}`} onClick={handleClear}>Clear</Button>
              <Button className={`${btnPrimary}`} onClick={handleEvaluate} disabled={!task || words === 0}>Evaluate</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Výsledek */}
      <Card className={`${cardBg} ${cardBorder} ${text}`}>
        <CardContent className="p-6 grid gap-4">
          <h2 className="text-lg font-semibold">Výsledek</h2>

          {!result && <div className={`${chip} text-sm`}>Po stisku <b>Evaluate</b> označíme chybné pasáže žlutě a vypíšeme návrhy oprav.</div>}

          {result && (
            <>
              {/* INFO banner o enginu */}
              {result.engine && result.engine.source !== "lt" && (
                <div className={`text-sm rounded-md p-3 border ${isDark?"border-yellow-600 bg-yellow-500/10":"border-yellow-400 bg-yellow-100"}`}>
                  ⚠️ Online kontrola je dočasně nedostupná ({result.engine.error || "unknown error"}). Použil jsem
                  jednoduchý offline slovník nejčastějších překlepů. U složitějších chyb (gramatika) se proto nemusí vše zachytit.
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Score label="Language resources & accuracy" val={result.scores.language} cardInner={cardInner} cardBorder={cardBorder} text={text} chip={chip} />
                <Score label="Form (format & requirements)" val={result.scores.form} cardInner={cardInner} cardBorder={cardBorder} text={text} chip={chip} />
                <Score label="Organisation & content" val={result.scores.organisation} cardInner={cardInner} cardBorder={cardBorder} text={text} chip={chip} />
                <Score label="Effect on the reader" val={result.scores.effect} cardInner={cardInner} cardBorder={cardBorder} text={text} chip={chip} />
                <Score label="Grammar & mechanics" val={result.scores.grammar} cardInner={cardInner} cardBorder={cardBorder} text={text} chip={chip} />
              </div>

              <div className="text-sm">
                Celkem: <span className="font-semibold">{result.total50} / 50</span> ≈ <b>{(result.total50/5).toFixed(1)} / 10</b>
                <span className={`ml-2 ${chip}`}>
                  (Words: {result.facts.words}, Paragraphs: {result.facts.paragraphs}, Linking: {result.facts.linkingWords},
                  Spelling: {result.facts.spellingErrors}, Grammar: {result.facts.grammarErrors}, Style: {result.facts.styleFlags})
                </span>
              </div>

              {(result.spelling?.length || 0) > 0 && (
                <div>
                  <h3 className="font-semibold mb-1">Špatně napsaná slovíčka (návrhy oprav):</h3>
                  <ul className={`list-disc pl-5 text-sm ${isDark ? "text-neutral-200" : "text-neutral-700"}`}>
                    {result.spelling!.map((s, i) => (
                      <li key={i}>
                        <code className="px-1 rounded bg-black/20">{s.word}</code>
                        {s.suggestion ? <> → <b>{s.suggestion}</b></> : null}
                        {s.count > 1 ? ` (${s.count}×)` : ""}
                      </li>
                    ))}
                  </ul>
                  <div className={`${chip} text-xs mt-1`}>Konkrétní chyby jsou žlutě zvýrazněny v editoru výše.</div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
