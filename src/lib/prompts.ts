import type { UserInfo, Message } from "@/types";

const SYSTEM_GUARDRAILS = `You are a friendly mentor having a conversation about learning with a school student aged 12-16.
- Never ask about mental health, family, trauma, personal difficulties, or medical topics.
- If the student brings up something personal, gently redirect to a learning context.
- Keep language warm, encouraging, and age-appropriate.
- Focus on learning experiences: school, hobbies, group activities, projects, sports.
- Do not use clinical, diagnostic, or therapeutic language.
- This is a conversation, not an interrogation.`;

const CONCRETE_QUESTION_TYPES = [
  "Tell me about a time when... (ask about a specific experience)",
  "What do you think about... (ask for their opinion on something) How does that affect your learning?",
  "Imagine you're [specific scenario related to their interest]. What would you do?",
  "What's something you found tricky recently? How did you handle it?",
  "You mentioned [interest]. How do you go about getting better at it?",
  "When you work on a group project, what part do you usually take on?",
];

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

Pick ONE of these question types:
1. "Tell me about a time when..." — ask about a specific experience
2. "You mentioned [interest]. How do you go about getting better at it?"
3. "What's something you found tricky recently? How did you handle it?"

Return ONLY valid JSON:
{
  "question": {
    "id": "q_1",
    "text": "your concrete question here",
    "format": "open",
    "capability": "collaboration" | "metacognition" | "agency"
  }
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

The question MUST reference one of their interests and be about a REAL, SPECIFIC situation they have experienced. Make it easy for them to answer.`,
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

  return [
    {
      role: "system",
      content: `${SYSTEM_GUARDRAILS}

RULES FOR GOOD QUESTIONS:
1. Ask about a SPECIFIC experience or situation — not "how do you learn" but "tell me about a time when..."
2. Reference something the student already said to make it feel like a real conversation
3. Each question must be DIFFERENT from previous ones — don't repeat the same structure
4. If the student gave a short answer ("I don't know", "yes", "maybe", one word), ASK A DIFFERENT TYPE of question entirely. Pivot to a new topic. Don't push harder on the same subject.

Question types to rotate through (PICK A DIFFERENT ONE each time):
- "Tell me about a time when..." (specific experience)
- "What do you think about..." + "How does that affect your learning?"
- "What's something you found tricky recently? How did you handle it?"
- Scenario linked to their interest: "Imagine you're [situation], what would you do?"
- "When you [activity], what part do you enjoy most?"

COMPLETION: Set "complete": true if ANY of these are true:
- You've asked at least 6 questions total
- OR the student has given 2+ answers per theme
- OR the student seems disengaged (short answers)
- It's better to finish early than to drag on.

Return JSON:
{
  "question": {
    "id": "q_N",
    "text": "your concrete question",
    "format": "open",
    "capability": "collaboration" | "metacognition" | "agency"
  } | null,
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
- Answer last student gave: "${lastAnswer}"${isShortAnswer ? " (This was very short. Pivot to a different topic.)" : ""}
- Working with Others covered: ${capCounts["collaboration"] || 0}x
- Thinking about Learning covered: ${capCounts["metacognition"] || 0}x
- Taking Action covered: ${capCounts["agency"] || 0}x

Remember: ask about a SPECIFIC experience. If you have enough info, set "complete": true.`,
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
