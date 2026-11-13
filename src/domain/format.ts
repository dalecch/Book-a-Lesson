import { hkYmd } from "./hk";
import type { Locale } from "./types";

export function localeTag(locale: Locale): string {
  switch (locale) {
    case "en":
      return "en-HK";
    case "zh-Hant":
      return "zh-Hant-HK";
    case "zh-Hans":
      return "zh-Hans-CN";
    default: {
      const exhaustive: never = locale;
      return exhaustive;
    }
  }
}

export function byLocale(locale: Locale, copy: { en: string; hant: string; hans: string }): string {
  switch (locale) {
    case "en":
      return copy.en;
    case "zh-Hant":
      return copy.hant;
    case "zh-Hans":
      return copy.hans;
    default: {
      const exhaustive: never = locale;
      return exhaustive;
    }
  }
}

export function personName(locale: Locale, person: { nameEn: string; nameZh: string; nameHans: string }): string {
  return byLocale(locale, { en: person.nameEn, hant: person.nameZh, hans: person.nameHans });
}

export function tutorSubject(locale: Locale, tutor: { subjectEn: string; subjectZh: string; subjectHans: string }): string {
  return byLocale(locale, { en: tutor.subjectEn, hant: tutor.subjectZh, hans: tutor.subjectHans });
}

export function tutorBio(locale: Locale, tutor: { bioEn: string; bioZh: string; bioHans: string }): string {
  return byLocale(locale, { en: tutor.bioEn, hant: tutor.bioZh, hans: tutor.bioHans });
}

export function bankName(locale: Locale, tutor: { bankNameEn: string; bankNameZh: string; bankNameHans: string }): string {
  return byLocale(locale, { en: tutor.bankNameEn, hant: tutor.bankNameZh, hans: tutor.bankNameHans });
}

export function promoLabel(locale: Locale, promo: { labelEn: string; labelZh: string; labelHans: string }): string {
  return byLocale(locale, { en: promo.labelEn, hant: promo.labelZh, hans: promo.labelHans });
}

export function noteTitle(locale: Locale, note: { titleEn: string; titleZh: string; titleHans: string }): string {
  return byLocale(locale, { en: note.titleEn, hant: note.titleZh, hans: note.titleHans });
}

export function noteBody(locale: Locale, note: { bodyEn: string; bodyZh: string; bodyHans: string }): string {
  return byLocale(locale, { en: note.bodyEn, hant: note.bodyZh, hans: note.bodyHans });
}

export function formatHkd(locale: Locale, amount: number): string {
  return new Intl.NumberFormat(localeTag(locale), {
    style: "currency",
    currency: "HKD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatWhen(locale: Locale, iso: string): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    timeZone: "Asia/Hong_Kong",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export function formatDay(locale: Locale, iso: string): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    timeZone: "Asia/Hong_Kong",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}

export function formatWeekday(locale: Locale, weekday: number): string {
  const sunday = hkInstantSafe();
  const date = new Date(sunday.getTime() + weekday * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat(localeTag(locale), {
    timeZone: "Asia/Hong_Kong",
    weekday: "short",
  }).format(date);
}

function hkInstantSafe(): Date {
  return new Date("2026-11-15T12:00:00+08:00");
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("852") && digits.length === 11) {
    return `+852 ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }
  return digits ? `+${digits}` : phone;
}

export function dayKey(iso: string): string {
  return hkYmd(new Date(iso));
}
