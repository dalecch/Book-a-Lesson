import { addDaysYmd, hkHm, hkInstant, hkWeekday, hkYmd, hmToMinutes } from "./hk";
import type { DemoState, LessonStatus } from "./types";

export interface TimeSlot {
  start: string;
  end: string;
  weekday: number;
}

export function blocksCalendar(status: LessonStatus): boolean {
  switch (status) {
    case "pending_payment":
    case "pending_confirm":
    case "confirmed":
      return true;
    case "completed":
    case "cancelled":
    case "absent":
      return false;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export function slotFree(state: DemoState, start: string, end: string, ignoreLessonId?: string): boolean {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  return !state.lessons.some((lesson) => {
    if (lesson.id === ignoreLessonId) return false;
    if (!blocksCalendar(lesson.status)) return false;
    const lessonStart = new Date(lesson.start).getTime();
    const lessonEnd = new Date(lesson.end).getTime();
    return startMs < lessonEnd && endMs > lessonStart;
  });
}

export function matchesAvailability(state: DemoState, start: string, end: string): boolean {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return false;
  if (hkYmd(startDate) !== hkYmd(endDate)) return false;
  const weekday = hkWeekday(startDate);
  const startHm = hkHm(startDate);
  const endHm = hkHm(endDate);
  return state.availability.some(
    (block) => block.weekday === weekday && block.start === startHm && block.end === endHm,
  );
}

export function hmOverlaps(startA: string, endA: string, startB: string, endB: string): boolean {
  return hmToMinutes(startA) < hmToMinutes(endB) && hmToMinutes(endA) > hmToMinutes(startB);
}

export function openSlots(state: DemoState, from: Date, days: number): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const startYmd = hkYmd(from);
  for (let offset = 0; offset < days; offset += 1) {
    const ymd = addDaysYmd(startYmd, offset);
    const weekday = hkWeekday(hkInstant(ymd, "12:00"));
    for (const block of state.availability) {
      if (block.weekday !== weekday) continue;
      const start = hkInstant(ymd, block.start).toISOString();
      const end = hkInstant(ymd, block.end).toISOString();
      if (new Date(start).getTime() <= from.getTime()) continue;
      if (!slotFree(state, start, end)) continue;
      slots.push({ start, end, weekday });
    }
  }
  slots.sort((left, right) => left.start.localeCompare(right.start));
  return slots;
}

export function nextWeeklySlots(
  state: DemoState,
  from: Date,
  weekday: number,
  startHm: string,
  endHm: string,
  count: number,
  horizonDays = 200,
): TimeSlot[] {
  const found: TimeSlot[] = [];
  const startYmd = hkYmd(from);
  for (let offset = 0; offset < horizonDays && found.length < count; offset += 1) {
    const ymd = addDaysYmd(startYmd, offset);
    if (hkWeekday(hkInstant(ymd, "12:00")) !== weekday) continue;
    const start = hkInstant(ymd, startHm).toISOString();
    const end = hkInstant(ymd, endHm).toISOString();
    if (new Date(start).getTime() <= from.getTime()) continue;
    if (!matchesAvailability(state, start, end)) continue;
    if (!slotFree(state, start, end)) continue;
    found.push({ start, end, weekday });
  }
  return found;
}

export function previousOccurrence(from: Date, weekday: number, startHm: string, endHm: string): TimeSlot {
  const startYmd = hkYmd(from);
  for (let offset = 1; offset <= 21; offset += 1) {
    const ymd = addDaysYmd(startYmd, -offset);
    if (hkWeekday(hkInstant(ymd, "12:00")) !== weekday) continue;
    const start = hkInstant(ymd, startHm);
    const end = hkInstant(ymd, endHm);
    if (start.getTime() < from.getTime()) {
      return { start: start.toISOString(), end: end.toISOString(), weekday };
    }
  }
  throw new Error("No previous occurrence");
}

export function upcomingLessons<T extends { start: string; end: string; status: LessonStatus }>(
  lessons: T[],
  now: Date,
): T[] {
  return lessons
    .filter((lesson) => blocksCalendar(lesson.status) && new Date(lesson.end).getTime() > now.getTime())
    .sort((left, right) => left.start.localeCompare(right.start));
}
