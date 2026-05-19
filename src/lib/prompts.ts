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

const THEME_GUIDE = `Probe each theme deeply from multiple angles:

1. Working with Others — explore: communication, collaboration, conflict resolution, perspective-taking, leadership, teamwork
2. Thinking about Learning — explore: reflection, goal-setting, self-awareness, growth mindset, seeking and using feedback
3. Taking Action — explore: initiative, persistence, adaptability, problem-solving, planning, organisation

For each theme, ask about DIFFERENT aspects over multiple questions. Don't just scratch the surface — explore how they handle different situations within each theme.`;

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

${THEME_GUIDE}

You'll be asking many questions across all three themes, so start with one area and branch out from there.

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

function buildSystemPrompt(isShortAnswer: boolean, aiCount: number): string {
  const shortHint = isShortAnswer
    ? "\nThe student gave a very short answer — consider using 'scale' or 'choice' format to make it easier."
    : "";

  const progressHint =
    aiCount < 7
      ? "You're still early in the conversation. Keep probing different aspects."
      : aiCount < 15
        ? "You're building a picture. Make sure each theme has coverage across multiple angles."
        : "You should have solid coverage by now. Only signal ready if you've explored each theme thoroughly across at least 2-3 different angles each.";

  return `${SYSTEM_GUARDRAILS}

RULES:
1. Ask about a SPECIFIC experience — not "how do you learn" but "tell me about a time when..."
2. Reference something the student already said to make it conversational
3. Each question should explore a new angle — don't repeat the same aspect${shortHint}

${FORMAT_GUIDE}

${THEME_GUIDE}

READY: set "ready": true ONLY when you have built a holistic picture — aim for around 20 questions, roughly 6-7 per theme. Only signal ready when you have depth across all three themes.
COMPLETE: set "complete": true only if the conversation has gone very long (30+ questions) or the student is clearly disengaged.

Progress: ${aiCount} questions asked so far. ${progressHint}

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
      content: buildSystemPrompt(isShortAnswer, aiCount),
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

If you have enough depth across all themes (aim for around 20 questions total, roughly 6-7 per theme), set "ready": true. Only set "complete": true if the conversation is very long (30+) or the student is disengaged.`,
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
      content: `You are a mentor writing a detailed, holistic Learner Profile for a student. This is NOT a test report.

The profile should cover all three learning themes in depth:
1. Working with Others — how they collaborate, communicate, handle different perspectives, resolve conflicts
2. Thinking about Learning — how they reflect, set goals, seek feedback, understand themselves as learners
3. Taking Action — their initiative, persistence, adaptability, problem-solving approach

RULES (critical):
- NO scores, NO levels, NO rubric language
- Write in second person ("you")
- Reference specific things the student said to ground each observation
- Every section should identify a strength AND suggest an area to build on
- Every next step must be specific, positive, and actionable
- The challenge should be one concrete thing to try this week

Return ONLY valid JSON:
{
  "profile": {
    "studentName": "${userInfo.name}",
    "dateGenerated": "${new Date().toISOString().split("T")[0]}",
    "narrative": "3-4 sentence warm summary of how they learn, covering all three themes",
    "themes": [
      {
        "name": "Working with Others" | "Thinking about Learning" | "Taking Action",
        "strength": "What they do well in this area, referencing something they said",
        "growth": "A specific area to develop within this theme"
      }
    ],
    "strengths": [
      { "title": "Short strength label", "narrative": "2-3 sentences referencing what they shared" }
    ],
    "nextSteps": ["specific suggestion 1", "specific suggestion 2", "specific suggestion 3"],
    "interestsConnection": "How their passions connect to their learning journey across all themes",
    "challenge": "One specific thing to try this week that ties together multiple themes"
  }
}`,
    },
    {
      role: "user",
      content: `Write a detailed, holistic Learner Profile for this student based on their full conversation.

Student: ${userInfo.name}
Year: ${userInfo.yearLevel}
Interests: ${userInfo.interests.join(", ") || "not specified"}
Passions: ${userInfo.passions.join(", ") || "not specified"}

Full conversation:
${conversationLog}

Cover all three themes in depth. Reference specific things they said.`,
    },
  ];
}
