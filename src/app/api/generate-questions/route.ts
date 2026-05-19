import { NextRequest, NextResponse } from "next/server";
import { generateResponse } from "@/lib/mistral";
import { buildFirstQuestionMessages } from "@/lib/prompts";
import { UserInfoSchema } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = UserInfoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid user info" }, { status: 400 });
    }

    const messages = buildFirstQuestionMessages(parsed.data);
    const data = await generateResponse(messages);

    return NextResponse.json({ question: data.question });
  } catch (error: any) {
    console.error("Error generating questions:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate questions" },
      { status: 502 }
    );
  }
}
