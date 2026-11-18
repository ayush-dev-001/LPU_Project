export const ALERT_DAY_MS = 86_400_000;

export function getAlertDateWindow(now: Date) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const taskDueSoonEnd = new Date(today);
  taskDueSoonEnd.setDate(taskDueSoonEnd.getDate() + 3);
  const milestoneDueSoonEnd = new Date(today);
  milestoneDueSoonEnd.setDate(milestoneDueSoonEnd.getDate() + 4);
  return { today, taskDueSoonEnd, milestoneDueSoonEnd };
}

export function daysUntil(date: Date, today: Date) {
  const due = new Date(date);
  due.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((due.getTime() - today.getTime()) / ALERT_DAY_MS));
}

export function daysOverdue(date: Date, today: Date) {
  const due = new Date(date);
  due.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((today.getTime() - due.getTime()) / ALERT_DAY_MS));
}
