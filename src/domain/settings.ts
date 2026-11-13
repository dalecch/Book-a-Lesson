import { isHm, isYmd } from "./hk";
import { promoWindow } from "./pricing";
import { hmToMinutes } from "./hk";
import { hmOverlaps } from "./schedule";
import type { ConfirmMode, DemoState, PromoCode, SettingsResult } from "./types";

function ok(state: DemoState): SettingsResult {
  return { ok: true, state };
}

export function setMonthlyFee(state: DemoState, amount: number): SettingsResult {
  if (!Number.isInteger(amount) || amount < 0 || amount > 100000) return { ok: false, error: "bad_number" };
  return ok({ ...state, tutor: { ...state.tutor, monthlyFeeHkd: amount } });
}

export function setLessonRate(state: DemoState, amount: number): SettingsResult {
  if (!Number.isInteger(amount) || amount < 0 || amount > 100000) return { ok: false, error: "bad_number" };
  return ok({ ...state, tutor: { ...state.tutor, lessonRateHkd: amount } });
}

export function setCutoffHours(state: DemoState, hours: number): SettingsResult {
  if (!Number.isInteger(hours) || hours < 0 || hours > 168) return { ok: false, error: "bad_number" };
  return ok({ ...state, tutor: { ...state.tutor, cancelCutoffHours: hours } });
}

export function setConfirmMode(state: DemoState, mode: ConfirmMode): SettingsResult {
  return ok({ ...state, tutor: { ...state.tutor, confirmMode: mode } });
}

export function setPaymentDetails(
  state: DemoState,
  patch: { fpsId?: string; bankNameEn?: string; bankNameZh?: string; bankNameHans?: string; bankAccount?: string; whatsappPhone?: string; defaultWebOrigin?: string },
): SettingsResult {
  const next = { ...state.tutor };
  if (patch.fpsId !== undefined) next.fpsId = patch.fpsId.trim().slice(0, 40);
  if (patch.bankNameEn !== undefined) next.bankNameEn = patch.bankNameEn.trim().slice(0, 80);
  if (patch.bankNameZh !== undefined) next.bankNameZh = patch.bankNameZh.trim().slice(0, 80);
  if (patch.bankNameHans !== undefined) next.bankNameHans = patch.bankNameHans.trim().slice(0, 80);
  if (patch.bankAccount !== undefined) next.bankAccount = patch.bankAccount.trim().slice(0, 40);
  if (patch.whatsappPhone !== undefined) next.whatsappPhone = patch.whatsappPhone.replace(/\D/g, "").slice(0, 15);
  if (patch.defaultWebOrigin !== undefined) next.defaultWebOrigin = patch.defaultWebOrigin.trim().slice(0, 120);
  return ok({ ...state, tutor: next });
}

export function applyPromoCode(state: DemoState, code: string, now: Date): SettingsResult {
  const found = state.promos.find((item) => item.code.toLowerCase() === code.trim().toLowerCase());
  if (!found) return { ok: false, error: "promo_not_found" };
  const window = promoWindow(found, now);
  if (window === "expired") return { ok: false, error: "promo_expired" };
  if (window === "not_yet") return { ok: false, error: "promo_not_yet" };
  return ok({ ...state, tutor: { ...state.tutor, promoCode: found.code } });
}

export function clearPromoCode(state: DemoState): SettingsResult {
  return ok({ ...state, tutor: { ...state.tutor, promoCode: null } });
}

export function activateSubscription(state: DemoState): SettingsResult {
  return ok({ ...state, tutor: { ...state.tutor, subscriptionStatus: "active" } });
}

export function cancelSubscription(state: DemoState): SettingsResult {
  return ok({ ...state, tutor: { ...state.tutor, subscriptionStatus: "cancelled" } });
}

export function setStudentActive(state: DemoState, studentId: string, active: boolean): SettingsResult {
  if (!state.students.some((student) => student.id === studentId)) return { ok: false, error: "not_found" };
  return ok({
    ...state,
    students: state.students.map((student) => (student.id === studentId ? { ...student, active } : student)),
  });
}

export function addAvailability(state: DemoState, weekday: number, start: string, end: string): SettingsResult {
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !isHm(start) || !isHm(end)) {
    return { ok: false, error: "bad_time" };
  }
  if (hmToMinutes(end) <= hmToMinutes(start)) return { ok: false, error: "bad_time" };
  const clash = state.availability.some(
    (block) => block.weekday === weekday && hmOverlaps(block.start, block.end, start, end),
  );
  if (clash) return { ok: false, error: "overlap" };
  return ok({
    ...state,
    availability: [...state.availability, { id: `slot-${weekday}-${start}-${end}`, weekday, start, end }],
  });
}

export function removeAvailability(state: DemoState, blockId: string): SettingsResult {
  return ok({ ...state, availability: state.availability.filter((block) => block.id !== blockId) });
}

export function addPromoCode(state: DemoState, input: PromoCode): SettingsResult {
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,20}$/.test(code)) return { ok: false, error: "promo_invalid" };
  if (state.promos.some((item) => item.code.toUpperCase() === code)) return { ok: false, error: "promo_invalid" };
  if (!isYmd(input.validFrom) || !isYmd(input.validUntil) || input.validFrom > input.validUntil) {
    return { ok: false, error: "promo_invalid" };
  }
  if (!Number.isInteger(input.value) || input.value < 1) return { ok: false, error: "promo_invalid" };
  if (input.type === "percent" && input.value > 100) return { ok: false, error: "promo_invalid" };
  if (input.type === "amount" && input.value > 100000) return { ok: false, error: "promo_invalid" };
  const promo: PromoCode = {
    code,
    type: input.type,
    value: input.value,
    validFrom: input.validFrom,
    validUntil: input.validUntil,
    labelEn: input.labelEn.trim().slice(0, 80) || code,
    labelZh: input.labelZh.trim().slice(0, 80) || code,
    labelHans: input.labelHans.trim().slice(0, 80) || code,
  };
  return ok({ ...state, promos: [...state.promos, promo] });
}
