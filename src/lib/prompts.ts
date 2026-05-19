import type { UserInfo, Message } from "@/types";

const SYSTEM_GUARDRAILS = `You are a friendly mentor having a conversation about learning with a school student aged 12-16.
- Never ask about mental health, family, trauma, personal difficulties, or medical topics.
- If the student brings up something personal, gently redirect to a learning context.
- Keep language warm, encouraging, and age-appropriate.
- Focus on learning experiences: school, hobbies, group activities, projects, sports.
- Do not use clinical, diagnostic, or therapeutic language.
- This is a conversation, not an interrogation.`;

const QUESTIONS_ABOUT_FORMATS = `
You can choose from THREE question formats. Pick whichever suits the moment:

1. "open" — free text answer. Use when the student seems engaged and able to write a response.
2. "scale" — a 5-point agreement scale. Use when the student seems unsure, gives short answers, or you want to make it easy for them. Always use these 5 labels:
   ["Not at all like me", "A little like me", "Somewhat like me", "A lot like me", "Exactly like me"]
3. "choice" — multiple choice with 3-4 options. Use when you want to give structure, or the student said "I don't know" last time.

Rotate formats — don't use the same format twice in a row.`;

const QUESTION_FORMAT_JSON = `
For "scale" format:
{ "id": "q_N", "text": "question text", "format": "scale", "options": [{ "label": "Not at all like me", "value": "1" }, ...], "capability": "..." }

For "choice" format:
{ "id": "q_N", "text": "question text", "format": "choice", "options": [{ "label": "Option A", "value": "a" }, ...], "capability": "..." }

For "open" format:
{ "id": "q_N", "text": "question text", "format": "open", "capability": "..." }`;

export function buildFirstQuestionMessages(userInfo: UserInfo): {
  role: "system" | "user" | "assistant";
  content: string;
}[] {
  return [
    {
      role: "system",
      content: `${SYSTEM_GUARDRAILS}

CRITICAL: Ask a VERY SPECIFIC, CONCRETE question — not abstract or vague.
BAD example: "How do you approach learning?"
GOOD example: "You said you're into soccer. When your team is learning a new drill, how do you figure out what to do?"

${QUESTIONS_ABOUT_FORMATS}

Pick ONE concrete question. The format can be "open", "scale", or "choice" — whichever you think this student will find easiest to answer on the first go.

For "scale" questions, the text should be a statement they agree/disagree with (e.g. "When I'm stuck on something, I usually try a different approach").

Return ONLY valid JSON:
{
  "question": ${QUESTION_FORMAT_JSON}
}`,
    },
    {
      role: "user",
      content: `Generate the first question for this student.

Student:
- Name: ${userInfo.name}
- Year: ${userInfo.yearLevel}
- Interests: ${userInfo.interests.join(", ") || "not specified"}
- Passions: ${userInfo.passions.join(", ") || "not specified"}
- Self-description: ${userInfo.selfDescription || "not specified"}

The question MUST reference one of their interests and be about a REAL, SPECIFIC situation they have experienced. Make it easy for them to answer. Pick the best format for this student.`,
    },
  ];
}

export function buildContinuationMessages(
  conversation: Message[]
): { role: "system" | "user" | "assistant"; content: string }[] {
  const conversationLog = conversation
    .map((m) => `Mentor: ${m.text}`)
    .join("\n\n");

  const lastAnswer = conversation
    .filter((m) => m.role === "user")
    .pop()?.text || "";
  const isShortAnswer = lastAnswer.split(" ").length < 5;
  const aiCount = conversation.filter((m) => m.role === "ai").length;
  const totalExchanges = conversation.filter((m) => m.role === "user").length;

  const capCounts: Record<string, number> = {};
  for (const m of conversation) {
    if (m.capability) capCounts[m.capability] = (capCounts[m.capability] || 0) + 1;
  }

  // Find which format was used last
  const lastAiMsg = [...conversation].reverse().find((m) => m.role === "ai");
  const lastFormat = lastAiMsg?.format;
  const usedFormats = conversation.filter((m) => m.role === "ai").map((m) => m.format);

  return [
    {
      role: "system",
      content: `${SYSTEM_GUARDRAILS}

RULES FOR GOOD QUESTIONS:
1. Ask about a SPECIFIC experience or situation — not "how do you learn" but "tell me about a time when..."
2. Reference something the student already said to make it feel like a real conversation
3. Each question must be DIFFERENT from previous ones — don't repeat the same structure
4. If the student gave a short answer ("I don't know", "yes", "maybe", one word), ASK A DIFFERENT FORMAT. For short answers, switch to a "scale" or "choice" format — they're easier to answer. Don't push harder on the same subject.

${QUESTIONS_ABOUT_FORMATS}

Last format used: "${lastFormat || "none"}" — do NOT use the same format twice in a row.

${QUESTION_FORMAT_JSON}

COMPLETION: Set "complete": true if ANY:
- You've asked at least 6 questions total
- OR the student has given 2+ answers per theme
- OR the student seems disengaged (short answers)
- Better to finish early than drag on.

Return JSON:
{
  "question": ${QUESTION_FORMAT_JSON.replace(/\n/g, "\n  ")} | null,
  "complete": true | false
}`,
    },
    {
      role: "user",
      content: `Here's the conversation so far. Keep your next question concrete and different from what came before.

${conversationLog}

Stats:
- Questions asked so far: ${aiCount}
- Student answers given: ${totalExchanges}
- Answer last student gave: "${lastAnswer}"${isShortAnswer ? " (Very short — use a scale or choice format this time.)" : ""}
- Last format used: "${lastFormat}"${usedFormats.length > 1 ? ` (Formats used: ${usedFormats.join(", ")})` : ""}
- Working with Others covered: ${capCounts["collaboration"] || 0}x
- Thinking about Learning covered: ${capCounts["metacognition"] || 0}x
- Taking Action covered: ${capCounts["agency"] || 0}x

Remember: if the student gave a short answer, switch to scale or choice format. If you have enough info, set "complete": true.`,
    },
  ];
}

export function buildReportMessages(
  userInfo: UserInfo,
  conversation: Message[]
): { role: "system" | "user" | "assistant"; content: string }[] {
  const conversationLog = conversation
    .filter((m) => m.text)
    .map((m) => `${m.role === "ai" ? "Mentor" : "Student"}: ${m.text}`)
    .join("\n");

  return [
    {
      role: "system",
      content: `You are a mentor writing a constructive Learner Profile for a student. This is NOT a test report.

RULES (critical):
- NO scores, NO levels, NO rubric language
- Write in second person ("you")
- Reference specific things the student said
- Every next step must be specific, positive, and actionable

Return ONLY valid JSON:
{
  "profile": {
    "studentName": "${userInfo.name}",
    "dateGenerated": "${new Date().toISOString().split("T")[0]}",
    "narrative": "2-3 sentence warm summary of how they learn",
    "strengths": [
      { "title": "Short label", "narrative": "2-3 sentences referencing what they shared" }
    ],
    "nextSteps": ["specific suggestion 1", "specific suggestion 2", "specific suggestion 3"],
    "interestsConnection": "How their passions connect to their learning journey",
    "challenge": "One specific thing to try this week"
  }
}`,
    },
    {
      role: "user",
      content: `Write a Learner Profile for this student.

Student: ${userInfo.name}
Year: ${userInfo.yearLevel}
Interests: ${userInfo.interests.join(", ") || "not specified"}
Passions: ${userInfo.passions.join(", ") || "not specified"}

Conversation:
${conversationLog}`,
    },
  ];
}
