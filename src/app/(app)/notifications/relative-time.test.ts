import { describe, expect, it } from "vitest";
import { relativeTime } from "./relative-time";

describe("notification relativeTime", () => {
  const now = new Date("2026-11-17T12:00:00Z");

  it("uses readable short intervals and handles future timestamps", () => {
    expect(relativeTime(new Date(now.getTime() - 10_000), now)).toBe("just now");
    expect(relativeTime(new Date(now.getTime() - 60_000), now)).toBe("1 minute ago");
    expect(relativeTime(new Date(now.getTime() - 2 * 60 * 60_000), now)).toBe("2 hours ago");
    expect(relativeTime(new Date(now.getTime() + 60_000), now)).toBe("just now");
  });

  it("formats days, months and years", () => {
    expect(relativeTime(new Date(now.getTime() - 6 * 86_400_000), now)).toBe("6 days ago");
    expect(relativeTime(new Date(now.getTime() - 30 * 86_400_000), now)).toBe("1 month ago");
    expect(relativeTime(new Date(now.getTime() - 365 * 86_400_000), now)).toBe("1 year ago");
  });
});
