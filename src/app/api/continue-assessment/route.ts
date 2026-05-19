import { NextRequest, NextResponse } from "next/server";
import { generateResponse } from "@/lib/mistral";
import { buildContinuationMessages } from "@/lib/prompts";

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

    const messages = buildContinuationMessages(conversation);
    const data = await generateResponse(messages);

    return NextResponse.json({
      question: data.question || null,
      response: data.response || null,
      ready: data.ready || false,
      complete: data.complete || false,
    });
  } catch (error: any) {
    console.error("Error continuing assessment:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to continue assessment" },
      { status: 502 }
    );
  }
}
