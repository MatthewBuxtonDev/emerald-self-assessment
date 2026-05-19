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

  useEffect(() => {
    if (!state.userInfo) {
      router.push("/about-you");
      return;
    }
    if (state.isComplete) {
      router.push("/report");
      return;
    }
    if (state.conversation.length === 0) {
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

    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state.userInfo),
      });

      if (!res.ok) throw new Error("Failed to generate questions");

      const data = await res.json();
      addMessage({
        id: data.question.id,
        role: "ai",
        text: data.question.text,
        format: data.question.format,
        capability: data.question.capability,
        options: data.question.options,
      });

      setStep("assessment");
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitAnswer(text?: string) {
    const answer = (text || input).trim();
    if (!answer || loading) return;

    setInput("");

    addMessage({
      id: generateId(),
      role: "user",
      text: answer,
    });

    setLoading(true);

    try {
      const res = await fetch("/api/continue-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation: [
            ...state.conversation,
            { id: generateId(), role: "user", text: answer },
          ],
        }),
      });

      if (!res.ok) throw new Error("Failed to continue assessment");

      const data = await res.json();

      if (data.complete) {
        setComplete(true);
        setStep("generating");
        router.push("/report");
      } else if (data.question) {
        addMessage({
          id: data.question.id,
          role: "ai",
          text: data.question.text,
          format: data.question.format,
          capability: data.question.capability,
          options: data.question.options,
        });
      }
    } catch {
      setError("Something went wrong. Please try again.");
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
  const isScale = lastAiMsg?.format === "scale";
  const isChoice = lastAiMsg?.format === "choice";

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4">
      <header className="py-4 border-b border-zinc-200">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/about-you")}
            className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            &larr; Back
          </button>
          <span className="text-xs text-zinc-400">
            {state.conversation.filter((m) => m.role === "ai").length} questions
            asked
          </span>
        </div>
        <div className="flex gap-2 mt-2 justify-center">
          {["collaboration", "metacognition", "agency"].map((code) => {
            const count = state.conversation.filter(
              (m) => m.capability === code
            ).length;
            const covered = count >= 2;
            return (
              <span
                key={code}
                className={`text-xs px-2.5 py-0.5 rounded-full border ${
                  covered
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-zinc-50 border-zinc-200 text-zinc-400"
                }`}
              >
                {CAP_NAMES[code]}
              </span>
            );
          })}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto space-y-4 py-6 px-1">
        {state.conversation.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "ai" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "ai"
                  ? "bg-white border border-zinc-200 text-zinc-800"
                  : "bg-blue-600 text-white"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white border border-zinc-200">
              <span className="inline-flex gap-1">
                <span className="w-2 h-2 rounded-full bg-zinc-300 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-zinc-300 animate-bounce [animation-delay:0.1s]" />
                <span className="w-2 h-2 rounded-full bg-zinc-300 animate-bounce [animation-delay:0.2s]" />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="py-4 border-t border-zinc-200 bg-zinc-50">
        {state.error && (
          <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between">
            <span>{state.error}</span>
            <button
              onClick={() => {
                setError(null);
                startAssessment();
              }}
              className="text-red-600 font-medium hover:underline ml-2"
            >
              Retry
            </button>
          </div>
        )}

        {isScale && lastAiMsg?.options ? (
          <div className="flex flex-wrap gap-2 justify-center">
            {lastAiMsg.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSubmitAnswer(opt.label)}
                disabled={loading}
                className="px-4 py-2 rounded-full border border-zinc-300 bg-white text-sm text-zinc-700 hover:border-blue-400 hover:text-blue-600 disabled:opacity-40 transition-colors"
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : isChoice && lastAiMsg?.options ? (
          <div className="flex flex-wrap gap-2 justify-center">
            {lastAiMsg.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSubmitAnswer(opt.label)}
                disabled={loading}
                className="px-4 py-2 rounded-full border border-zinc-300 bg-white text-sm text-zinc-700 hover:border-blue-400 hover:text-blue-600 disabled:opacity-40 transition-colors"
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
              className="flex-1 h-10 px-4 py-2 rounded-xl border border-zinc-300 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={1}
              disabled={loading}
            />
            <button
              onClick={() => handleSubmitAnswer()}
              disabled={!input.trim() || loading}
              className="h-10 px-5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
