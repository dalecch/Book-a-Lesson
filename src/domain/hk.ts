const HK = "Asia/Hong_Kong";

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((item) => item.type === type)?.value ?? "";
}

export function hkYmd(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: HK,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function hkWeekday(date: Date): number {
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: HK,
    weekday: "short",
  }).format(date);
  const index = WEEKDAYS.indexOf(label as (typeof WEEKDAYS)[number]);
  if (index < 0) {
    throw new Error(`Unknown weekday ${label}`);
  }
  return index;
}

export function hkHm(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: HK,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  let hour = part(parts, "hour");
  const minute = part(parts, "minute");
  if (hour === "24") hour = "00";
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

export function isHm(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function hkInstant(ymd: string, hm: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd) || !isHm(hm)) {
    throw new Error(`Bad Hong Kong timestamp ${ymd} ${hm}`);
  }
  return new Date(`${ymd}T${hm}:00+08:00`);
}

export function addDaysYmd(ymd: string, days: number): string {
  const shifted = hkInstant(ymd, "12:00").getTime() + days * 24 * 60 * 60 * 1000;
  return hkYmd(new Date(shifted));
}

export function isYmd(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return hkYmd(hkInstant(value, "12:00")) === value;
}

export function hmToMinutes(value: string): number {
  const [hour, minute] = value.split(":").map((part) => Number(part));
  return hour * 60 + minute;
}
