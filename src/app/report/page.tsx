"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAssessment } from "@/providers/assessment-provider";

export default function ReportPage() {
  const router = useRouter();
  const { state, setProfile, setStep, setError, reset } = useAssessment();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state.conversation.length && !state.profile) {
      router.push("/");
      return;
    }

    if (!state.profile && state.isComplete && !generating) {
      generateReport();
    }
  }, []);

  async function generateReport() {
    setGenerating(true);
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

      if (!res.ok) throw new Error("Failed to generate report");

      const data = await res.json();
      setProfile(data.profile);
      setStep("report");
    } catch {
      setError("Failed to generate your profile. Please try again.");
      router.push("/assessment");
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

      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft > 0) {
        position -= pdf.internal.pageSize.getHeight();
        pdf.addPage();
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
    return (
      <div className="flex-1 flex items-center justify-center">
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
    <div className="flex-1 flex flex-col items-center px-4 py-8 sm:py-12">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
            Next-Generation Learning
          </p>
          <h1 className="text-3xl font-semibold text-zinc-900">
            My Learning Profile
          </h1>
          <p className="text-sm text-zinc-400">
            {profile.studentName} &middot; {profile.dateGenerated}
          </p>
        </div>

        <div
          ref={reportRef}
          className="space-y-8 bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8"
        >
          <div className="p-5 rounded-xl bg-blue-50 border border-blue-100">
            <p className="text-zinc-700 leading-relaxed">{profile.narrative}</p>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900">
              Your Strengths
            </h2>
            <div className="space-y-3">
              {profile.strengths.map((s, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-zinc-200 space-y-1"
                >
                  <h3 className="font-medium text-zinc-900">{s.title}</h3>
                  <p className="text-sm text-zinc-600 leading-relaxed">
                    {s.narrative}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900">
              Ideas for Your Next Steps
            </h2>
            <ol className="space-y-3">
              {profile.nextSteps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                    {i + 1}
                  </span>
                  <p className="text-sm text-zinc-600 leading-relaxed pt-1">
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-900">
              Your Interests &amp; Learning
            </h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              {profile.interestsConnection}
            </p>
          </div>

          <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
            <h2 className="text-base font-semibold text-amber-800">
              A Challenge for You
            </h2>
            <p className="text-sm text-amber-700 leading-relaxed">
              {profile.challenge}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={downloadPDF}
            disabled={pdfLoading}
            className="h-11 px-6 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {pdfLoading ? "Generating PDF..." : "Download as PDF"}
          </button>
          <button
            onClick={handleStartOver}
            className="h-11 px-6 rounded-full border border-zinc-300 text-zinc-600 text-sm font-medium hover:bg-zinc-50 transition-colors"
          >
            Start Over
          </button>
        </div>

        <p className="text-xs text-zinc-400 text-center">
          This profile is based on our conversation and is meant to celebrate
          your strengths and suggest next steps — not to label or rank you.
        </p>
      </div>
    </div>
  );
}
