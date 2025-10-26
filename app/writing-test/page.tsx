// /app/writing-test/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { task1Pool, task2Options, type WritingTask } from "@/lib/tasks";
import { evaluateSubmission, type EvalResult } from "@/lib/evaluate";
import { proof } from "@/lib/proof";

type Mode = "idle" | "task1" | "task2";
type Lang = "en-GB" | "en-US";

// HTML escape pro bezpečné zvýraznění
function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function buildHighlightedHTML(text: string, tokens: { start: number; end: number }[]) {
  if (!tokens.length) return escapeHtml(text);
  const sorted = [...tokens].sort((a, b) => a.start - b.start);
  let i = 0;
  let out = "";
  for (const t of sorted) {
    if (t.start < i) continue; // překryvy ignoruj
    out += escapeHtml(text.slice(i, t.start));
    out += `<mark class="rounded px-0.5 bg-yellow-300/60 text-inherit">${escapeHtml(text.slice(t.start, t.end))}</mark>`;
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
  const [lang, setLang] = useState<Lang>("en-GB"); // přepínač jazyka

  // live highlight tokeny z LanguageTool
  const [liveTokens, setLiveTokens] = useState<{ start: number; end: number }[]>([]);
  const highlightedHTML = useMemo(() => buildHighlightedHTML(textValue, liveTokens), [textValue, liveTokens]);

  // persist (včetně jazyka)
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
    }
  }, []);
  useEffect(() => {
    localStorage.setItem("stanag_last_attempt", JSON.stringify({ mode, task, text: textValue, timer, result, lang }));
  }, [mode, task, textValue, timer, result, lang]);

  useEffect(() => {
    const m = textValue.trim().match(/[A-Za-zÀ-ž]+(?:'[A-Za-zÀ-ž]+)?/g);
    setWords(m ? m.length : 0);
  }, [textValue]);

  useEffect(() => {
    if (!task) return;
    if (timer <= 0) return;
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
    setMode("task1");
    setTask(pick);
    setTextValue("");
    setResult(null);
    setTimer(80 * 60);
    setLiveTokens([]);
  }
  function startTask2() {
    const pick = task2Options[Math.floor(Math.random() * task2Options.length)];
    setMode("task2");
    setTask(pick);
    setTextValue("");
    setResult(null);
    setTimer(80 * 60);
    setLiveTokens([]);
  }

  async function handleEvaluate() {
    if (!task) return;
    const r = await evaluateSubmission(textValue, task, { language: lang });
    setResult(r);
    setLiveTokens(r.spellingTokens || []);
  }
  function handleClear() {
    setTextValue("");
    setResult(null);
    setLiveTokens([]);
  }

  // ==== Live LanguageTool highlight s debounce ====
  const debounceRef = useRef<number | null>(null);
  const inflightRef = useRef<number>(0);

  useEffect(() => {
    if (!task) {
      setLiveTokens([]);
      return;
    }
    if (!textValue || textValue.trim().length === 0) {
      setLiveTokens([]);
      return;
    }

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      const id = ++inflightRef.current;
      const res = await proof(textValue, { language: lang });
      if (id !== inflightRef.current) return; // starší výsledek zahoď
      setLiveTokens(res.tokensForHighlight);
    }, 600);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [textValue, task, lang]);

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

  // overlay refs pro synchronizaci scrollu
  const preRef = useRef<HTMLPreElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const onScrollSync = () => {
    if (!preRef.current || !taRef.current) return;
    preRef.current.scrollTop = taRef.current.scrollTop;
    preRef.current.scrollLeft = taRef.current.scrollLeft;
  };

  // styly pro overlay editor
  const editorBorder = isDark ? "border-neutral-700" : "border-neutral-300";
  const editorBg = isDark ? "bg-black" : "bg-white";
  const editorText = isDark ? "text-white" : "text-black";
  const focusRing = isDark ? "focus:ring-white" : "focus:ring-black";

  // Segmented toggle pro volbu jazyka (EN-GB / EN-US)
  const LangToggle = () => {
    return (
      <div className="inline-flex items-center gap-2">
        <span className={`text-xs ${chip}`}>Language</span>
        <div className={`inline-flex rounded-lg overflow-hidden border ${cardBorder}`}>
          <button
            type="button"
            onClick={() => setLang("en-GB")}
            aria-pressed={lang === "en-GB"}
            className={`px-3 py-1 text-xs ${
              lang === "en-GB"
                ? isDark
                  ? "bg-white text-black"
                  : "bg-black text-white"
                : isDark
                ? "bg-neutral-900 text-neutral-200"
                : "bg-neutral-100 text-neutral-700"
            }`}
          >
            EN-GB
          </button>
          <button
            type="button"
            onClick={() => setLang("en-US")}
            aria-pressed={lang === "en-US"}
            className={`px-3 py-1 text-xs ${
              lang === "en-US"
                ? isDark
                  ? "bg-white text-black"
                  : "bg-black text-white"
                : isDark
                ? "bg-neutral-900 text-neutral-200"
                : "bg-neutral-100 text-neutral-700"
            }`}
          >
            EN-US
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`max-w-5xl mx-auto px-4 py-8 grid gap-8 ${text} ${bg} min-h-screen`}>
      <div className="flex items-center justify-between gap-3">
        <motion.h1 className="text-3xl font-bold tracking-tight">STANAG Writing Test Simulator</motion.h1>
        <div className="flex items-center gap-2">
          <LangToggle />
          <button onClick={() => setIsDark((v) => !v)} className={`${btnPrimary} px-3 py-1 rounded-lg`}>
            {isDark ? "Light mode" : "Dark mode"}
          </button>
        </div>
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
              <p className={`text-sm mt-2 ${subText}`}>
                <b>Instruction:</b> Write a formal letter/e-mail or memo on a job-related topic. Cover all three points.
              </p>
              <ul className={`list-disc pl-5 text-sm mt-2 ${isDark ? "text-neutral-200" : "text-neutral-700"}`}>
                <li>Formal style (no contractions, impersonal tone)</li>
                <li>Paragraphing with topic sentences</li>
                <li>Cover all 3 points from the prompt</li>
              </ul>
              <div className="mt-3">
                <Button className={`${btnPrimary}`} onClick={startTask1}>
                  Start Task 1 (random)
                </Button>
              </div>
            </div>

            <div className={`rounded-xl p-4 ${cardInner} border ${cardBorder}`}>
              <div className={`text-xs uppercase tracking-wide ${chip} mb-1`}>Task 2</div>
              <div className="font-semibold">
                Report <span className={`${chip}`}>(min. 200 words)</span>
              </div>
              <p className={`text-sm mt-2 ${subText}`}>
                Choose <b>one</b> of two topics and write a report with clear headings/paragraphs.
              </p>
              <div className="mt-3">
                <Button className={`${btnPrimary}`} onClick={startTask2}>
                  Start Task 2 (random)
                </Button>
              </div>
            </div>
          </div>
          <div className={`text-xs ${chip}`}>Time limit for the whole writing paper: 80 minutes.</div>
        </CardContent>
      </Card>

      {/* ===== Editor s vizuálním zvýrazněním chyb ===== */}
      <Card className={`${cardBg} ${cardBorder} ${text}`}>
        <CardContent className="p-6 grid gap-4">
          <div className={`flex flex-wrap justify-between items-center text-sm ${subText} gap-2`}>
            <div>
              Min. {task?.minWords ?? 120} / 200 words · Timer: <span className="font-mono">{displayTime}</span>
            </div>
            <div>
              Words: <span className="font-semibold">{words}</span>
            </div>
          </div>

          {task && (
            <div className={`rounded-xl p-3 ${cardInner} border ${cardBorder}`}>
              <div className="text-sm font-semibold mb-1">{task.label}</div>
              <div className="text-sm">{task.instruction}</div>
              <ul className={`list-disc pl-5 text-sm mt-2 ${isDark ? "text-neutral-200" : "text-neutral-700"}`}>
                {task.points.map((p) => (
                  <li key={p.id}>{p.text}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Overlay editor: pod průhledným textarea je <pre> se zvýrazněním */}
          <div className={`relative rounded-xl border ${editorBorder}`}>
            <pre
              ref={preRef}
              className={`pointer-events-none absolute inset-0 overflow-auto ${editorBg} ${editorText} rounded-xl p-4 whitespace-pre-wrap leading-relaxed`}
              aria-hidden="true"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: highlightedHTML || "&nbsp;" }}
            />
            <textarea
              ref={taRef}
              className={`relative z-10 w-full h-64 bg-transparent ${editorText} rounded-xl p-4 focus:outline-none focus:ring-2 ${focusRing}`}
              placeholder="Write your answer here… (formal style, paragraphs, linking words)"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onScroll={onScrollSync}
              spellCheck={false} // necháme kontrolu čistě na LT, aby se "netloukla" s prohlížečem
              lang="en"
              style={{ lineHeight: "1.625" }}
            />
          </div>

          {/* Varování podlimitu */}
          {task && (
            <div className={`text-sm mt-2 ${isDark ? "text-red-300" : "text-red-600"}`}>
              {words < Math.round((task.minWords ?? 120) * 0.5) && "Text je příliš krátký – skóre je limitováno (max 2/10)."}
              {words >= Math.round((task.minWords ?? 120) * 0.5) &&
                words < Math.round((task.minWords ?? 120) * 0.7) &&
                "Text je pod 70 % minima – skóre je limitováno (max 4/10)."}
            </div>
          )}

          <div className={`flex flex-wrap items-center justify-between gap-3 text-xs ${subText}`}>
            <div>
              <b>Checklist:</b> cover all 3 points · use ≥3 linking words · formal style · topic sentences · meet word limit
            </div>
            <div className="flex gap-3">
              <Button className={`${btnOutline}`} onClick={handleClear}>
                Clear
              </Button>
              <Button className={`${btnPrimary}`} onClick={handleEvaluate} disabled={!task || words === 0}>
                Evaluate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== Výsledek ===== */}
      <Card className={`${cardBg} ${cardBorder} ${text}`}>
        <CardContent className="p-6 grid gap-4">
          <h2 className="text-lg font-semibold">Výsledek</h2>

          {!result && (
            <div className={`${chip} text-sm`}>
              Piš do editoru – chybné pasáže uvidíš žlutě. Klikni Evaluate pro detailní rozbor (body + doporučení).
            </div>
          )}

          {result && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <ScoreCard label="Language resources & accuracy" val={result.scores.language} />
                <ScoreCard label="Form (format & requirements)" val={result.scores.form} />
                <ScoreCard label="Organisation & content" val={result.scores.organisation} />
                <ScoreCard label="Effect on the reader" val={result.scores.effect} />
                <ScoreCard label="Grammar & mechanics" val={result.scores.grammar} />
              </div>

              <div className="text-sm">
                Celkem: <span className="font-semibold">{result.total50} / 50</span> ≈{" "}
                <b>{(result.total50 / 5).toFixed(1)} / 10</b>
                <span className={`ml-2 ${chip}`}>
                  (Words: {result.facts.words}, Paragraphs: {result.facts.paragraphs}, Linking: {result.facts.linkingWords}, Spelling:{" "}
                  {result.facts.spellingErrors}, Grammar: {result.facts.grammarErrors}, Style: {result.facts.styleFlags})
                </span>
              </div>

              {/* Špatně napsaná slovíčka + návrhy */}
              {(result.spelling?.length || 0) > 0 && (
                <div>
                  <h3 className="font-semibold mb-1">Špatně napsaná slovíčka (návrhy oprav):</h3>
                  <ul className={`list-disc pl-5 text-sm ${isDark ? "text-neutral-200" : "text-neutral-700"}`}>
                    {result.spelling!.map((s, i) => (
                      <li key={i}>
                        <code className="px-1 rounded bg-black/20">{s.word}</code>
                        {s.suggestion ? (
                          <>
                            {" "}
                            → <b>{s.suggestion}</b>
                          </>
                        ) : null}
                        {s.count > 1 ? ` (${s.count}×)` : ""}
                      </li>
                    ))}
                  </ul>
                  <div className={`${chip} text-xs mt-1`}>Konkrétní chybné segmenty jsou žlutě v editoru výše.</div>
                </div>
              )}

              {/* Gramatika & styl */}
              {(result.grammar?.length || 0) > 0 && (
                <div>
                  <h3 className="font-semibold mb-1">Gramatika / styl – nalezené problémy:</h3>
                  <ul className={`list-disc pl-5 text-sm ${isDark ? "text-neutral-200" : "text-neutral-700"}`}>
                    {result.grammar!.map((g, i) => (
                      <li key={i}>
                        <b>{g.type.toUpperCase()}</b>: {g.message}
                        {g.example ? (
                          <>
                            {" "}
                            — <code className="px-1 rounded bg-black/20">{g.example}</code>
                          </>
                        ) : null}
                        {g.count > 1 ? ` (${g.count}×)` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-1">Pokrytí bodů zadání:</h3>
                <ul className={`list-disc pl-5 text-sm ${isDark ? "text-neutral-200" : "text-neutral-700"}`}>
                  {result.coverage.map((c) => (
                    <li key={c.id}>{c.covered ? "✅" : "⚠️"} {c.text}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-1">Doporučení:</h3>
                <ul className={`list-disc pl-5 text-sm ${isDark ? "text-neutral-200" : "text-neutral-700"}`}>
                  {result.advice.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
