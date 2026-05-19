import { z } from "zod";

export const UserInfoSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  yearLevel: z.number().int().min(7).max(12),
  interests: z.array(z.string()).max(5).default([]),
  passions: z.array(z.string()).max(5).default([]),
  selfDescription: z.string().max(300).default(""),
});

export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(["ai", "user"]),
  text: z.string(),
  format: z.string().optional(),
  capability: z.string().optional(),
  options: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .optional(),
});

export const QuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  format: z.enum(["open", "scale", "choice", "scenario"]),
  options: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .optional(),
  capability: z.string().optional(),
});

export const LearnerProfileSchema = z.object({
  studentName: z.string(),
  dateGenerated: z.string(),
  narrative: z.string(),
  themes: z
    .array(
      z.object({
        name: z.enum([
          "Analytical Thinking",
          "Creativity",
          "Curiosity",
          "Mindful Agency",
          "Motivation",
          "Resilience",
          "Community",
          "Humanitarianism",
          "Operational Action",
        ]),
        strength: z.string(),
        growth: z.string(),
      })
    )
    .optional()
    .default([]),
  strengths: z.array(
    z.object({ title: z.string(), narrative: z.string() })
  ),
  nextSteps: z.array(z.string()),
  interestsConnection: z.string(),
  challenge: z.string(),
});

export type UserInfo = z.infer<typeof UserInfoSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type LearnerProfile = z.infer<typeof LearnerProfileSchema>;

export interface AppState {
  userInfo: UserInfo | null;
  conversation: Message[];
  isComplete: boolean;
  profile: LearnerProfile | null;
  step: "landing" | "onboarding" | "assessment" | "generating" | "report";
  error: string | null;
}

export interface ContinueResponse {
  question: Question | null;
  complete: boolean;
}
