# Next-Generation Learning Platform — Project Plan

> **Platform codename:** Ruby  
> **Sponsors:** The Australian Learning Lecture, The University of Melbourne, Australian Secondary Principals' Association (ASPA)  
> **Version:** 1.0  
> **Status:** MVP development

---

## 1. Vision

A single-session, no-account-required web application where a student has an AI-guided conversation about their learning capabilities, then receives a constructive, personalised Learner Profile (on-screen + PDF download). No databases, no user accounts, no school infrastructure — every visit is a fresh session.

---

## 2. User Flow

```
Landing Page (/)
  → About You (/about-you) : name, year level, interests, passions
    → Conversational Assessment (/assessment) : chat-like, AI adapts each question
      → Learner Profile (/report) : on-screen constructive report
        → Download PDF
```

---

## 3. Core Philosophy

- **A mentor conversation, not a test** — the AI talks with the student about how they learn, then gives them constructive, personalised feedback.
- **No scores, no levels, no rubrics** — the report identifies strengths and suggests next steps. No "Beginning/Developing/Proficient/Advanced" labels.
- **Dynamic adaptation** — each question is generated based on the full conversation so far. The AI chooses the format (open-ended, scenario, scaled, reflective) that best fits the moment.
- **No personal overreach** — no questions about mental health, family, trauma, or personal difficulties. Focus stays on learning experiences.
- **Strengths-based** — the conversation and report focus on what the student does well and how to build on it.

---

## 4. Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Framework** | Next.js 14+ (App Router) | Full-stack, Vercel-native, API routes |
| **Language** | TypeScript (strict) | Type safety |
| **Styling** | Tailwind CSS + shadcn/ui | Accessible, fast, consistent design |
| **AI** | Google Gemini API | Dynamic question generation + report synthesis |
| **Charts** | Recharts | Optional visual elements for report |
| **PDF** | Client-side (html2canvas + jsPDF) | Avoid serverless timeout issues |
| **Hosting** | Vercel (Hobby tier) | No DB needed |
| **State** | React context + sessionStorage | Ephemeral, resists refresh |
| **Validation** | Zod | Runtime type safety |
| **Data fetching** | SWR | Loading/error states |

---

## 5. API Architecture

| Route | Method | Input | Output |
|-------|--------|-------|--------|
| `/api/generate-questions` | POST | `{ userInfo }` | `{ firstQuestion }` |
| `/api/continue-assessment` | POST | `{ conversation: Message[] }` | `{ nextQuestion }` or `{ complete: true }` |
| `/api/generate-report` | POST | `{ userInfo, conversation: Message[] }` | `{ profile: LearnerProfile }` |

The `/api/continue-assessment` endpoint receives the full conversation history and returns either the next question or a signal that enough data has been collected.

---

## 6. Capabilities (Conversation Themes)

The AI structures the conversation around three themes but does not assign scores to them:

| Theme | What It Covers |
|-------|---------------|
| **Working with Others** | Collaboration, communication, teamwork experiences |
| **Thinking about Learning** | Reflection, goal-setting, self-awareness |
| **Taking Action** | Initiative, persistence, trying new things |

The AI tracks coverage and signals completion when each theme has sufficient depth (~3+ substantive exchanges each, ~9-12 total exchanges max).

---

## 7. Learner Profile Contents

The report is constructive and forward-looking, not evaluative:

```
YOUR LEARNER PROFILE
[Name] · [Date]

A brief, warm narrative about how you learn.

YOUR STRENGTHS
● Strength 1 — description referencing what was shared
● Strength 2 — description referencing what was shared
● Strength 3 — description referencing what was shared

IDEAS FOR YOUR NEXT STEPS
1. Specific, actionable suggestion
2. Specific, actionable suggestion
3. Specific, actionable suggestion

YOUR INTERESTS & LEARNING
How their passions connect to their growth.

A CHALLENGE FOR YOU
One thing to try in the next week.
```

No scores, no levels, no diagnostic language. Forward-looking and helpful.

---

## 8. Project Structure

```
next-generation-learning/
├── .env.local                    # GEMINI_API_KEY
├── PROJECT_PLAN.md               # This file
├── DOCUMENTATION.md              # Full technical reference
├── AGENTS.md                     # AI session instructions
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Root layout + providers
│   │   ├── page.tsx              # Landing page
│   │   ├── about-you/page.tsx    # Onboarding form
│   │   ├── assessment/page.tsx   # Chat-like assessment
│   │   ├── report/page.tsx       # Learner profile report
│   │   └── api/
│   │       ├── generate-questions/route.ts
│   │       ├── continue-assessment/route.ts
│   │       └── generate-report/route.ts
│   ├── components/
│   │   ├── ui/                   # shadcn/ui primitives
│   │   └── features/
│   │       ├── landing/          # Landing page components
│   │       ├── onboarding/       # Form components
│   │       ├── assessment/       # Chat interface components
│   │       └── report/           # Profile display components
│   ├── lib/
│   │   ├── gemini.ts             # Gemini API client
│   │   ├── prompts.ts            # Prompt templates
│   │   └── utils.ts              # Utilities
│   ├── hooks/                    # React hooks
│   ├── providers/                # Context providers
│   └── types/index.ts            # All types + Zod schemas
└── docs/                         # Future reference docs
```

---

## 9. Development Phases

### Phase 1 — Foundation
- [ ] Project scaffold with Tailwind + shadcn/ui
- [ ] TypeScript types and Zod schemas
- [ ] Gemini API client + prompt templates
- [ ] Landing page

### Phase 2 — Onboarding
- [ ] About You form with validation
- [ ] Tag input for interests/passions
- [ ] State management (context + sessionStorage)

### Phase 3 — Assessment Engine
- [ ] `/api/generate-questions` — first question
- [ ] `/api/continue-assessment` — adaptive follow-up
- [ ] Chat-like assessment UI
- [ ] Completion detection

### Phase 4 — Report Generation
- [ ] `/api/generate-report` — profile synthesis
- [ ] Learner profile display
- [ ] Strengths and next steps sections

### Phase 5 — PDF & Polish
- [ ] Client-side PDF generation
- [ ] Print stylesheet
- [ ] Loading states and transitions
- [ ] Responsive design
- [ ] Error handling and retry

### Phase 6 — Verification
- [ ] Unit tests (vitest)
- [ ] E2E test (Playwright)
- [ ] Accessibility check
- [ ] Performance review

---

## 10. Edge Cases & Considerations

| Concern | Mitigation |
|---------|-----------|
| Gemini API down | Friendly error with retry; state preserved in sessionStorage |
| Student refreshes mid-conversation | sessionStorage restores state |
| Student brings up personal topics | AI redirects gently to learning context |
| Conversation goes too long | Max 15 exchanges, then force-complete |
| Student gives very short answers | AI asks gentle follow-up |
| PDF generation on mobile | html2canvas + jsPDF fallback to window.print() |
| Vercel 10s timeout | Gemini responses typically 2-5s; monitor |
