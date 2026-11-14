import { describe, expect, it } from "vitest";
import { generateTempPassword, passwordSchema } from "./passwords";

describe("passwordSchema", () => {
  it.each(["short1", "allletters", "12345678"])("rejects %s", (pw) => {
    expect(passwordSchema.safeParse(pw).success).toBe(false);
  });

  it("accepts a password with letters and numbers", () => {
    expect(passwordSchema.safeParse("Password@123").success).toBe(true);
  });
});

describe("generateTempPassword", () => {
  it("always satisfies the password rule", () => {
    for (let i = 0; i < 200; i++) {
      expect(passwordSchema.safeParse(generateTempPassword()).success).toBe(true);
    }
  });
});
