import type { ExpenseCategory } from "@/generated/prisma/enums";

/** Every expense category, in the order shown in selects. Kept in sync with the schema enum by its type. */
export const EXPENSE_CATEGORIES = [
  "LABOUR",
  "MATERIAL",
  "EQUIPMENT",
  "SOFTWARE",
  "TRAVEL",
  "OTHER",
] as const satisfies readonly ExpenseCategory[];
