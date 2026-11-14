import { randomInt } from "node:crypto";
import { z } from "zod";

/** The one password rule used everywhere (sign-up, change password, admin-created users). */
export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Use at most 128 characters.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/[0-9]/, "Include at least one number.");

/** A readable temporary password like "Kite-7342-Mango" that satisfies passwordSchema. */
export function generateTempPassword() {
  const words = ["Kite", "Mango", "River", "Cedar", "Pixel", "Orbit", "Lotus", "Tiger", "Comet", "Maple", "Ember", "Coral"];
  const pick = () => words[randomInt(words.length)];
  return `${pick()}-${randomInt(1000, 10000)}-${pick()}`;
}
