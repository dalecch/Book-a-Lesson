import { hkYmd } from "./hk";
import type { BillingPhase, DemoState, PromoCode } from "./types";

export interface BillingQuote {
  phase: BillingPhase;
  runningPhase: Exclude<BillingPhase, "cancelled">;
  activeStudents: number;
  freeLimit: number;
  listPriceHkd: number;
  discountHkd: number;
  dueHkd: number;
  payableNowHkd: number;
  promo: PromoCode | null;
  promoError: "not_found" | "not_yet" | "expired" | null;
  trialEndsAt: string;
}

export function activeStudentCount(state: DemoState): number {
  return state.students.filter((student) => student.active).length;
}

export function promoWindow(promo: PromoCode, now: Date): "ok" | "not_yet" | "expired" {
  const day = hkYmd(now);
  if (day < promo.validFrom) return "not_yet";
  if (day > promo.validUntil) return "expired";
  return "ok";
}

export function discountedFee(listPrice: number, promo: PromoCode | null): { due: number; discount: number } {
  if (!promo) return { due: listPrice, discount: 0 };
  switch (promo.type) {
    case "amount": {
      const discount = Math.min(listPrice, promo.value);
      return { due: listPrice - discount, discount };
    }
    case "percent": {
      const discount = Math.min(listPrice, Math.round((listPrice * promo.value) / 100));
      return { due: listPrice - discount, discount };
    }
    default: {
      const exhaustive: never = promo.type;
      return exhaustive;
    }
  }
}

export function billingQuote(state: DemoState, now: Date): BillingQuote {
  const activeStudents = activeStudentCount(state);
  const listPriceHkd = state.tutor.monthlyFeeHkd;
  const code = state.tutor.promoCode?.trim() ?? "";
  let promo: PromoCode | null = null;
  let promoError: BillingQuote["promoError"] = null;
  if (code) {
    const found = state.promos.find((item) => item.code.toLowerCase() === code.toLowerCase()) ?? null;
    if (!found) {
      promoError = "not_found";
    } else {
      const window = promoWindow(found, now);
      if (window === "ok") promo = found;
      else promoError = window;
    }
  }
  const money = discountedFee(listPriceHkd, promo);
  const trialOpen = new Date(state.tutor.trialEndsAt).getTime() > now.getTime();
  let runningPhase: BillingQuote["runningPhase"];
  if (activeStudents <= state.tutor.freeStudentLimit) runningPhase = "free_tier";
  else if (state.tutor.subscriptionStatus === "active") runningPhase = "active";
  else if (trialOpen) runningPhase = "trial";
  else runningPhase = "trial_ended";

  const phase: BillingPhase = state.tutor.subscriptionStatus === "cancelled" ? "cancelled" : runningPhase;
  return {
    phase,
    runningPhase,
    activeStudents,
    freeLimit: state.tutor.freeStudentLimit,
    listPriceHkd,
    discountHkd: money.discount,
    dueHkd: money.due,
    payableNowHkd: phase === "active" ? money.due : 0,
    promo,
    promoError,
    trialEndsAt: state.tutor.trialEndsAt,
  };
}

export function writesEnabled(state: DemoState, now: Date): boolean {
  const phase = billingQuote(state, now).phase;
  switch (phase) {
    case "free_tier":
    case "trial":
    case "active":
      return true;
    case "trial_ended":
    case "cancelled":
      return false;
    default: {
      const exhaustive: never = phase;
      return exhaustive;
    }
  }
}
