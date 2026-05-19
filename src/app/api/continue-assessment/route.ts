import { NextRequest, NextResponse } from "next/server";
import { generateResponse } from "@/lib/gemini";
import { buildContinuationPrompt } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversation } = body;

    if (!conversation || !Array.isArray(conversation)) {
      return NextResponse.json(
        { error: "Invalid conversation data" },
        { status: 400 }
      );
    }

    const { systemInstruction, prompt } = buildContinuationPrompt(conversation);
    const data = await generateResponse(systemInstruction, prompt);

    return NextResponse.json({
      question: data.question || null,
      complete: data.complete || false,
    });
  } catch (error: any) {
    console.error("Error continuing assessment:", error);
    const message =
      error?.message || "Failed to continue assessment";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
