import { formatDate } from "@/lib/utils";

/** "just now", "5 minutes ago", "2 hours ago", "3 days ago"; older than 30 days → the date. */
export function relativeTime(date: Date | string, now: Date = new Date()) {
  const seconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";

  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"} ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return plural(minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return plural(hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 30) return plural(days, "day");
  return formatDate(date);
}
