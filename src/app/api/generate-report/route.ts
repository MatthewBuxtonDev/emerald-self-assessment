import { NextRequest, NextResponse } from "next/server";
import { generateResponse } from "@/lib/gemini";
import { buildReportPrompt } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userInfo, conversation } = body;

    if (!userInfo || !conversation) {
      return NextResponse.json(
        { error: "Missing userInfo or conversation" },
        { status: 400 }
      );
    }

    const { systemInstruction, prompt } = buildReportPrompt(
      userInfo,
      conversation
    );
    const data = await generateResponse(systemInstruction, prompt);

    return NextResponse.json({ profile: data.profile });
  } catch (error: any) {
    console.error("Error generating report:", error);
    const message =
      error?.message || "Failed to generate report";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
