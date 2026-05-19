import { NextRequest, NextResponse } from "next/server";
import { generateResponse } from "@/lib/groq";
import { buildReportMessages } from "@/lib/prompts";

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

    const messages = buildReportMessages(userInfo, conversation);
    const data = await generateResponse(messages);

    return NextResponse.json({ profile: data.profile });
  } catch (error: any) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate report" },
      { status: 502 }
    );
  }
}
