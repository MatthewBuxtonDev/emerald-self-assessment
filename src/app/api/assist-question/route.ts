import { NextRequest, NextResponse } from "next/server";
import { generateResponse } from "@/lib/mistral";
import { buildAssistMessages } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, context, question, userInfo, conversation } = body;

    if (!action || !question || !userInfo || !conversation) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const messages = buildAssistMessages(action, context, question, userInfo, conversation);
    const data = await generateResponse(messages);

    return NextResponse.json({ response: data.response });
  } catch (error: any) {
    console.error("Error assisting question:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to assist" },
      { status: 502 }
    );
  }
}
