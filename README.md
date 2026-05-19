# My Learning Profile — Next-Generation Learning

A single-session web application where students have an AI-guided conversation about their learning capabilities and receive a personalised Learner Profile.

Built for the Next-Generation Learning initiative (The Australian Learning Lecture, The University of Melbourne, ASPA).

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS + shadcn/ui
- **AI:** Groq API (Llama 3.3 70B)
- **PDF:** html2canvas + jsPDF (client-side)
- **Hosting:** Vercel (Hobby)

## Getting Started

```bash
cp .env.example .env.local
# Add your GROQ_API_KEY to .env.local

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Command | Action |
|---------|--------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

## Project Structure

```
src/
├── app/          # Pages + API routes
├── components/   # UI components
├── lib/          # Groq client + prompts
├── providers/    # React context
└── types/        # Zod schemas + TypeScript types
```

## Environment

`GROQ_API_KEY` is required. Get one free at https://console.groq.com (no credit card needed)


