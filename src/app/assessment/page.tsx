"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAssessment } from "@/providers/assessment-provider";
import { generateId } from "@/lib/utils";

const CAP_NAMES: Record<string, string> = {
  collaboration: "Working with Others",
  metacognition: "Thinking about Learning",
  agency: "Taking Action",
};

export default function AssessmentPage() {
  const router = useRouter();
  const { state, addMessage, setStep, setComplete, setError } = useAssessment();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialised, setInitialised] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
        if (data.error?.includes("GROQ_API_KEY")) {
          throw new Error("The API key is not configured. Please contact the site owner.");
        }
        throw new Error("The AI service is currently unavailable. Please try again.");
      }

      if (!res.ok) throw new Error("Something went wrong. Please try again.");

      const data = await res.json();
      if (!data.question) throw new Error("Received an empty response. Please try again.");

      addMessage({
        id: data.question.id,
        role: "ai",
        text: data.question.text,
        format: data.question.format,
        capability: data.question.capability,
        options: data.question.options,
      });

      setStep("assessment");
    } catch (err: any) {
      const msg = err.message || "Something went wrong. Please try again.";
      setErrorMsg(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitAnswer(text?: string) {
    const answer = (text || input).trim();
    if (!answer || loading) return;

    setInput("");
    setErrorMsg(null);

    const userMsg = { id: generateId(), role: "user" as const, text: answer };
    addMessage(userMsg);

    setLoading(true);

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

      if (data.complete || !data.question) {
        setComplete(true);
        setStep("generating");
        // Navigate to report — state is persisted via sessionStorage
        router.push("/report");
      } else {
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

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitAnswer();
    }
  }

  if (!initialised) return null;

  const lastAiMsg = [...state.conversation].reverse().find((m) => m.role === "ai");
  const hasOptions = lastAiMsg?.options && lastAiMsg.options.length > 0;
  const questionCount = state.conversation.filter((m) => m.role === "ai").length;

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
          <div className="flex gap-1.5 sm:gap-2 justify-center flex-wrap">
            {(["collaboration", "metacognition", "agency"] as const).map(
              (code) => {
                const count = state.conversation.filter(
                  (m) => m.role === "ai" && m.capability === code
                ).length;
                const covered = count >= 2;
                return (
                  <span
                    key={code}
                    className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                      covered
                        ? "bg-green-50 border-green-200 text-green-700"
                        : "bg-zinc-50 border-zinc-200 text-zinc-500"
                    }`}
                  >
                    {CAP_NAMES[code]}
                  </span>
                );
              }
            )}
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
            <div
              key={msg.id}
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
        <div className="max-w-3xl mx-auto w-full">
          {hasOptions ? (
            <div className="flex flex-wrap gap-2 justify-center">
              {lastAiMsg!.options!.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSubmitAnswer(opt.label)}
                  disabled={loading}
                  className="px-4 sm:px-5 py-2.5 rounded-full border border-zinc-300 bg-white text-sm text-zinc-700 hover:border-blue-400 hover:text-blue-600 active:bg-blue-50 disabled:opacity-40 transition-colors font-medium"
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
                className="flex-shrink-0 h-11 sm:h-12 px-5 sm:px-6 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 transition-colors shadow-sm"
              >
                Send
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
