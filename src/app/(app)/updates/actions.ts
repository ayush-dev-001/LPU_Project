"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function deleteUpdate(formData: FormData) {
  const id = String(formData.get("id"));
  await db.progressUpdate.delete({ where: { id } });
  revalidatePath("/updates");
}
