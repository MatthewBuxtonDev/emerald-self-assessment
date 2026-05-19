# Next-Generation Learning Platform — Full Documentation

> **Platform codename:** Ruby  
> **Version:** 1.0.0  
> **Last updated:** May 2026

---

## 1. Project Overview

### 1.1 What It Is

A single-session, no-account-required web application where a student has an AI-guided conversation about their learning capabilities, then receives a constructive, personalised Learner Profile (on-screen + PDF download). No databases, no user accounts, no school infrastructure.

### 1.2 Core Philosophy

- **Mentor conversation, not a test** — the AI talks with the student, then gives constructive feedback.
- **No scores, no levels, no rubrics** — strengths and next steps only.
- **Dynamic adaptation** — each question is generated from the full conversation history.
- **No personal overreach** — no mental health, family, trauma, or diagnostic topics.
- **Strengths-based** — focused on what the student does well and how to build on it.

### 1.3 Background

This platform is inspired by the Next-Generation Learning initiative (sponsored by The Australian Learning Lecture, The University of Melbourne, and ASPA) and the University of Melbourne's Ruby assessment platform. However, it differs fundamentally:

| Ruby (Original) | This Platform |
|----------------|---------------|
| Teacher-led assessment | Self-assessment via AI conversation |
| Fixed rubric frameworks | AI-generated dynamic questions |
| Psychometric scoring (Rasch) | AI-estimated qualitative profile |
| School accounts, classes, batch imports | No accounts, no persistence |
| Validation trial focused | Student-facing, single session |

---

## 2. Architecture

### 2.1 High-Level Flow

```
Browser                        Vercel (API)                Groq API
  │                               │                           │
  ├─ POST /api/generate-questions ──→                         │
  │      (userInfo)                │──── generate prompt ────→│
  │                               │←──── firstQuestion ──────│
  │←── { firstQuestion } ────────┤                           │
  │                               │                           │
  │  [User answers question]      │                           │
  │                               │                           │
  ├─ POST /api/continue-assessment ─→                         │
  │      (conversation[])          │──── generate prompt ────→│
  │                               │←──── nextQuestion ───────│
  │←── { nextQuestion } ─────────┤                           │
  │                               │                           │
  │  [Loop until complete]        │                           │
  │                               │                           │
  ├─ POST /api/generate-report ──→                             │
  │      (conversation[])          │──── generate prompt ────→│
  │                               │←──── profile data ───────│
  │←── { profile } ──────────────┤                           │
  │                               │                           │
  │  [Render report + PDF]        │                           │
```

### 2.2 Why No Database?

- **Privacy**: No personal data stored. Close the tab = clean slate.
- **Simplicity**: Zero infrastructure beyond Vercel + Groq API key.
- **Cost**: Vercel hobby tier is free.
- **Speed**: No cold-start DB connections, migrations, or data modeling.
- **Compliance**: No student data retention obligations.

---

## 3. Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 14+ (App Router) | Full-stack React framework |
| TypeScript | 5.x (strict) | Type safety |
| Tailwind CSS | 4.x | Utility-first styling |
| shadcn/ui | latest | Accessible component primitives |
| Groq API (fetch) | — | OpenAI-compatible LLM API |
| Recharts | 2.x | Optional report visuals |
| html2canvas | 1.x | Capture report DOM for PDF |
| jsPDF | 2.x | Generate PDF |
| Zod | 3.x | Runtime validation |
| SWR | 2.x | Data fetching with states |
| Vitest | latest | Unit tests |
| Playwright | latest | E2E tests |

### 3.1 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Yes | Groq API key (get at https://console.groq.com) |
| `NEXT_PUBLIC_APP_URL` | No | Canonical URL for metadata |

---

## 4. Route Map

### 4.1 Pages

| Route | Component | Description | Key State |
|-------|-----------|-------------|-----------|
| `/` | LandingPage | Program info, "Begin" CTA | Static |
| `/about-you` | OnboardingPage | Name, year, interests, passions | Form input |
| `/assessment` | AssessmentPage | Chat-like adaptive conversation | Multi-turn |
| `/report` | ReportPage | Learner profile display + PDF | Data display |

### 4.2 API Endpoints

#### `POST /api/generate-questions`

Generates the first question based on user info.

**Request:**
```typescript
{
  name: string;
  yearLevel: number;       // 7-10
  interests: string[];     // max 5
  passions: string[];      // max 5
  selfDescription: string; // optional, max 300 chars
}
```

**Response (200):**
```typescript
{
  question: {
    id: string;
    text: string;
    format: "open" | "scale" | "choice" | "scenario";
    options?: { label: string; value: string }[];
  };
  metadata: {
    capabilitiesCovered: { code: string; name: string; exchangeCount: number }[];
  };
}
```

**Errors:** `502` (Groq unavailable), `500` (internal)

---

#### `POST /api/continue-assessment`

Receives full conversation history, returns next question or completion signal.

**Request:**
```typescript
{
  conversation: {
    id: string;
    role: "ai" | "user";
    text: string;
    format?: string;
    capability?: string;
  }[];
}
```

**Response (200) — more questions needed:**
```typescript
{
  question: { id: string; text: string; format: string; options?: any };
  metadata: { capabilitiesCovered: [...]; complete: false };
}
```

**Response (200) — assessment complete:**
```typescript
{
  question: null;
  metadata: { capabilitiesCovered: [...]; complete: true };
}
```

**Completion criteria:** Each capability has ~3+ substantive exchanges, or max 15 total exchanges reached.

---

#### `POST /api/generate-report`

Synthesises the full conversation into a Learner Profile.

**Request:**
```typescript
{
  userInfo: { name: string; yearLevel: number; interests: string[]; passions: string[]; selfDescription: string };
  conversation: { role: string; text: string; capability?: string }[];
}
```

**Response (200):**
```typescript
{
  profile: {
    studentName: string;
    dateGenerated: string;
    narrative: string;          // 2-3 sentence warm summary
    strengths: {
      title: string;            // e.g. "Bringing People Together"
      narrative: string;        // 2-3 sentences, references student's words
    }[];
    nextSteps: string[];        // 2-3 actionable suggestions
    interestsConnection: string; // How passions connect to learning
    challenge: string;          // One specific thing to try this week
  };
}
```

**Guarantees:** No scores, no levels, no rubric language. Only constructive, growth-oriented content.

---

## 5. Groq Prompt Engineering

### 5.1 Prompt Locations

All prompts live in `src/lib/prompts.ts` as exported functions.

```typescript
export function buildFirstQuestionPrompt(userInfo: UserInfo): { systemInstruction: string; contents: string }
export function buildContinuationPrompt(conversation: Message[]): { systemInstruction: string; contents: string }
export function buildReportPrompt(userInfo: UserInfo, conversation: Message[]): { systemInstruction: string; contents: string }
```

### 5.2 Shared System Instruction Rules

Every prompt includes these guardrails:

```
You are a friendly mentor having a conversation about learning with a school student.
- Never ask about mental health, family, trauma, personal difficulties, or medical topics.
- If the student brings up something personal, gently redirect to a learning context.
- Keep language warm, encouraging, and age-appropriate (Years 7-10).
- Focus on learning experiences: school, hobbies, group activities, projects, sports.
- Do not use clinical, diagnostic, or therapeutic language.
- This is a conversation, not an interrogation.
```

### 5.3 First Question Prompt

The `buildFirstQuestionPrompt` function:

```
Given a student's profile:
- Name: {name}
- Year: {yearLevel}
- Interests: {interests}
- Passions: {passions}
- Self-description: {selfDescription}

Generate the first question to start a conversation about how they learn.
The question should:
- Reference one of their interests or passions to build rapport
- Be open-ended and encourage reflection
- Target one of three learning themes:
  1. Working with Others (collaboration, communication, teamwork)
  2. Thinking about Learning (reflection, goal-setting, self-awareness)
  3. Taking Action (initiative, persistence, trying new things)
- Not feel like a test — it should feel like a curious mentor asking

Return JSON:
{
  "question": {
    "id": "q_1",
    "text": "the question text",
    "format": "open",
    "capability": "collaboration" | "metacognition" | "agency"
  }
}
```

### 5.4 Continuation Prompt

The `buildContinuationPrompt` function receives the full conversation and:

```
Here is the conversation so far:
[conversation formatted as messages]

Capabilities covered:
- Working with Others: {N} exchanges
- Thinking about Learning: {N} exchanges
- Taking Action: {N} exchanges

Generate the next question. Choose a capability that needs more coverage.
The question should:
- Build on what the student just said (reference it naturally)
- Be in whatever format best suits this moment (open-ended, reflective, scenario, scaled)
- Feel like a natural continuation of the conversation
- Be personalised to the student's interests and previous answers

If each capability has at least 3 substantive exchanges, set "complete": true.
Maximum 15 total exchanges before force-completing.

Return JSON:
{
  "question": { "id": "q_N", "text": "...", "format": "...", "options": [...] } | null,
  "complete": false | true
}
```

### 5.5 Report Prompt

The `buildReportPrompt` function:

```
Given the full conversation with a student, create a constructive Learner Profile.

RULES (critical):
- NO scores, NO levels, NO rubric language (do not use: beginning, developing, proficient, advanced, score, rating, level)
- NO clinical or diagnostic language
- Write in second person ("you")
- Reference specific things the student said (show you listened)
- Every strength should name what the student does well and why it matters
- Every next step should be specific, positive, and actionable
- The challenge should be one concrete thing to try in the next week

Return JSON:
{
  "profile": {
    "studentName": "...",
    "dateGenerated": "ISO date",
    "narrative": "2-3 sentences summarising how this student learns",
    "strengths": [
      { "title": "Short strength label", "narrative": "2-3 sentence explanation referencing what they shared" }
    ],
    "nextSteps": ["Specific suggestion 1", "Specific suggestion 2", "Specific suggestion 3"],
    "interestsConnection": "How their passions connect to their learning journey",
    "challenge": "One specific thing to try this week"
  }
}
```

### 5.6 JSON Mode

All prompts use `responseMimeType: "application/json"` for structured, parseable output. Temperature: 0.7.

---

## 6. State Management

### 6.1 State Shape

```typescript
interface AppState {
  userInfo: UserInfo | null;
  conversation: Message[];     // Full conversation history
  isComplete: boolean;         // Assessment finished
  profile: LearnerProfile | null;
  step: "landing" | "onboarding" | "assessment" | "report";
  error: string | null;
}
```

### 6.2 Provider

Single `AssessmentProvider` React context wraps the root layout. All pages read/write via `useAssessment()` hook.

### 6.3 Persistence

Full `AppState` serialised to `sessionStorage` on every change. Survives page refresh within the session. Closed tab = clean slate. Key: `"ngl-assessment-state"`.

"Start Over" clears both context state and sessionStorage.

---

## 7. Component Reference

### 7.1 Page Components

| Component | Route | States Handled |
|-----------|-------|---------------|
| `LandingPage` | `/` | Static (no dynamic states) |
| `OnboardingPage` | `/about-you` | Empty, active, error (validation) |
| `AssessmentPage` | `/assessment` | Loading (first question), active (conversation), error (API), complete |
| `ReportPage` | `/report` | Loading (generating report), active (display), error, PDF generating |

### 7.2 Feature Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `HeroSection` | `features/landing/` | Landing page hero |
| `HowItWorks` | `features/landing/` | Step-by-step explanation |
| `OnboardingForm` | `features/onboarding/` | Name/year/interests/passions form |
| `TagInput` | `features/onboarding/` | Add/remove interest tags |
| `ChatInterface` | `features/assessment/` | Full chat UI with bubbles |
| `MessageBubble` | `features/assessment/` | Single message (AI or user) |
| `QuestionRenderer` | `features/assessment/` | Renders AI question in format-matched input |
| `ProfileDisplay` | `features/report/` | Full learner profile layout |
| `StrengthCard` | `features/report/` | Individual strength display |
| `NextStepsList` | `features/report/` | Numbered next steps |
| `ChallengeBox` | `features/report/` | "Try this week" callout |
| `PdfButton` | `features/report/` | Download PDF trigger |
| `ErrorState` | shared | API error with retry |
| `LoadingOverlay` | shared | Animated loading with step messages |

### 7.3 Component State Handling

Every interactive component must handle:
- **Loading** — skeleton/spinner, no interaction
- **Empty** — default state with prompt
- **Active** — user is interacting
- **Error** — validation/API error + retry
- **Disabled** — during submission/generation

---

## 8. PDF Generation

### 8.1 Approach: Client-Side

Using html2canvas + jsPDF entirely in the browser:

```typescript
async function downloadPDF(elementId: string, fileName: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

  let heightLeft = pdfHeight - pdf.internal.pageSize.getHeight();
  let position = -pdf.internal.pageSize.getHeight();

  while (heightLeft > 0) {
    pdf.addPage();
    position -= pdf.internal.pageSize.getHeight();
    pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
    heightLeft -= pdf.internal.pageSize.getHeight();
  }

  pdf.save(fileName);
}
```

### 8.2 Print Fallback

```css
@media print {
  .no-print { display: none !important; }
  #report-content { position: absolute; top: 0; left: 0; width: 100%; }
  @page { margin: 15mm; size: A4; }
}
```

### 8.3 Why Not Server-Side?

Vercel Hobby tier has a 10s serverless function timeout. Adding server-side PDF rendering on top of API calls risks timeout. Client-side avoids this entirely.

---

## 9. Error Handling

| Scenario | UX | Technical |
|----------|----|-----------|
| Groq API key missing | Error page, "Contact support" | 500, logged |
| Groq returns invalid JSON | "Something went wrong — try again" | Retry with stricter prompt |
| Groq rate-limited | Wait + auto-retry | Exponential backoff, 3 retries |
| Network failure | "Check your connection" | Caught by try/catch |
| Student refreshes | Restore from sessionStorage | Persist on every change |
| studentStorage unavailable | State still works, no persistence | try/catch, continue silently |
| Browser too old for PDF | Fallback to window.print() | Feature detection |
| User goes back during API call | Confirmation dialog | beforeunload listener |

---

## 10. Testing Strategy

| Scope | Tool | What |
|-------|------|------|
| **Unit** | Vitest | Prompt builders, Zod schemas, Groq response parsing, state transitions |
| **Component** | Vitest + Testing Library | Form validation, question rendering, message display |
| **E2E** | Playwright | Full flow: landing → onboarding → assessment → report → PDF |
| **AI** | Manual | Verify questions are personalised, report references student answers, no rubric language |

---

## 11. Deployment

### 11.1 Vercel

1. Push to GitHub
2. Import in Vercel dashboard
3. Set `GROQ_API_KEY` in environment variables
4. Deploy (auto-detects Next.js)

### 11.2 CI/CD

```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:run
      - run: npm run build
```

Vercel auto-deploys branches as previews, main to production.

---

## 12. Development Setup

```bash
git clone <repo-url>
cd next-generation-learning
npm install
cp .env.example .env.local
# Edit .env.local: add GROQ_API_KEY
npm run dev     # → http://localhost:3000
```

### Available Scripts

| Script | Command |
|--------|---------|
| `dev` | `next dev` |
| `build` | `next build` |
| `start` | `next start` |
| `lint` | `next lint` |
| `typecheck` | `tsc --noEmit` |
| `test` | `vitest` (watch) |
| `test:run` | `vitest run` |
| `test:e2e` | `playwright test` |

---

## 13. File Structure (Annotated)

```
next-generation-learning/
├── .env.example                 # Template for env vars
├── .env.local                   # Local env (gitignored)
├── .github/workflows/ci.yml     # CI pipeline
├── AGENTS.md                    # AI session instructions
├── DOCUMENTATION.md             # This file
├── PROJECT_PLAN.md              # Milestones and phases
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── vitest.config.ts
├── playwright.config.ts
├── public/                      # Static assets, logos
└── src/
    ├── app/
    │   ├── layout.tsx           # Root layout + providers
    │   ├── page.tsx             # Landing page
    │   ├── about-you/page.tsx   # Onboarding form
    │   ├── assessment/page.tsx  # Chat assessment
    │   ├── report/page.tsx      # Learner profile
    │   └── api/
    │       ├── generate-questions/route.ts
    │       ├── continue-assessment/route.ts
    │       └── generate-report/route.ts
    ├── components/
    │   ├── ui/                  # shadcn/ui components
    │   └── features/
    │       ├── landing/
    │       ├── onboarding/
    │       ├── assessment/
    │       └── report/
    ├── lib/
    │   ├── groq.ts              # Groq API wrapper
    │   ├── prompts.ts           # Prompt templates
    │   └── utils.ts             # Shared utilities
    ├── hooks/                   # React hooks
    ├── providers/               # Context providers
    └── types/index.ts           # Types + Zod schemas
```

---

## 14. Accessibility

- Keyboard navigation on all interactive elements
- ARIA labels on icons and dynamic content
- Colour contrast WCAG 2.1 AA (4.5:1 normal, 3:1 large)
- `prefers-reduced-motion` respected
- Form errors associated via `aria-describedby`
- Print stylesheet as PDF fallback

---

## 15. Performance Budget

| Metric | Target |
|--------|--------|
| Time to Interactive | < 3s on 3G |
| First Contentful Paint | < 1.5s |
| Lighthouse Performance | > 90 |
| Lighthouse Accessibility | > 90 |
| Initial JS bundle | < 150 KB gzipped |
| Groq API p95 | < 3s |
| PDF generation | < 2s |

---

## 16. Key Constraints (Non-Negotiable)

1. **No database** — state lives in browser only. Every visit is a fresh session.
2. **No scores, levels, or rubrics** in the report — only constructive strengths and next steps.
3. **No personal/clinical questions** — no mental health, family, trauma, or diagnostic topics.
4. **AI generates one question at a time** — sequential adaptive conversation, not batch.
5. **PDF is client-side** — html2canvas + jsPDF, never server-side.
6. **Groq API key** required in `.env.local` — never committed.
