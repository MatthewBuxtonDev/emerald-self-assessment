"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAssessment } from "@/providers/assessment-provider";
import type { UserInfo } from "@/types";

const YEAR_LEVELS = [7, 8, 9, 10];

export default function AboutYouPage() {
  const router = useRouter();
  const { setUserInfo, setStep } = useAssessment();

  const [name, setName] = useState("");
  const [yearLevel, setYearLevel] = useState<number | "">("");
  const [interestInput, setInterestInput] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [passionInput, setPassionInput] = useState("");
  const [passions, setPassions] = useState<string[]>([]);
  const [selfDescription, setSelfDescription] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  function addTag(
    list: string[],
    setList: (v: string[]) => void,
    input: string,
    setInput: (v: string) => void
  ) {
    const tag = input.trim();
    if (tag && !list.includes(tag) && list.length < 5) {
      setList([...list, tag]);
      setInput("");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    if (!name.trim()) errs.push("Please enter your name.");
    if (!yearLevel) errs.push("Please select your year level.");

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    const info: UserInfo = {
      name: name.trim(),
      yearLevel: yearLevel as number,
      interests,
      passions,
      selfDescription,
    };

    setUserInfo(info);
    setStep("assessment");
    router.push("/assessment");
  }

  function removeTag(
    list: string[],
    setList: (v: string[]) => void,
    tag: string
  ) {
    setList(list.filter((t) => t !== tag));
  }

  return (
    <div className="flex-1 flex flex-col items-center px-4 py-12 sm:py-20">
      <div className="max-w-lg w-full space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900">
            About You
          </h1>
          <p className="text-zinc-500 text-sm">
            This helps us personalise the conversation.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.length > 0 && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 space-y-1">
              {errors.map((e, i) => (
                <p key={i}>{e}</p>
              ))}
            </div>
          )}

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-zinc-700 mb-1"
            >
              Your name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your name"
              maxLength={50}
            />
          </div>

          <div>
            <label
              htmlFor="year"
              className="block text-sm font-medium text-zinc-700 mb-1"
            >
              Year level
            </label>
            <select
              id="year"
              value={yearLevel}
              onChange={(e) =>
                setYearLevel(e.target.value ? Number(e.target.value) : "")
              }
              className="w-full h-10 px-3 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select...</option>
              {YEAR_LEVELS.map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              What are you interested in?
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(interests, setInterests, interestInput, setInterestInput);
                  }
                }}
                className="flex-1 h-10 px-3 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. soccer, art, gaming"
                disabled={interests.length >= 5}
              />
              <button
                type="button"
                onClick={() =>
                  addTag(interests, setInterests, interestInput, setInterestInput)
                }
                disabled={interests.length >= 5}
                className="h-10 px-4 rounded-lg bg-zinc-100 text-zinc-600 text-sm font-medium hover:bg-zinc-200 disabled:opacity-40 transition-colors"
              >
                Add
              </button>
            </div>
            {interests.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {interests.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(interests, setInterests, tag)}
                      className="hover:text-blue-900"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-zinc-400 mt-1">
              Up to 5. Press Enter or click Add.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              What are you passionate about?
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={passionInput}
                onChange={(e) => setPassionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(passions, setPassions, passionInput, setPassionInput);
                  }
                }}
                className="flex-1 h-10 px-3 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. environment, music, coding"
                disabled={passions.length >= 5}
              />
              <button
                type="button"
                onClick={() =>
                  addTag(passions, setPassions, passionInput, setPassionInput)
                }
                disabled={passions.length >= 5}
                className="h-10 px-4 rounded-lg bg-zinc-100 text-zinc-600 text-sm font-medium hover:bg-zinc-200 disabled:opacity-40 transition-colors"
              >
                Add
              </button>
            </div>
            {passions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {passions.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(passions, setPassions, tag)}
                      className="hover:text-amber-900"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-zinc-400 mt-1">
              Up to 5. Press Enter or click Add.
            </p>
          </div>

          <div>
            <label
              htmlFor="desc"
              className="block text-sm font-medium text-zinc-700 mb-1"
            >
              How would you describe yourself as a learner?
            </label>
            <textarea
              id="desc"
              value={selfDescription}
              onChange={(e) => setSelfDescription(e.target.value)}
              className="w-full h-24 px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Optional — e.g. I like to take my time and think things through..."
              maxLength={300}
            />
            <p className="text-xs text-zinc-400 mt-1 text-right">
              {selfDescription.length}/300
            </p>
          </div>

          <button
            type="submit"
            className="w-full h-12 rounded-full bg-blue-600 text-white font-medium text-base hover:bg-blue-700 transition-colors"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
