# Next-Generation Learning Platform — AGENTS.md

## Stack

- Next.js 14+ (App Router), TypeScript (strict), Tailwind CSS v4, shadcn/ui
- OpenRouter API (`meta-llama/llama-3.3-70b-instruct:free` via OpenAI-compatible endpoint) for AI conversation + report
- Recharts for visual elements, html2canvas + jsPDF for PDF download
- Zod for validation, SWR for data fetching, sessionStorage for persistence
- Hosted on Vercel (Hobby tier, no database)

## Developer Commands

| Command | Action |
|---------|--------|
| `npm run dev` | Start dev server (port 3000) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (watch) |
| `npm run test:run` | Vitest (single run) |

## Project Structure

```
src/
├── app/          # Next.js App Router (pages + API routes)
├── components/
│   ├── ui/       # shadcn/ui primitives
│   └── features/ # Feature-specific (landing, onboarding, assessment, report)
├── lib/          # openrouter.ts, prompts.ts, utils.ts
├── hooks/        # React hooks
├── providers/    # React context
└── types/        # All types + Zod schemas (shared FE/BE)
```

## Key Architecture Rules

1. **No database** — all state lives in React context + sessionStorage. Every visit is fresh.
2. **Sequential adaptive assessment** — the AI generates one question at a time. Each question uses full conversation history as context. Three API calls: `generate-questions` (first), `continue-assessment` (loop), `generate-report` (final).
3. **No scores/levels/rubrics** in the report — only constructive strengths and next steps.
4. **No personal questions** — AI prompts explicitly ban mental health, family, trauma, or diagnostic topics. Focus stays on learning experiences.
5. **OpenRouter API key** goes in `.env.local` as `OPENROUTER_API_KEY`. Never commit.
6. **PDF is client-side** — html2canvas captures the report DOM, jsPDF wraps it. Avoids Vercel serverless timeout.

## Prompt Engineering

- Prompts live in `src/lib/prompts.ts` as exported functions (returning OpenAI-format messages arrays)
- Question generation prompt: personalises questions to student interests, targets 3 themes (Working with Others, Thinking about Learning, Taking Action), no personal/clinical topics
- Report generation prompt: produces constructive profile (no scores/levels), references specific student answers, second-person ("you") narrative
- Both use `response_format: { type: "json_object" }` for structured output via OpenRouter

## Conventions

- Zod schemas in `types/` are the source of truth — used by both API routes and UI validation
- shadcn/ui components go in `components/ui/`, custom components in feature subdirectories
- Feature components go in `components/features/<name>/`
- Each interactive component handles: loading, empty, active, error, disabled, success states
- Environment variables: only `OPENROUTER_API_KEY` required; `NEXT_PUBLIC_APP_URL` optional
- All state is ephemeral — closing the tab = clean slate
- All pages use responsive design (`px-4 sm:px-6`, touch-friendly targets, `sm:` breakpoints)
- Color contrast: never use `text-zinc-400` on light backgrounds (2.4:1 fails WCAG AA); use `text-zinc-500` minimum
- API routes use lazy import of AI SDK inside the handler to avoid build-time errors
- Error messages in assessment page are specific (detect 502, "API key not configured", etc.)

## Questions to Ask Before Making Changes

- Does this introduce a dependency on a database or persistent storage? (Don't.)
- Does the AI prompt ask personal/clinical questions? (Don't.)
- Does the report use scores, levels, or rubric-like language? (Don't.)
- Is the state going to outlive the browser session? (Don't let it.)
