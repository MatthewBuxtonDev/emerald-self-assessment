import type { UserInfo, Message } from "@/types";

const SYSTEM_GUARDRAILS = `You are a friendly mentor having a conversation about learning with a school student aged 12-16.
- Never ask about mental health, family, trauma, personal difficulties, or medical topics.
- If the student brings up something personal, gently redirect to a learning context.
- Keep language warm, encouraging, and age-appropriate.
- Focus on learning experiences: school, hobbies, group activities, projects, sports.
- Do not use clinical, diagnostic, or therapeutic language.
- This is a conversation, not an interrogation.`;

const FORMAT_GUIDE = `
You have three question formats available — use whichever best fits this student right now:

- "open" — free text, good when they're engaged and have things to say
- "scale" — 5-point agreement ("Not at all like me" → "Exactly like me"), good when they seem unsure or are giving short answers
- "choice" — multiple choice with 3-4 options, good for giving structure or when they said "I don't know"`;

const JSON_SCHEMA = `{
  "question": {
    "id": "q_N",
    "text": "your question text here",
    "format": "open" | "scale" | "choice",
    "options": [{ "label": "...", "value": "..." }] | null,
    "capability": "collaboration" | "metacognition" | "agency"
  } | null,
  "ready": true | false,
  "complete": true | false
}`;

export function buildFirstQuestionMessages(userInfo: UserInfo): {
  role: "system" | "user" | "assistant";
  content: string;
}[] {
  return [
    {
      role: "system",
      content: `${SYSTEM_GUARDRAILS}

Ask a VERY SPECIFIC, CONCRETE question — not abstract or vague.
BAD example: "How do you approach learning?"
GOOD example: "You said you're into soccer. When your team is learning a new drill, how do you figure out what to do?"

${FORMAT_GUIDE}

Return ONLY valid JSON:
${JSON_SCHEMA}`,
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

function buildSystemPrompt(isShortAnswer: boolean): string {
  const shortHint = isShortAnswer
    ? "\nThe student gave a very short answer — consider using 'scale' or 'choice' format to make it easier."
    : "";

  return `${SYSTEM_GUARDRAILS}

RULES:
1. Ask about a SPECIFIC experience — not "how do you learn" but "tell me about a time when..."
2. Reference something the student already said
3. Each question should cover something new — don't repeat the same topic${shortHint}

${FORMAT_GUIDE}

READY: set "ready": true when you have enough info (around 4-6 questions, 1-2 answers per theme). This shows a "Finish" button.
COMPLETE: set "complete": true only if you truly can't ask more or it's gone too long (8+ questions).

Return ONLY valid JSON:
${JSON_SCHEMA}`;
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

  const capCounts: Record<string, number> = {};
  for (const m of conversation) {
    if (m.capability) capCounts[m.capability] = (capCounts[m.capability] || 0) + 1;
  }

  return [
    {
      role: "system",
      content: buildSystemPrompt(isShortAnswer),
    },
    {
      role: "user",
      content: `Here's the conversation so far. Keep your next question concrete and different from what came before.

${conversationLog}

Stats:
- Questions asked so far: ${aiCount}
- Last answer: "${lastAnswer}"${isShortAnswer ? " (Very short — use scale or choice format)" : ""}
- Working with Others: ${capCounts["collaboration"] || 0}x
- Thinking about Learning: ${capCounts["metacognition"] || 0}x
- Taking Action: ${capCounts["agency"] || 0}x

If you have enough info (around 4-6 questions), set "ready": true. Only set "complete": true if you cannot ask anything else useful.`,
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
