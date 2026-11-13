import assert from "node:assert/strict";
import test from "node:test";

import { createSeed } from "../data/seed";
import {
  bookMakeup,
  bookSingle,
  bookTrial,
  bookWeekly,
  cancelLesson,
  canBookStudent,
  confirmLesson,
  declineLesson,
  markPaymentReceived,
  requestLeave,
  rescheduleLesson,
} from "./booking";
import { auditCredits, creditBalance, openEntitlements } from "./credits";
import { ids } from "./demo";
import { hkHm, hkWeekday, hkYmd } from "./hk";
import { sequenceIds } from "./ids";
import { dictionaryFor } from "../i18n/dictionary";
import { explainError } from "../i18n/errors";
import { whatsappUrl } from "./links";
import { billingQuote, writesEnabled } from "./pricing";
import { nextWeeklySlots, openSlots } from "./schedule";
import { activateSubscription, addPromoCode, applyPromoCode, cancelSubscription, setMonthlyFee, setStudentActive } from "./settings";
import type { Actor, BookResult, CommandContext, DemoState } from "./types";

const now = new Date("2026-11-13T10:00:00+08:00");
const tutor: Actor = { kind: "tutor", userId: ids.tutor };
const parent: Actor = { kind: "parent", userId: ids.parent };

const idsFactory = sequenceIds("test");

function ctx(at = now): CommandContext {
  return { now: at, id: idsFactory };
}

function apply(result: BookResult): DemoState {
  assert.equal(result.ok, true, result.ok ? "" : `${result.error} ${result.detail ?? ""}`);
  if (!result.ok) throw new Error("unreachable");
  assert.deepEqual(auditCredits(result.state), []);
  return result.state;
}

function balance(state: DemoState, studentId: string): number {
  return creditBalance(state.ledger, studentId);
}

test("Hong Kong clock round-trips a Friday afternoon", () => {
  assert.equal(hkYmd(now), "2026-11-13");
  assert.equal(hkWeekday(now), 5);
  assert.equal(hkHm(now), "10:00");
});

test("seed balances, makeup entitlement, and determinism", () => {
  const state = createSeed(now);
  assert.deepEqual(auditCredits(state), []);
  assert.equal(balance(state, ids.ming), 5);
  assert.equal(balance(state, ids.tung), 2);
  assert.equal(balance(state, ids.ching), 0);
  assert.equal(openEntitlements(state, ids.tung).length, 1);
  assert.equal(openEntitlements(state, ids.ming).length, 0);
  assert.equal(state.tutor.monthlyFeeHkd, 98);
  assert.equal(JSON.stringify(createSeed(now)), JSON.stringify(state));
});

test("makeup booking and cancellation do not change the credit balance", () => {
  const state = createSeed(now);
  const before = balance(state, ids.tung);
  const denied = bookMakeup(state, { studentId: ids.ming, ...openSlots(state, now, 21)[0] }, ctx());
  assert.equal(denied.ok, false);
  if (!denied.ok) assert.equal(denied.error, "no_makeup_entitlement");
  assert.equal(balance(state, ids.ming), 5);

  const slot = nextWeeklySlots(state, now, 2, "17:00", "18:00", 1)[0];
  const booked = apply(bookMakeup(state, { studentId: ids.tung, start: slot.start, end: slot.end }, ctx()));
  assert.equal(balance(booked, ids.tung), before);
  assert.equal(openEntitlements(booked, ids.tung).length, 0);
  const makeup = booked.lessons.find((lesson) => lesson.kind === "makeup" && lesson.studentId === ids.tung);
  assert.ok(makeup);
  assert.equal(makeup.creditHeld, false);
  const cancelled = apply(cancelLesson(booked, makeup.id, parent.userId === ids.parent ? { kind: "tutor", userId: ids.tutor } : tutor, true, ctx()));
  const restored = cancelled.lessons.find((lesson) => lesson.id === makeup.id);
  assert.equal(restored?.status, "cancelled");
  assert.equal(balance(cancelled, ids.tung), before);
  assert.equal(openEntitlements(cancelled, ids.tung).length, 1);
});

test("leave keeps the held credit and a later makeup spends the entitlement only", () => {
  let state = createSeed(now);
  const before = balance(state, ids.ming);
  const lesson = state.lessons.find((item) => item.studentId === ids.ming && item.status === "confirmed" && item.start > now.toISOString());
  assert.ok(lesson);
  state = apply(requestLeave(state, lesson.id, parent, ctx()));
  assert.equal(balance(state, ids.ming), before);
  assert.equal(state.lessons.find((item) => item.id === lesson.id)?.status, "absent");
  const slot = nextWeeklySlots(state, now, 2, "17:00", "18:00", 1)[0];
  state = apply(bookMakeup(state, { studentId: ids.ming, start: slot.start, end: slot.end }, ctx()));
  assert.equal(balance(state, ids.ming), before);
  assert.equal(state.ledger.filter((entry) => entry.studentId === ids.ming && entry.reason === "makeup").every((entry) => entry.delta === 0), true);
});

test("cancel before cutoff refunds one credit and a second cancel does not", () => {
  let state = createSeed(now);
  const slot = nextWeeklySlots(state, now, 4, "16:00", "17:00", 1)[0];
  const before = balance(state, ids.ming);
  const booked = apply(bookSingle(state, { studentId: ids.ming, start: slot.start, end: slot.end, method: "credit" }, ctx()));
  assert.equal(balance(booked, ids.ming), before - 1);
  const lessonId = booked.lessons.find((lesson) => lesson.start === slot.start)?.id ?? "";
  state = apply(cancelLesson(booked, lessonId, parent, true, ctx()));
  assert.equal(balance(state, ids.ming), before);
  const again = cancelLesson(state, lessonId, parent, true, ctx());
  assert.equal(again.ok, false);
  if (!again.ok) assert.equal(again.error, "wrong_status");
  assert.equal(balance(state, ids.ming), before);
});

test("inside the cutoff a parent cannot refund, and the tutor can keep the credit", () => {
  const state = createSeed(now);
  const lesson = state.lessons.find((item) => item.studentId === ids.ming && item.status === "confirmed" && item.start > now.toISOString());
  assert.ok(lesson);
  const late = new Date(new Date(lesson.start).getTime() - 2 * 60 * 60 * 1000);
  const blocked = cancelLesson(state, lesson.id, parent, true, { now: late, id: sequenceIds("late") });
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.equal(blocked.error, "inside_cutoff");
  assert.equal(balance(state, ids.ming), 5);
  const kept = apply(cancelLesson(state, lesson.id, tutor, false, { now: late, id: sequenceIds("keep") }));
  assert.equal(balance(kept, ids.ming), 5);
  assert.equal(kept.lessons.find((item) => item.id === lesson.id)?.creditHeld, true);
});

test("weekly credit booking, reschedule, and payment receipt stay balanced", () => {
  let state = createSeed(now);
  const slots = nextWeeklySlots(state, now, 2, "17:00", "18:00", 4);
  assert.equal(slots.length, 4);
  const before = balance(state, ids.ming);
  const untouched = JSON.stringify(state);
  const tooMany = bookWeekly(state, { studentId: ids.ming, slots: nextWeeklySlots(state, now, 2, "17:00", "18:00", 8), method: "credit" }, ctx());
  assert.equal(tooMany.ok, false);
  if (!tooMany.ok) assert.equal(tooMany.error, "insufficient_credits");
  assert.equal(JSON.stringify(state), untouched);

  state = apply(bookWeekly(state, { studentId: ids.ming, slots, method: "credit" }, ctx()));
  assert.equal(balance(state, ids.ming), before - 4);
  const first = state.lessons.find((lesson) => lesson.seriesId && lesson.start === slots[0].start);
  assert.ok(first);
  const movedTo = nextWeeklySlots(state, now, 4, "16:00", "17:00", 1)[0];
  state = apply(rescheduleLesson(state, first.id, movedTo, parent, ctx()));
  assert.equal(balance(state, ids.ming), before - 4);
  assert.equal(state.lessons.find((lesson) => lesson.id === first.id)?.start, movedTo.start);

  const fpsSlots = nextWeeklySlots(state, now, 6, "11:00", "12:00", 1);
  assert.equal(fpsSlots.length > 0, true);
  const requested = apply(bookWeekly(state, { studentId: ids.ching, slots: fpsSlots, method: "fps" }, ctx()));
  assert.equal(balance(requested, ids.ching), 0);
  const paymentId = requested.payments.find((payment) => payment.studentId === ids.ching && payment.lessonIds.length === 1)?.id ?? "";
  const received = apply(markPaymentReceived(requested, paymentId, tutor, ctx()));
  assert.equal(balance(received, ids.ching), 0);
  const again = apply(markPaymentReceived(received, paymentId, tutor, ctx()));
  assert.equal(again.ledger.length, received.ledger.length);
});

test("tutor confirmation holds a credit and decline releases it", () => {
  let state = createSeed(now);
  state = { ...state, tutor: { ...state.tutor, confirmMode: "tutor_confirm" } };
  const slot = nextWeeklySlots(state, now, 4, "16:00", "17:00", 1)[0];
  const before = balance(state, ids.ming);
  state = apply(bookSingle(state, { studentId: ids.ming, start: slot.start, end: slot.end, method: "credit" }, ctx()));
  const lesson = state.lessons.find((item) => item.start === slot.start);
  assert.equal(lesson?.status, "pending_confirm");
  assert.equal(balance(state, ids.ming), before - 1);
  const declined = apply(declineLesson(state, lesson?.id ?? "", tutor, ctx()));
  assert.equal(balance(declined, ids.ming), before);
  state = apply(bookSingle(declined, { studentId: ids.ming, start: slot.start, end: slot.end, method: "credit" }, ctx()));
  const pending = state.lessons.find((item) => item.start === slot.start && item.status === "pending_confirm");
  state = apply(confirmLesson(state, pending?.id ?? "", tutor, ctx()));
  assert.equal(balance(state, ids.ming), before - 1);
  assert.equal(state.lessons.find((item) => item.id === pending?.id)?.status, "confirmed");
});

test("a second trial is rejected and does not move credits", () => {
  const state = createSeed(now);
  const slot = nextWeeklySlots(state, now, 2, "17:00", "18:00", 1)[0];
  const result = bookTrial(state, { studentId: ids.ching, start: slot.start, end: slot.end }, ctx());
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, "trial_already_used");
  assert.equal(balance(state, ids.ching), 0);
});

test("package receipt is idempotent and a parent cannot mark it paid", () => {
  const state = createSeed(now);
  const payment = state.payments.find((item) => item.studentId === ids.ching && item.status === "requested");
  assert.ok(payment);
  assert.equal(payment.amountHkd, 1200);
  const denied = markPaymentReceived(state, payment.id, parent, ctx());
  assert.equal(denied.ok, false);
  const once = apply(markPaymentReceived(state, payment.id, tutor, ctx()));
  assert.equal(balance(once, ids.ching), 4);
  const twice = apply(markPaymentReceived(once, payment.id, tutor, ctx()));
  assert.equal(balance(twice, ids.ching), 4);
  assert.equal(twice.ledger.filter((entry) => entry.paymentId === payment.id).length, 1);
});

test("software fee, free tier, promo codes, and cancellation", () => {
  let state = createSeed(now);
  assert.equal(billingQuote(state, now).phase, "trial");
  assert.equal(billingQuote(state, now).payableNowHkd, 0);
  assert.equal(billingQuote(state, now).dueHkd, 98);
  state = applySettings(applyPromoCode(state, "DEMO10", now));
  assert.equal(billingQuote(state, now).dueHkd, 88);
  const expired = applyPromoCode(state, "OLDDEMO", now);
  assert.equal(expired.ok, false);
  assert.equal(state.tutor.promoCode, "DEMO10");
  state = applySettings(activateSubscription(state));
  assert.equal(billingQuote(state, now).phase, "active");
  assert.equal(billingQuote(state, now).payableNowHkd, 88);
  state = applySettings(applyPromoCode(state, "DEMO20PCT", now));
  assert.equal(billingQuote(state, now).dueHkd, 78);
  assert.equal(billingQuote(state, now).payableNowHkd, 78);
  state = applySettings(setStudentActive(state, ids.tung, false));
  state = applySettings(setStudentActive(state, ids.ching, false));
  assert.equal(billingQuote(state, now).phase, "free_tier");
  assert.equal(billingQuote(state, now).payableNowHkd, 0);
  state = applySettings(setStudentActive(state, ids.tung, true));
  state = applySettings(setStudentActive(state, ids.ching, true));
  state = applySettings(setMonthlyFee(state, 98));
  state = applySettings(addPromoCode(state, {
    code: "HALF",
    type: "percent",
    value: 100,
    validFrom: "2026-11-13",
    validUntil: "2026-11-13",
    labelEn: "Example: 100% off",
    labelZh: "範例：全免",
    labelHans: "示例：全免",
  }));
  state = applySettings(applyPromoCode(state, "HALF", now));
  assert.equal(billingQuote(state, now).dueHkd, 0);
  state = applySettings(cancelSubscription(state));
  assert.equal(writesEnabled(state, now), false);
  assert.equal(billingQuote(state, now).payableNowHkd, 0);
  const blocked = bookSingle(state, { studentId: ids.ming, ...nextWeeklySlots(state, now, 2, "17:00", "18:00", 1)[0], method: "credit" }, ctx());
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.equal(blocked.error, "writes_disabled");
  assert.equal(state.lessons.length > 0, true);
  assert.equal(balance(state, ids.ming), 5);
});

test("invite links can book and another parent cannot cancel", () => {
  const state = createSeed(now);
  assert.equal(canBookStudent(state, ids.ming, { userId: null, inviteToken: ids.inviteParentMing }), true);
  assert.equal(canBookStudent(state, ids.tung, { userId: ids.parent }), false);
  const lesson = state.lessons.find((item) => item.studentId === ids.tung && item.status === "confirmed");
  assert.ok(lesson);
  const forbidden = cancelLesson(state, lesson.id, parent, true, ctx());
  assert.equal(forbidden.ok, false);
  if (!forbidden.ok) assert.equal(forbidden.error, "forbidden");
});

test("simplified copy is a full locale, distinct from traditional", () => {
  const hans = dictionaryFor("zh-Hans");
  const hant = dictionaryFor("zh-Hant");
  assert.equal(hans.bookTitle, "预约课程");
  assert.equal(hant.bookTitle, "預約課堂");
  assert.notEqual(hans.rules(24), hant.rules(24));
  assert.match(explainError("zh-Hans", "insufficient_credits"), /课时/);
  assert.match(explainError("zh-Hant", "insufficient_credits"), /堂數/);
  assert.equal(explainError("en", "slot_taken"), "That time already has a lesson.");
});

test("whatsapp links keep the message and the Hong Kong number", () => {
  const url = whatsappUrl("+852 9123 4567", "請以轉數快支付 HKD 1,200");
  assert.equal(url.startsWith("https://wa.me/85291234567?text="), true);
  assert.equal(decodeURIComponent(url.split("text=")[1] ?? ""), "請以轉數快支付 HKD 1,200");
});

test("a taken slot is rejected without a ledger change", () => {
  const state = createSeed(now);
  const taken = state.lessons.find((lesson) => lesson.studentId === ids.ming && lesson.status === "confirmed");
  assert.ok(taken);
  const before = JSON.stringify(state);
  const result = bookSingle(state, { studentId: ids.tung, start: taken.start, end: taken.end, method: "credit" }, ctx());
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, "slot_taken");
  assert.equal(JSON.stringify(state), before);
});

function applySettings(result: { ok: true; state: DemoState } | { ok: false; error: string }): DemoState {
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.error);
  return result.state;
}
