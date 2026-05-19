import type { UserInfo, Message } from "@/types";

const SYSTEM_GUARDRAILS = `You are a friendly mentor having a conversation about learning with a school student aged 12-16.
- Never ask about mental health, family, trauma, personal difficulties, or medical topics.
- If the student brings up something personal, gently redirect to a learning context.
- Keep language warm, encouraging, and age-appropriate.
- Focus on learning experiences: school, hobbies, group activities, projects, sports.
- Do not use clinical, diagnostic, or therapeutic language.
- This is a conversation, not an interrogation.`;

const FORMAT_GUIDE = `
You have three question formats:
- "open" — free text, good for conversational questions
- "scale" — 5-point agreement ("Not at all like me" → "Exactly like me"), use when you want a structured rating
- "choice" — multiple choice with 3-4 options, use when you want to narrow their focus

CRITICAL: NEVER include rating instructions or answer choices in the question text itself. The question text must be standalone — the UI handles displaying the scale labels or choice buttons separately.
BAD: "How often do you communicate your ideas? Rate this from Not at all like me to Exactly like me."
GOOD: "When working on a group project, how do you usually share your ideas with the team?"`;

const ATTRIBUTE_GUIDE = `You are probing 9 Learner Attributes. Aim for roughly 2 questions per attribute (about 20 total). When you have solid coverage across most attributes, signal "ready".

1. analytical-thinking — Can analyse data, extract critical information, and present outcomes systematically
2. creativity — Creates new possibilities, explores and experiments, connects ideas to produce worthwhile outcomes
3. curiosity — Asks questions, seeks knowledge, comfortable with uncertainty and ambiguity
4. mindful-agency — Aware of own thoughts/feelings/actions as a learner, takes responsibility, plans and manages learning
5. motivation — Intrinsically driven, purposeful, able to focus, optimistic
6. resilience — Perseveres, shows self-efficacy and independence while building positive bonds
7. community — Works with others, feels belonging, understands connection to effective learning
8. humanitarianism — Considers and acts inclusively for the betterment of society
9. operational-action — Interprets, processes, communicates and acts on information in various modes`;

const JSON_SCHEMA = `{
  "response": "optional conversational acknowledgment — acknowledge what they said before moving on. Use this to make it feel like a real conversation, not a quiz. Set to null if you have nothing to add and just want to ask the next question." | null,
  "question": {
    "id": "q_N",
    "text": "your question text here",
    "format": "open" | "scale" | "choice",
    "options": [{ "label": "...", "value": "..." }] | null,
    "capability": "analytical-thinking" | "creativity" | "curiosity" | "mindful-agency" | "motivation" | "resilience" | "community" | "humanitarianism" | "operational-action"
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

You ask DIRECTED questions that guide the student toward a specific attribute — not vague openers.

BAD example: "How often do you communicate your ideas? Rate this from Not at all like me to Exactly like me."
GOOD example (community): "You mentioned you play soccer. When your team's trying a new formation, how do you figure out where you're meant to be?"
GOOD example (analytical-thinking): "Think about the last time you got a test back in a subject you care about — what did you do after you saw your score?"
GOOD example (curiosity): "Your profile says you're into gaming. When you're stuck on a level, what's your approach — look up a guide, try different things, or take a break and come back?"

${FORMAT_GUIDE}

${ATTRIBUTE_GUIDE}

Pick one attribute and a concrete question that feels like a natural conversation, not a survey. Use "open" format by default — it keeps things conversational. Only use "scale" or "choice" when the student seems stuck or gave a very short answer.

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

The question MUST reference one of their interests and target a specific attribute. Make it conversational — "open" format by default. Only use "scale" or "choice" if you think they need structure.`,
    },
  ];
}

function buildSystemPrompt(isShortAnswer: boolean, aiCount: number): string {
  const shortHint = isShortAnswer
    ? "\nThe student gave a very short answer — try rephrasing as a more specific scenario or use 'choice'/'scale' format to help them."
    : "";

  const progressHint =
    aiCount < 9
      ? "You're still early. Keep moving across different attributes — don't dwell on one area."
      : aiCount < 15
        ? "You're building a picture. Target attributes you've asked about least."
        : "You're approaching readiness. Consider asking: 'I think I have a good picture now — is there anything else you'd like to add?' Then signal ready.";

  return `${SYSTEM_GUARDRAILS}

RULES:
1. Ask conversational questions about specific experiences — not surveys
2. Reference something the student already said to keep it conversational
3. Each question targets ONE attribute and explores something new${shortHint}
4. NEVER put rating instructions or answer choices in the question text — the question must stand alone

${FORMAT_GUIDE}

${ATTRIBUTE_GUIDE}

READY: Once questions >= 18, ALWAYS set "ready": true. Never exceed 25 without setting ready. Before signalling ready at ~15-17, ask the student: "Is there anything else you'd like to add before I wrap up?" This gives them a chance to add anything not yet covered.
COMPLETE: If questions >= 30, ALWAYS set "complete": true.

Progress: ${aiCount} questions asked so far. ${progressHint}

Return ONLY valid JSON:
${JSON_SCHEMA}`;
}

export function buildContinuationMessages(
  conversation: Message[]
): { role: "system" | "user" | "assistant"; content: string }[] {
  const conversationLog = conversation
    .map((m) => `${m.role === "ai" ? "Mentor" : "Student"}: ${m.text}`)
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

  const attrSummary = [
    "analytical-thinking",
    "creativity",
    "curiosity",
    "mindful-agency",
    "motivation",
    "resilience",
    "community",
    "humanitarianism",
    "operational-action",
  ]
    .map((a) => `- ${a}: ${capCounts[a] || 0}x`)
    .join("\n");

  return [
    {
      role: "system",
      content: buildSystemPrompt(isShortAnswer, aiCount),
    },
    {
      role: "user",
      content: `Here's the conversation so far. Keep your next question directed and specific.

${conversationLog}

Stats:
- Questions asked so far: ${aiCount}
- Last answer: "${lastAnswer}"${isShortAnswer ? " (Very short — try a different angle or use 'choice'/'scale')" : ""}
- Attributes covered:
${attrSummary}

Keep the conversation natural — ask about an attribute you haven't explored much yet. Around 15-17 questions, ask if they have anything else to add. Signal "ready" at 18+.`,
    },
  ];
}

export function buildAssistMessages(
  action: "explain" | "contextualise",
  context: string | null,
  question: { text: string; capability?: string },
  userInfo: UserInfo,
  conversation: Message[]
): { role: "system" | "user" | "assistant"; content: string }[] {
  const conversationLog = conversation
    .map((m) => `${m.role === "ai" ? "Mentor" : "Student"}: ${m.text}`)
    .join("\n\n");

  const baseContext = `Student info:
- Name: ${userInfo.name}
- Year: ${userInfo.yearLevel}
- Interests: ${userInfo.interests.join(", ") || "not specified"}
- Passions: ${userInfo.passions.join(", ") || "not specified"}

Conversation so far:
${conversationLog}`;

  if (action === "explain") {
    return [
      {
        role: "system",
        content: `${SYSTEM_GUARDRAILS}

${baseContext}

The student asked you to explain your last question. Provide a brief, simpler explanation of what you're asking. Do NOT change the question — just help them understand what you mean.

Return ONLY valid JSON:
{ "response": "your explanation here" }`,
      },
      {
        role: "user",
        content: `Please explain this question in simpler terms (1-3 sentences):
"${question.text}"`,
      },
    ];
  }

  if (action === "contextualise") {
    return [
      {
        role: "system",
        content: `${SYSTEM_GUARDRAILS}

${baseContext}

The student asked you to rephrase your question in a specific context. Keep the same learning attribute you were probing, but reframe the question to relate to their chosen context. Provide only the rephrased question — no extra text.

Return ONLY valid JSON:
{ "response": "the rephrased question here" }`,
      },
      {
        role: "user",
        content: `Please rephrase this question in the context of "${context}" (relate it to ${context}):
"${question.text}"

Provide only the rephrased question. Make it sound natural for someone interested in ${context}.`,
      },
    ];
  }

  return [];
}

export function buildReportMessages(
  userInfo: UserInfo,
  conversation: Message[]
): { role: "system" | "user" | "assistant"; content: string }[] {
  const conversationLog = conversation
    .filter((m) => m.text)
    .map((m) => `${m.role === "ai" ? "Mentor" : "Student"}: ${m.text}`)
    .join("\n");

  const interestsText = [userInfo.interests, userInfo.passions]
    .flat()
    .filter(Boolean)
    .join(", ") || "not specified";

  const studentAnswers = conversation.filter((m) => m.role === "user");
  const shortAnswers = studentAnswers.filter((a) => a.text.split(" ").length < 5).length;
  const dontKnowAnswers = studentAnswers.filter((a) =>
    /i don'?t know|idk|not sure|no idea/i.test(a.text)
  ).length;
  const engagementNote =
    shortAnswers > studentAnswers.length * 0.5
      ? `Note: The student gave short answers (under 5 words) to ${shortAnswers}/${studentAnswers.length} questions, and said "I don't know" ${dontKnowAnswers} times. This suggests limited engagement — reflect this honestly in the profile. If they didn't engage deeply, say so constructively rather than inventing strengths.`
      : "";

  return [
    {
      role: "system",
      content: `You are a mentor writing an honest, constructive Learner Profile for a student. This is NOT a test report — and it is NOT a participation trophy. Be direct about what the student's answers reveal or don't reveal.

The profile should assess the student across these 9 Learner Attributes:
1. Analytical Thinking — systematic analysis and presentation
2. Creativity — exploring, experimenting, connecting ideas
3. Curiosity — questioning, seeking knowledge, comfort with ambiguity
4. Mindful Agency — self-awareness, responsibility, planning learning
5. Motivation — intrinsic drive, focus, optimism
6. Resilience — perseverance, self-efficacy, independence
7. Community — collaboration, belonging, connection to learning
8. Humanitarianism — inclusivity, acting for societal betterment
9. Operational Action — interpreting and acting on information

RULES (critical):
- NO scores, NO levels, NO rubric language
- BE HONEST: If the student gave shallow answers or said "I don't know" repeatedly, say so. Frame it as a starting point, not a flaw.
- DO NOT restate or reword what the student said. That's not a profile — that's a transcript. Synthesise BIGGER TRUTHS across multiple answers.
- Look for patterns across the conversation. If they consistently described trying things on their own before asking for help across multiple scenarios, say "You tend to learn by experimenting independently" NOT "You said you try things on your own when stuck on a level."
- DO NOT treat hypothetical/leading questions as evidence of student behaviour. If you asked "If you had to break down a problem..." and they said "yes", that does not mean they actually break down problems in real life. Only draw conclusions from what the student VOLUNTEERED about their actual experiences.
- If there isn't enough evidence for a genuine pattern, say "There wasn't enough conversation to assess this yet" rather than inventing a conclusion.
- Write in second person ("you") for student sections — but don't reference specific answers. Write at a higher level: "You tend to learn best when..." not "You said that when you play soccer..."
- The narrative, strengths, interestsConnection, and challenge sections should all speak to the student at an abstract level about who they are as a learner and where they could grow — not recount the conversation.
- Every next step must be constructive and encouraging but not flattering
- The challenge should be one concrete thing to try this week
- teacherSuggestions provides practical classroom strategies per attribute — write in third person about "this student"
- nextSteps should be GENERAL (e.g. "Try to engage in more collaborative projects") NOT hyper-specific (e.g. "Try to doodle more in science class")
- Do NOT reference specific subjects or curriculum content (e.g., "in science class", "during history", "in a biology project"). Focus on learning behaviours, patterns, and approaches — not what subject they were studying.

Return ONLY valid JSON:
{
  "profile": {
    "studentName": "${userInfo.name}",
    "dateGenerated": "${new Date().toISOString().split("T")[0]}",
    "narrative": "5-6 sentence overview of who they are as a learner — patterns, tendencies, and where they have room to grow. Do not reference specific questions or answers.",
    "themes": [
      {
        "name": "Analytical Thinking" | "Creativity" | "Curiosity" | "Mindful Agency" | "Motivation" | "Resilience" | "Community" | "Humanitarianism" | "Operational Action",
        "strength": "What the conversation reveals about their tendency in this area (synthesised from multiple answers, not a single quote)",
        "growth": "Where they could develop within this attribute, based on gaps in the conversation"
      }
    ],
    "strengths": [
      { "title": "Short strength label", "narrative": "3-4 sentences about a genuine pattern observed across the conversation — not restating one answer" }
    ],
    "nextSteps": ["general suggestion 1", "general suggestion 2", "general suggestion 3", "general suggestion 4", "general suggestion 5"],
    "interestsConnection": "How their interests connect to their learning — written at an abstract level about motivation and engagement, not recounting Q&As",
    "challenge": "One specific thing to try this week that ties together multiple attributes",
    "teacherSuggestions": [
      {
        "attribute": "Analytical Thinking",
        "strategies": ["2-3 practical classroom strategies this student's teacher could use to support their growth in this area"]
      },
      {
        "attribute": "Creativity",
        "strategies": ["2-3 practical classroom strategies"]
      },
      {
        "attribute": "Curiosity",
        "strategies": ["2-3 practical classroom strategies"]
      },
      {
        "attribute": "Mindful Agency",
        "strategies": ["2-3 practical classroom strategies"]
      },
      {
        "attribute": "Motivation",
        "strategies": ["2-3 practical classroom strategies"]
      },
      {
        "attribute": "Resilience",
        "strategies": ["2-3 practical classroom strategies"]
      },
      {
        "attribute": "Community",
        "strategies": ["2-3 practical classroom strategies"]
      },
      {
        "attribute": "Humanitarianism",
        "strategies": ["2-3 practical classroom strategies"]
      },
      {
        "attribute": "Operational Action",
        "strategies": ["2-3 practical classroom strategies"]
      }
    ]
  }
}`,
    },
    {
      role: "user",
      content: `Write an honest, synthesised Learner Profile for this student. Do NOT reword the conversation — identify patterns and bigger truths.

Student: ${userInfo.name}
Year: ${userInfo.yearLevel}
Year level: ${userInfo.yearLevel}
Interests and passions: ${interestsText}
Self-description: ${userInfo.selfDescription || "not specified"}

Full conversation:
${conversationLog}

${engagementNote}
Cover every attribute the conversation gives insight into. If coverage was light, say so honestly — don't fabricate patterns. nextSteps should be general strategies (e.g. "Try to engage in more collaborative projects to build teamwork skills") not hyper-specific tasks. Write teacherSuggestions for ALL 9 attributes — keep strategies general enough to apply across subjects.`,
    },
  ];
}
