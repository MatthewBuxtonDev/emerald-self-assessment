"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAssessment } from "@/providers/assessment-provider";
import { generateId } from "@/lib/utils";
import type { Message } from "@/types";

export default function AssessmentPage() {
  const router = useRouter();
  const { state, addMessage, setStep, setComplete, setError } = useAssessment();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialised, setInitialised] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [canFinish, setCanFinish] = useState(false);

  const [contextualiseId, setContextualiseId] = useState<string | null>(null);
  const [contextInput, setContextInput] = useState("");
  const [assistingLoading, setAssistingLoading] = useState(false);

  useEffect(() => {
    if (!state.userInfo) {
      router.push("/about-you");
      return;
    }
    if (state.isComplete) {
      router.push("/report");
      return;
    }
    if (state.conversation.length === 0 && !loading && !errorMsg) {
      startAssessment();
    }
    setInitialised(true);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.conversation, loading]);

  useEffect(() => {
    if (!loading && state.conversation.length > 0 && !state.isComplete) {
      inputRef.current?.focus();
    }
  }, [loading, state.conversation.length, state.isComplete]);

  async function startAssessment() {
    setStep("generating");
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state.userInfo),
      });

      if (res.status === 502) {
        const data = await res.json().catch(() => ({}));
        if (data.error?.includes("MISTRAL_API_KEY")) {
          throw new Error("The API key is not configured. Please contact the site owner.");
        }
        throw new Error("The AI service is currently unavailable. Please try again.");
      }

      if (!res.ok) throw new Error("Something went wrong. Please try again.");

      const data = await res.json();
      if (!data.question && !data.response) throw new Error("Received an empty response. Please try again.");

      if (data.response) {
        addMessage({
          id: generateId(),
          role: "ai",
          text: data.response,
        });
      }

      if (data.question) {
        addMessage({
          id: data.question.id,
          role: "ai",
          text: data.question.text,
          format: data.question.format,
          capability: data.question.capability,
          options: data.question.options,
        });
      }

      setStep("assessment");
    } catch (err: any) {
      const msg = err.message || "Something went wrong. Please try again.";
      setErrorMsg(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function getNextQuestion(immediateAnswer?: string) {
    setLoading(true);
    setErrorMsg(null);

    const answer = immediateAnswer || input.trim();

    const userMsg = { id: generateId(), role: "user" as const, text: answer };
    addMessage(userMsg);
    setInput("");

    try {
      const res = await fetch("/api/continue-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation: [...state.conversation, userMsg],
        }),
      });

      if (!res.ok) throw new Error("Something went wrong. Please try again.");

      const data = await res.json();

      if (data.ready) setCanFinish(true);

      if (data.complete) {
        finishAssessment();
        return;
      }

      if (data.response) {
        addMessage({
          id: generateId(),
          role: "ai",
          text: data.response,
        });
      }

      if (data.question) {
        addMessage({
          id: data.question.id,
          role: "ai",
          text: data.question.text,
          format: data.question.format,
          capability: data.question.capability,
          options: data.question.options,
        });
      }
    } catch (err: any) {
      const msg = err.message || "Something went wrong. Please try again.";
      setErrorMsg(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function finishAssessment() {
    setComplete(true);
    setStep("generating");
    router.push("/report");
  }

  function handleSubmitAnswer(text?: string) {
    if (loading) return;
    const answer = (text || input).trim();
    if (!answer) return;
    getNextQuestion(answer);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitAnswer();
    }
  }

  async function handleExplain(msg: Message) {
    setAssistingLoading(true);
    try {
      const res = await fetch("/api/assist-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "explain",
          question: { text: msg.text, capability: msg.capability },
          userInfo: state.userInfo,
          conversation: state.conversation,
        }),
      });
      if (!res.ok) throw new Error("Failed to get explanation");
      const data = await res.json();
      addMessage({ id: generateId(), role: "ai", text: data.response });
    } catch {
      setErrorMsg("Couldn't get an explanation. Please try again.");
    } finally {
      setAssistingLoading(false);
    }
  }

  async function handleContextualise(msg: Message) {
    if (!contextInput.trim()) return;
    setAssistingLoading(true);
    try {
      const res = await fetch("/api/assist-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "contextualise",
          context: contextInput.trim(),
          question: { text: msg.text, capability: msg.capability },
          userInfo: state.userInfo,
          conversation: state.conversation,
        }),
      });
      if (!res.ok) throw new Error("Failed to rephrase");
      const data = await res.json();
      addMessage({
        id: generateId(),
        role: "ai",
        text: data.response,
        capability: msg.capability,
        format: msg.format,
        options: msg.options,
      });
    } catch {
      setErrorMsg("Couldn't rephrase the question. Please try again.");
    } finally {
      setAssistingLoading(false);
      setContextualiseId(null);
      setContextInput("");
    }
  }

  if (!initialised) return null;

  const lastQuestion = [...state.conversation].reverse().find((m) => m.role === "ai" && m.capability);
  const hasOptions = lastQuestion?.options && lastQuestion.options.length > 0;
  const questionCount = state.conversation.filter((m) => m.role === "ai" && m.capability).length;

  return (
    <div className="flex-1 flex flex-col h-screen max-h-dvh">
      <header className="flex-shrink-0 border-b border-zinc-200 bg-white px-4 sm:px-6 py-3">
        <div className="max-w-3xl mx-auto w-full">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => router.push("/about-you")}
              className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
            >
              &larr; Back
            </button>
            <span className="text-xs text-zinc-500 font-medium">
              {questionCount} question{questionCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6">
        <div className="max-w-3xl mx-auto w-full space-y-4 py-6">
          {state.conversation.length === 0 && !loading && !errorMsg && (
            <div className="flex justify-center py-12">
              <span className="inline-flex gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.1s]" />
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
              </span>
            </div>
          )}

          {state.conversation.map((msg) => (
            <div key={msg.id}>
              <div
                className={`flex ${msg.role === "ai" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm sm:text-base leading-relaxed ${
                    msg.role === "ai"
                      ? "bg-white border border-zinc-200 text-zinc-800 shadow-sm"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
              {msg.role === "ai" &&
                msg.capability &&
                msg.id === lastQuestion?.id &&
                !loading &&
                !assistingLoading && (
                <div className="flex justify-start mt-1.5 gap-2">
                  {contextualiseId === msg.id ? (
                    <>
                      <input
                        value={contextInput}
                        onChange={(e) => setContextInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleContextualise(msg);
                          }
                        }}
                        placeholder="e.g. football, gaming..."
                        className="flex-1 max-w-48 h-8 px-3 rounded-lg border border-zinc-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                      />
                      <button
                        onClick={() => handleContextualise(msg)}
                        disabled={!contextInput.trim()}
                        className="h-8 px-3 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 transition-colors"
                      >
                        Go
                      </button>
                      <button
                        onClick={() => { setContextualiseId(null); setContextInput(""); }}
                        className="h-8 px-3 rounded-lg border border-zinc-300 bg-white text-xs text-zinc-600 hover:text-zinc-800 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleExplain(msg)}
                        className="text-xs text-zinc-500 hover:text-blue-600 underline underline-offset-2 transition-colors"
                      >
                        Explain this
                      </button>
                      <button
                        onClick={() => { setContextualiseId(msg.id); setContextInput(""); }}
                        className="text-xs text-zinc-500 hover:text-blue-600 underline underline-offset-2 transition-colors"
                      >
                        Rephrase
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-3 bg-white border border-zinc-200 shadow-sm">
                <span className="inline-flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-zinc-300 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-zinc-300 animate-bounce [animation-delay:0.1s]" />
                  <span className="w-2 h-2 rounded-full bg-zinc-300 animate-bounce [animation-delay:0.2s]" />
                </span>
              </div>
            </div>
          )}

          {(errorMsg || state.error) && (
            <div className="flex justify-center">
              <div className="w-full max-w-md p-4 rounded-xl bg-red-50 border border-red-200">
                <p className="text-sm text-red-700 leading-relaxed">
                  {errorMsg || state.error}
                </p>
                <button
                  onClick={() => {
                    setErrorMsg(null);
                    setError(null);
                    startAssessment();
                  }}
                  className="mt-2 text-sm font-medium text-red-600 hover:text-red-800 hover:underline"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-zinc-200 bg-white px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-3xl mx-auto w-full space-y-3">
          {hasOptions ? (
            <div className="flex flex-wrap gap-2 justify-center">
              {lastQuestion!.options!.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSubmitAnswer(opt.label)}
                  disabled={loading}
                  className="px-4 sm:px-5 py-2.5 rounded-full border border-zinc-300 bg-white text-sm text-zinc-700 hover:border-blue-400 hover:text-blue-600 active:bg-blue-50 disabled:opacity-40 transition-colors font-medium touch-manipulation"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your answer..."
                className="flex-1 min-h-0 h-11 sm:h-12 px-4 py-2.5 rounded-xl border border-zinc-300 bg-white text-sm sm:text-base resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                rows={1}
                disabled={loading}
              />
              <button
                onClick={() => handleSubmitAnswer()}
                disabled={!input.trim() || loading}
                className="flex-shrink-0 h-11 sm:h-12 px-5 sm:px-6 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 transition-colors shadow-sm touch-manipulation"
              >
                Send
              </button>
            </div>
          )}

          {canFinish && !loading && (
            <div className="text-center">
              <button
                onClick={finishAssessment}
                className="text-xs text-zinc-500 hover:text-zinc-700 underline underline-offset-2 transition-colors"
              >
                I&apos;m done — show me my profile
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
