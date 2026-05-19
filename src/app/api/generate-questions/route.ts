import { NextRequest, NextResponse } from "next/server";
import { generateResponse } from "@/lib/gemini";
import { buildFirstQuestionPrompt } from "@/lib/prompts";
import { UserInfoSchema } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = UserInfoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid user info", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { systemInstruction, prompt } = buildFirstQuestionPrompt(parsed.data);
    const data = await generateResponse(systemInstruction, prompt);

    return NextResponse.json({
      question: data.question,
    });
  } catch (error) {
    console.error("Error generating questions:", error);
    return NextResponse.json(
      { error: "Failed to generate questions" },
      { status: 502 }
    );
  }
}
