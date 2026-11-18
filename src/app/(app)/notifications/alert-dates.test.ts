import { describe, expect, it } from "vitest";
import { daysOverdue, daysUntil, getAlertDateWindow } from "./alert-dates";

describe("notification alert date windows", () => {
  it("uses start-of-day exclusive ends for the next two task days and three milestone days", () => {
    const { today, taskDueSoonEnd, milestoneDueSoonEnd } = getAlertDateWindow(new Date(2026, 10, 17, 15, 30));
    expect(today).toEqual(new Date(2026, 10, 17));
    expect(taskDueSoonEnd).toEqual(new Date(2026, 10, 20));
    expect(milestoneDueSoonEnd).toEqual(new Date(2026, 10, 21));
  });

  it("calculates due and overdue day counts by calendar day", () => {
    const today = new Date(2026, 10, 17);
    expect(daysUntil(new Date(2026, 10, 19, 23), today)).toBe(2);
    expect(daysUntil(new Date(2026, 10, 17, 20), today)).toBe(0);
    expect(daysOverdue(new Date(2026, 10, 11, 23), today)).toBe(6);
    expect(daysOverdue(new Date(2026, 10, 17, 0), today)).toBe(1);
  });
});
