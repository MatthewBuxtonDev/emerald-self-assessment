"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAssessment } from "@/providers/assessment-provider";

export default function ReportPage() {
  const router = useRouter();
  const { state, setProfile, setStep, setError, reset } = useAssessment();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [showTeacher, setShowTeacher] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state.conversation.length && !state.profile) {
      router.push("/");
      return;
    }
    if (!state.profile && !generating && !reportError) {
      generateReport();
    }
  }, []);

  async function generateReport() {
    setGenerating(true);
    setReportError(null);
    setStep("generating");

    try {
      const res = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userInfo: state.userInfo,
          conversation: state.conversation,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to generate profile");
      }

      const data = await res.json();
      if (!data.profile) throw new Error("Empty response");

      setProfile(data.profile);
      setStep("report");
    } catch (err: any) {
      const msg = err.message || "Something went wrong.";
      setReportError(msg);
      setError(msg);
    } finally {
      setGenerating(false);
    }
  }

  async function downloadPDF() {
    if (!reportRef.current) return;
    setPdfLoading(true);

    try {
      const { default: html2canvas } = await import("html2canvas");
      const { default: jsPDF } = await import("jspdf");

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

      let heightLeft = pdfHeight - pdf.internal.pageSize.getHeight();
      let position = -pdf.internal.pageSize.getHeight();

      while (heightLeft > 0) {
        pdf.addPage();
        position -= pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }

      pdf.save(
        `${state.userInfo?.name || "Learner"} - My Learning Profile.pdf`
      );
    } catch {
      window.print();
    } finally {
      setPdfLoading(false);
    }
  }

  function handleStartOver() {
    sessionStorage.removeItem("ngl-assessment-state");
    reset();
    router.push("/");
  }

  if (!state.profile) {
    if (reportError) {
      return (
        <div className="flex-1 flex items-center justify-center min-h-screen px-4">
          <div className="text-center space-y-4 max-w-md">
            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-700 leading-relaxed">{reportError}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={generateReport}
                className="h-11 px-6 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Try again
              </button>
              <button
                onClick={() => router.push("/assessment")}
                className="h-11 px-6 rounded-full border border-zinc-300 text-zinc-600 text-sm font-medium hover:bg-zinc-50 transition-colors"
              >
                Back to questions
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <span className="inline-flex gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-bounce" />
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.1s]" />
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
          </span>
          <p className="text-sm text-zinc-500">Building your profile...</p>
        </div>
      </div>
    );
  }

  const profile = state.profile;

  return (
    <div className="flex-1 flex flex-col items-center px-4 sm:px-6 py-8 sm:py-12">
      <div className="w-full max-w-2xl space-y-8 sm:space-y-10">
        <div className="text-center space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
            Next-Generation Learning
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900">
            My Learning Profile
          </h1>
          <p className="text-sm text-zinc-500">
            {profile.studentName} &middot; {profile.dateGenerated}
          </p>
        </div>

        <div
          ref={reportRef}
          className="space-y-6 sm:space-y-8 bg-white rounded-2xl border border-zinc-200 p-5 sm:p-8 shadow-sm"
        >
          <div className="p-4 sm:p-5 rounded-xl bg-blue-50 border border-blue-100">
            <p className="text-zinc-700 leading-relaxed text-sm sm:text-base">
              {profile.narrative}
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold text-zinc-900">
              Your Strengths
            </h2>
            <div className="space-y-3">
              {profile.strengths.map((s, i) => (
                <div
                  key={i}
                  className="p-4 sm:p-5 rounded-xl border border-zinc-200 space-y-1.5"
                >
                  <h3 className="font-semibold text-zinc-900 text-sm sm:text-base">
                    {s.title}
                  </h3>
                  <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
                    {s.narrative}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {profile.themes && profile.themes.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-zinc-900">
                How You Learn
              </h2>
              <div className="space-y-3">
                {profile.themes.map((t, i) => (
                  <div
                    key={i}
                    className="p-4 sm:p-5 rounded-xl border border-zinc-200 space-y-2"
                  >
                    <h3 className="font-semibold text-blue-700 text-sm sm:text-base flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      {t.name}
                    </h3>
                    <div className="space-y-1">
                      <p className="text-sm text-zinc-500 font-medium">Strength</p>
                      <p className="text-sm sm:text-base text-zinc-700 leading-relaxed">
                        {t.strength}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-zinc-500 font-medium">Area to build</p>
                      <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
                        {t.growth}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold text-zinc-900">
              Ideas for Your Next Steps
            </h2>
            <ol className="space-y-3 sm:space-y-4">
              {profile.nextSteps.map((step, i) => (
                <li key={i} className="flex gap-3 sm:gap-4">
                  <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm sm:text-base text-zinc-700 leading-relaxed">
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg sm:text-xl font-semibold text-zinc-900">
              Your Interests &amp; Learning
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
              {profile.interestsConnection}
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
            <h2 className="font-semibold text-amber-800 text-sm sm:text-base">
              A Challenge for You
            </h2>
            <p className="text-sm sm:text-base text-amber-700 leading-relaxed">
              {profile.challenge}
            </p>
          </div>

          {profile.teacherSuggestions && profile.teacherSuggestions.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => setShowTeacher(!showTeacher)}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 transition-colors text-left"
              >
                <span className="text-sm sm:text-base font-semibold text-zinc-900">
                  For Teachers &mdash; Classroom Strategies
                </span>
                <span className="text-zinc-400 text-lg">{showTeacher ? "\u2212" : "+"}</span>
              </button>
              {showTeacher && (
                <div className="space-y-4 p-4 sm:p-5 rounded-xl border border-zinc-200 bg-zinc-50">
                  {profile.teacherSuggestions.map((s, i) => (
                    <div key={i}>
                      <h3 className="text-sm font-semibold text-zinc-800 mb-1.5">
                        {s.attribute}
                      </h3>
                      <ul className="space-y-1">
                        {s.strategies.map((strategy, j) => (
                          <li
                            key={j}
                            className="text-sm text-zinc-600 leading-relaxed pl-3 border-l-2 border-blue-200"
                          >
                            {strategy}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={downloadPDF}
              disabled={pdfLoading}
              className="h-12 sm:h-11 px-6 sm:px-8 rounded-full bg-blue-600 text-white text-sm sm:text-base font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 transition-colors shadow-sm"
            >
              {pdfLoading ? "Generating PDF..." : "Download as PDF"}
            </button>
            <button
              onClick={handleStartOver}
              className="h-12 sm:h-11 px-6 sm:px-8 rounded-full border border-zinc-300 text-zinc-600 text-sm sm:text-base font-medium hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
            >
              Start Over
            </button>
          </div>

          <p className="text-xs text-zinc-500 text-center leading-relaxed">
            This profile is based on our conversation and is meant to celebrate
            your strengths and suggest next steps.
          </p>
        </div>
      </div>
    </div>
  );
}
