import type { UserInfo, Message } from "@/types";

const SYSTEM_GUARDRAILS = `You are a friendly mentor having a conversation about learning with a school student aged 12-16.
- Never ask about mental health, family, trauma, personal difficulties, or medical topics.
- If the student brings up something personal, gently redirect to a learning context.
- Keep language warm, encouraging, and age-appropriate.
- Focus on learning experiences: school, hobbies, group activities, projects, sports.
- Do not use clinical, diagnostic, or therapeutic language.
- This is a conversation, not an interrogation.`;

export function buildFirstQuestionPrompt(userInfo: UserInfo): {
  systemInstruction: string;
  prompt: string;
} {
  return {
    systemInstruction: SYSTEM_GUARDRAILS,
    prompt: `Generate the first question to start a conversation about learning with a student.

Student profile:
- Name: ${userInfo.name}
- Year: ${userInfo.yearLevel}
- Interests: ${userInfo.interests.join(", ") || "not specified"}
- Passions: ${userInfo.passions.join(", ") || "not specified"}
- Self-description: ${userInfo.selfDescription || "not specified"}

The question should:
- Reference one of their interests or passions to build rapport
- Be open-ended and encourage reflection
- Target one of three learning themes: Working with Others (collaboration), Thinking about Learning (reflection), or Taking Action (initiative)
- Feel like a curious mentor asking, not a test

Return JSON:
{
  "question": {
    "id": "q_1",
    "text": "the question text",
    "format": "open",
    "capability": "collaboration" | "metacognition" | "agency"
  }
}`,
  };
}

export function buildContinuationPrompt(
  conversation: Message[]
): { systemInstruction: string; prompt: string } {
  const conversationLog = conversation
    .map((m) => `${m.role === "ai" ? "Mentor" : "Student"}: ${m.text}`)
    .join("\n");

  const capCounts: Record<string, number> = {};
  for (const m of conversation) {
    if (m.capability) {
      capCounts[m.capability] = (capCounts[m.capability] || 0) + 1;
    }
  }

  return {
    systemInstruction: SYSTEM_GUARDRAILS,
    prompt: `Here is the conversation so far between a mentor and a student:

${conversationLog}

Conversation depth per theme:
- Working with Others: ${capCounts["collaboration"] || 0} exchanges
- Thinking about Learning: ${capCounts["metacognition"] || 0} exchanges
- Taking Action: ${capCounts["agency"] || 0} exchanges

Generate the next question. Choose a theme that needs more coverage.
The question should:
- Build on what the student just said
- Feel like a natural continuation
- Be personalised to the student's interests and previous answers
- Use whatever format suits this moment (open-ended, scenario, reflection)

If each theme has at least 3 substantive exchanges OR total exchanges reach 15, set "complete": true.

Return JSON:
{
  "question": {
    "id": "q_N",
    "text": "the question text",
    "format": "open",
    "capability": "collaboration" | "metacognition" | "agency"
  } | null,
  "complete": false | true
}`,
  };
}

export function buildReportPrompt(
  userInfo: UserInfo,
  conversation: Message[]
): { systemInstruction: string; prompt: string } {
  const conversationLog = conversation
    .map((m) => `${m.role === "ai" ? "Mentor" : "Student"}: ${m.text}`)
    .join("\n");

  return {
    systemInstruction: `You are a mentor writing a constructive Learner Profile for a student. This is NOT a test report.

RULES (critical):
- NO scores, NO levels, NO rubric language (do not use: beginning, developing, proficient, advanced, score, rating, level)
- NO clinical or diagnostic language
- Write in second person ("you")
- Reference specific things the student said to show you listened
- Every strength should describe what they do well and why it matters
- Every next step should be specific, positive, and actionable
- The challenge should be one concrete thing to try in the coming days`,
    prompt: `Write a Learner Profile for this student based on their conversation.

Student: ${userInfo.name}
Year: ${userInfo.yearLevel}
Interests: ${userInfo.interests.join(", ") || "not specified"}
Passions: ${userInfo.passions.join(", ") || "not specified"}

Full conversation:
${conversationLog}

Return JSON:
{
  "profile": {
    "studentName": "${userInfo.name}",
    "dateGenerated": "${new Date().toISOString().split("T")[0]}",
    "narrative": "2-3 sentence warm summary of how they learn",
    "strengths": [
      { "title": "Short strength label", "narrative": "2-3 sentence explanation referencing what they shared" }
    ],
    "nextSteps": ["specific suggestion 1", "specific suggestion 2", "specific suggestion 3"],
    "interestsConnection": "How their passions connect to their learning journey",
    "challenge": "One specific thing to try this week"
  }
}`,
  };
}
