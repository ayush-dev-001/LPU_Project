import type { z } from "zod";

/**
 * The shape every server action used with useActionState returns.
 * - error: a message for the whole form
 * - fieldErrors: messages per input name (show under each input)
 * - success: a message to show after a successful save
 */
export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: string;
} | undefined;

/** Turn a failed zod parse into an ActionState. */
export function fromZodError(error: z.ZodError): ActionState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { error: "Please fix the highlighted fields.", fieldErrors };
}
