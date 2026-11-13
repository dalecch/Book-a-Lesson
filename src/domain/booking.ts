import { auditCredits, creditBalance } from "./credits";
import { hkHm, hkWeekday } from "./hk";
import { writesEnabled } from "./pricing";
import { matchesAvailability, slotFree } from "./schedule";
import type {
  Actor,
  BookError,
  BookResult,
  Checkout,
  CommandContext,
  DemoState,
  Lesson,
  LessonKind,
  LessonStatus,
  PayMethod,
} from "./types";

// Credits move only through the ledger. Makeup and trial rows are always zero.
// A lesson holds at most one credit, and only cancel_refund puts it back.

function fail(error: BookError, extra?: { available?: number; detail?: string }): BookResult {
  return { ok: false, error, ...extra };
}

function commit(state: DemoState, lessonIds: string[], paymentId: string | null): BookResult {
  const problems = auditCredits(state);
  if (problems.length > 0) {
    return fail("invariant", { detail: problems.join("; ") });
  }
  return { ok: true, state, lessonIds, paymentId };
}

function studentGate(state: DemoState, studentId: string, now: Date): BookError | null {
  if (!writesEnabled(state, now)) return "writes_disabled";
  const student = state.students.find((item) => item.id === studentId);
  if (!student) return "not_found";
  if (!student.active) return "inactive_student";
  return null;
}

function slotGate(
  state: DemoState,
  start: string,
  end: string,
  now: Date,
  allowPast: boolean,
  ignoreLessonId?: string,
): BookError | null {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return "bad_time";
  if (!allowPast && startMs <= now.getTime()) return "past";
  if (!matchesAvailability(state, start, end)) return "outside_availability";
  if (!slotFree(state, start, end, ignoreLessonId)) return "slot_taken";
  return null;
}

function heldStatus(state: DemoState): Extract<LessonStatus, "confirmed" | "pending_confirm"> {
  switch (state.tutor.confirmMode) {
    case "instant":
      return "confirmed";
    case "tutor_confirm":
      return "pending_confirm";
    default: {
      const exhaustive: never = state.tutor.confirmMode;
      return exhaustive;
    }
  }
}

function isPayMethod(method: Checkout): method is PayMethod {
  switch (method) {
    case "fps":
    case "bank_transfer":
      return true;
    case "credit":
      return false;
    default: {
      const exhaustive: never = method;
      return exhaustive;
    }
  }
}

function withLedger(
  state: DemoState,
  entry: Omit<DemoState["ledger"][number], "id">,
  ctx: CommandContext,
): DemoState {
  return {
    ...state,
    ledger: [...state.ledger, { ...entry, id: ctx.id("ledger") }],
  };
}

function holdCredit(state: DemoState, studentId: string, lessonId: string, at: string, ctx: CommandContext): DemoState {
  return withLedger(
    state,
    { studentId, lessonId, paymentId: null, delta: -1, reason: "book", at },
    ctx,
  );
}

function refundCredit(state: DemoState, lesson: Lesson, at: string, ctx: CommandContext): DemoState {
  return withLedger(
    { ...state, lessons: state.lessons.map((item) => (item.id === lesson.id ? { ...item, creditHeld: false } : item)) },
    { studentId: lesson.studentId, lessonId: lesson.id, paymentId: null, delta: 1, reason: "cancel_refund", at },
    ctx,
  );
}

function baseLesson(
  state: DemoState,
  input: {
    id: string;
    studentId: string;
    kind: LessonKind;
    status: LessonStatus;
    start: string;
    end: string;
    creditHeld: boolean;
    seriesId: string | null;
    paymentId: string | null;
    makeupEntitlementId: string | null;
    at: string;
  },
): Lesson {
  return {
    id: input.id,
    tutorId: state.tutor.userId,
    studentId: input.studentId,
    seriesId: input.seriesId,
    kind: input.kind,
    status: input.status,
    start: input.start,
    end: input.end,
    creditHeld: input.creditHeld,
    makeupEntitlementId: input.makeupEntitlementId,
    paymentId: input.paymentId,
    rescheduleCount: 0,
    createdAt: input.at,
  };
}

function authorize(state: DemoState, lesson: Lesson, actor: Actor): BookError | null {
  if (actor.kind === "tutor") return actor.userId === state.tutor.userId ? null : "forbidden";
  const student = state.students.find((item) => item.id === lesson.studentId);
  if (!student) return "not_found";
  if (actor.kind === "parent") return student.parentId === actor.userId ? null : "forbidden";
  if (actor.kind === "student") return student.studentUserId === actor.userId ? null : "forbidden";
  const exhaustive: never = actor.kind;
  return exhaustive;
}

function beforeCutoff(state: DemoState, start: string, now: Date): boolean {
  return new Date(start).getTime() - now.getTime() >= state.tutor.cancelCutoffHours * 60 * 60 * 1000;
}

function findLesson(state: DemoState, lessonId: string): Lesson | undefined {
  return state.lessons.find((lesson) => lesson.id === lessonId);
}

function restoreMakeup(state: DemoState, lesson: Lesson): DemoState {
  if (!lesson.makeupEntitlementId) return state;
  return {
    ...state,
    entitlements: state.entitlements.map((entry) =>
      entry.id === lesson.makeupEntitlementId ? { ...entry, status: "open", makeupLessonId: null } : entry,
    ),
  };
}

function cancelPendingPayment(state: DemoState, lesson: Lesson): DemoState {
  const lessons = state.lessons.map((item) =>
    item.id === lesson.id ? { ...item, status: "cancelled" as const, creditHeld: false } : item,
  );
  const payments = state.payments.map((payment) => {
    if (payment.id !== lesson.paymentId || payment.status !== "requested") return payment;
    const lessonIds = payment.lessonIds.filter((id) => id !== lesson.id);
    if (lessonIds.length === 0) {
      return { ...payment, lessonIds, lessonCount: 0, amountHkd: 0, status: "cancelled" as const };
    }
    return {
      ...payment,
      lessonIds,
      lessonCount: lessonIds.length,
      amountHkd: lessonIds.length * state.tutor.lessonRateHkd,
    };
  });
  return { ...state, lessons, payments };
}

export function canBookStudent(
  state: DemoState,
  studentId: string,
  access: { userId: string | null; inviteToken?: string },
): boolean {
  const student = state.students.find((item) => item.id === studentId);
  if (!student || !student.active) return false;
  if (access.userId && access.userId === state.tutor.userId) return true;
  if (access.userId && student.parentId === access.userId) return true;
  if (access.userId && student.studentUserId === access.userId) return true;
  if (!access.inviteToken) return false;
  return state.invites.some((invite) => invite.token === access.inviteToken && invite.studentId === studentId);
}

export function bookSingle(
  state: DemoState,
  input: { studentId: string; start: string; end: string; method: Checkout; allowPast?: boolean },
  ctx: CommandContext,
): BookResult {
  const gate = studentGate(state, input.studentId, ctx.now);
  if (gate) return fail(gate);
  const slot = slotGate(state, input.start, input.end, ctx.now, input.allowPast === true);
  if (slot) return fail(slot);
  const at = ctx.now.toISOString();
  const lessonId = ctx.id("lesson");
  if (input.method === "credit") {
    if (creditBalance(state.ledger, input.studentId) < 1) return fail("insufficient_credits");
    const held = holdCredit(state, input.studentId, lessonId, at, ctx);
    const lesson = baseLesson(held, {
      id: lessonId,
      studentId: input.studentId,
      kind: "single",
      status: heldStatus(held),
      start: input.start,
      end: input.end,
      creditHeld: true,
      seriesId: null,
      paymentId: null,
      makeupEntitlementId: null,
      at,
    });
    return commit({ ...held, lessons: [...held.lessons, lesson] }, [lessonId], null);
  }
  if (!isPayMethod(input.method)) return fail("bad_time");
  const paymentId = ctx.id("payment");
  const lesson = baseLesson(state, {
    id: lessonId,
    studentId: input.studentId,
    kind: "single",
    status: "pending_payment",
    start: input.start,
    end: input.end,
    creditHeld: false,
    seriesId: null,
    paymentId,
    makeupEntitlementId: null,
    at,
  });
  const payment = {
    id: paymentId,
    tutorId: state.tutor.userId,
    studentId: input.studentId,
    amountHkd: state.tutor.lessonRateHkd,
    lessonCount: 1,
    method: input.method,
    status: "requested" as const,
    lessonIds: [lessonId],
    requestedAt: at,
    receivedAt: null,
  };
  return commit({ ...state, lessons: [...state.lessons, lesson], payments: [...state.payments, payment] }, [lessonId], paymentId);
}

export function bookWeekly(
  state: DemoState,
  input: { studentId: string; slots: { start: string; end: string }[]; method: Checkout },
  ctx: CommandContext,
): BookResult {
  if (input.slots.length < 1 || input.slots.length > 16) return fail("bad_count");
  const gate = studentGate(state, input.studentId, ctx.now);
  if (gate) return fail(gate);
  const first = input.slots[0];
  const weekday = hkWeekday(new Date(first.start));
  const startHm = hkHm(new Date(first.start));
  const endHm = hkHm(new Date(first.end));
  let previous = 0;
  const accepted: { start: string; end: string }[] = [];
  for (const slot of input.slots) {
    const problem = slotGate(state, slot.start, slot.end, ctx.now, false);
    if (problem) return fail(problem);
    const startMs = new Date(slot.start).getTime();
    const endMs = new Date(slot.end).getTime();
    if (startMs <= previous) return fail("bad_time");
    if (accepted.some((item) => startMs < new Date(item.end).getTime() && endMs > new Date(item.start).getTime())) {
      return fail("slot_taken");
    }
    previous = startMs;
    accepted.push(slot);
    if (hkWeekday(new Date(slot.start)) !== weekday || hkHm(new Date(slot.start)) !== startHm || hkHm(new Date(slot.end)) !== endHm) {
      return fail("outside_availability");
    }
  }
  if (input.method === "credit" && creditBalance(state.ledger, input.studentId) < input.slots.length) {
    return fail("insufficient_credits");
  }
  const at = ctx.now.toISOString();
  const seriesId = ctx.id("series");
  let next = state;
  const lessonIds: string[] = [];
  for (const slot of input.slots) {
    const lessonId = ctx.id("lesson");
    lessonIds.push(lessonId);
    if (input.method === "credit") next = holdCredit(next, input.studentId, lessonId, at, ctx);
    const lesson = baseLesson(next, {
      id: lessonId,
      studentId: input.studentId,
      kind: "weekly",
      status: input.method === "credit" ? heldStatus(next) : "pending_payment",
      start: slot.start,
      end: slot.end,
      creditHeld: input.method === "credit",
      seriesId,
      paymentId: null,
      makeupEntitlementId: null,
      at,
    });
    next = { ...next, lessons: [...next.lessons, lesson] };
  }
  if (input.method === "credit") return commit(next, lessonIds, null);
  if (!isPayMethod(input.method)) return fail("bad_time");
  const paymentId = ctx.id("payment");
  const payment = {
    id: paymentId,
    tutorId: state.tutor.userId,
    studentId: input.studentId,
    amountHkd: state.tutor.lessonRateHkd * lessonIds.length,
    lessonCount: lessonIds.length,
    method: input.method,
    status: "requested" as const,
    lessonIds,
    requestedAt: at,
    receivedAt: null,
  };
  next = {
    ...next,
    payments: [...next.payments, payment],
    lessons: next.lessons.map((lesson) => (lessonIds.includes(lesson.id) ? { ...lesson, paymentId } : lesson)),
  };
  return commit(next, lessonIds, paymentId);
}

export function bookTrial(
  state: DemoState,
  input: { studentId: string; start: string; end: string },
  ctx: CommandContext,
): BookResult {
  const gate = studentGate(state, input.studentId, ctx.now);
  if (gate) return fail(gate);
  const student = state.students.find((item) => item.id === input.studentId);
  if (!student) return fail("not_found");
  if (student.trialUsed) return fail("trial_already_used");
  const slot = slotGate(state, input.start, input.end, ctx.now, false);
  if (slot) return fail(slot);
  const at = ctx.now.toISOString();
  const lessonId = ctx.id("lesson");
  const withZero = withLedger(
    state,
    { studentId: input.studentId, lessonId, paymentId: null, delta: 0, reason: "trial", at },
    ctx,
  );
  const lesson = baseLesson(withZero, {
    id: lessonId,
    studentId: input.studentId,
    kind: "trial",
    status: heldStatus(withZero),
    start: input.start,
    end: input.end,
    creditHeld: false,
    seriesId: null,
    paymentId: null,
    makeupEntitlementId: null,
    at,
  });
  return commit(
    {
      ...withZero,
      lessons: [...withZero.lessons, lesson],
      students: withZero.students.map((item) => (item.id === input.studentId ? { ...item, trialUsed: true } : item)),
    },
    [lessonId],
    null,
  );
}

export function bookMakeup(
  state: DemoState,
  input: { studentId: string; start: string; end: string },
  ctx: CommandContext,
): BookResult {
  const gate = studentGate(state, input.studentId, ctx.now);
  if (gate) return fail(gate);
  const entitlement = state.entitlements.find((item) => item.studentId === input.studentId && item.status === "open");
  if (!entitlement) return fail("no_makeup_entitlement");
  const slot = slotGate(state, input.start, input.end, ctx.now, false);
  if (slot) return fail(slot);
  const at = ctx.now.toISOString();
  const lessonId = ctx.id("lesson");
  const withZero = withLedger(
    state,
    { studentId: input.studentId, lessonId, paymentId: null, delta: 0, reason: "makeup", at },
    ctx,
  );
  const lesson = baseLesson(withZero, {
    id: lessonId,
    studentId: input.studentId,
    kind: "makeup",
    status: heldStatus(withZero),
    start: input.start,
    end: input.end,
    creditHeld: false,
    seriesId: null,
    paymentId: null,
    makeupEntitlementId: entitlement.id,
    at,
  });
  return commit(
    {
      ...withZero,
      lessons: [...withZero.lessons, lesson],
      entitlements: withZero.entitlements.map((item) =>
        item.id === entitlement.id ? { ...item, status: "used", makeupLessonId: lessonId } : item,
      ),
    },
    [lessonId],
    null,
  );
}

export function confirmLesson(state: DemoState, lessonId: string, actor: Actor, ctx: CommandContext): BookResult {
  const lesson = findLesson(state, lessonId);
  if (!lesson) return fail("not_found");
  if (!writesEnabled(state, ctx.now)) return fail("writes_disabled");
  const allowed = authorize(state, lesson, actor);
  if (allowed) return fail(allowed);
  if (actor.kind !== "tutor") return fail("forbidden");
  if (lesson.status !== "pending_confirm") return fail("wrong_status");
  return commit(
    {
      ...state,
      lessons: state.lessons.map((item) => (item.id === lessonId ? { ...item, status: "confirmed" } : item)),
    },
    [lessonId],
    lesson.paymentId,
  );
}

export function declineLesson(state: DemoState, lessonId: string, actor: Actor, ctx: CommandContext): BookResult {
  const lesson = findLesson(state, lessonId);
  if (!lesson) return fail("not_found");
  if (!writesEnabled(state, ctx.now)) return fail("writes_disabled");
  const allowed = authorize(state, lesson, actor);
  if (allowed) return fail(allowed);
  if (actor.kind !== "tutor") return fail("forbidden");
  if (lesson.status !== "pending_confirm") return fail("wrong_status");
  let next = lesson.creditHeld ? refundCredit(state, lesson, ctx.now.toISOString(), ctx) : state;
  next = restoreMakeup(next, lesson);
  next = {
    ...next,
    lessons: next.lessons.map((item) =>
      item.id === lessonId ? { ...item, status: "cancelled", creditHeld: false } : item,
    ),
  };
  return commit(next, [lessonId], lesson.paymentId);
}

function finishCancel(state: DemoState, lesson: Lesson, refund: boolean, ctx: CommandContext): BookResult {
  if (lesson.status === "pending_payment") {
    return commit(cancelPendingPayment(state, lesson), [lesson.id], lesson.paymentId);
  }
  if (lesson.status !== "confirmed" && lesson.status !== "pending_confirm") return fail("wrong_status");
  let next = state;
  if (lesson.kind === "makeup") next = restoreMakeup(next, lesson);
  if (refund && lesson.creditHeld) next = refundCredit(next, lesson, ctx.now.toISOString(), ctx);
  next = {
    ...next,
    lessons: next.lessons.map((item) =>
      item.id === lesson.id ? { ...item, status: "cancelled", creditHeld: refund ? false : item.creditHeld } : item,
    ),
  };
  return commit(next, [lesson.id], lesson.paymentId);
}

export function cancelLesson(
  state: DemoState,
  lessonId: string,
  actor: Actor,
  refund: boolean,
  ctx: CommandContext,
): BookResult {
  const lesson = findLesson(state, lessonId);
  if (!lesson) return fail("not_found");
  if (!writesEnabled(state, ctx.now)) return fail("writes_disabled");
  const allowed = authorize(state, lesson, actor);
  if (allowed) return fail(allowed);
  if (actor.kind !== "tutor" && lesson.status !== "pending_payment" && !beforeCutoff(state, lesson.start, ctx.now)) {
    return fail("inside_cutoff");
  }
  const shouldRefund = actor.kind === "tutor" ? refund : lesson.creditHeld;
  return finishCancel(state, lesson, shouldRefund, ctx);
}

export function requestLeave(state: DemoState, lessonId: string, actor: Actor, ctx: CommandContext): BookResult {
  const lesson = findLesson(state, lessonId);
  if (!lesson) return fail("not_found");
  if (!writesEnabled(state, ctx.now)) return fail("writes_disabled");
  const allowed = authorize(state, lesson, actor);
  if (allowed) return fail(allowed);
  if (actor.kind === "tutor") return fail("forbidden");
  if (lesson.kind !== "single" && lesson.kind !== "weekly") return fail("wrong_status");
  if ((lesson.status !== "confirmed" && lesson.status !== "pending_confirm") || !lesson.creditHeld) {
    return fail("wrong_status");
  }
  if (!beforeCutoff(state, lesson.start, ctx.now)) return fail("inside_cutoff");
  if (state.entitlements.some((entry) => entry.sourceLessonId === lesson.id)) return fail("wrong_status");
  const at = ctx.now.toISOString();
  const entitlementId = ctx.id("makeup");
  return commit(
    {
      ...state,
      lessons: state.lessons.map((item) => (item.id === lesson.id ? { ...item, status: "absent" } : item)),
      entitlements: [
        ...state.entitlements,
        {
          id: entitlementId,
          studentId: lesson.studentId,
          sourceLessonId: lesson.id,
          status: "open",
          makeupLessonId: null,
          createdAt: at,
        },
      ],
    },
    [lesson.id],
    lesson.paymentId,
  );
}

export function markCompleted(state: DemoState, lessonId: string, actor: Actor, ctx: CommandContext): BookResult {
  const lesson = findLesson(state, lessonId);
  if (!lesson) return fail("not_found");
  if (!writesEnabled(state, ctx.now)) return fail("writes_disabled");
  const allowed = authorize(state, lesson, actor);
  if (allowed) return fail(allowed);
  if (actor.kind !== "tutor") return fail("forbidden");
  if (lesson.status !== "confirmed") return fail("wrong_status");
  return commit(
    {
      ...state,
      lessons: state.lessons.map((item) => (item.id === lesson.id ? { ...item, status: "completed" } : item)),
    },
    [lesson.id],
    lesson.paymentId,
  );
}

export function markAbsent(state: DemoState, lessonId: string, actor: Actor, ctx: CommandContext): BookResult {
  const lesson = findLesson(state, lessonId);
  if (!lesson) return fail("not_found");
  if (!writesEnabled(state, ctx.now)) return fail("writes_disabled");
  const allowed = authorize(state, lesson, actor);
  if (allowed) return fail(allowed);
  if (actor.kind !== "tutor") return fail("forbidden");
  if (lesson.status !== "confirmed" || !lesson.creditHeld) return fail("wrong_status");
  if (lesson.kind !== "single" && lesson.kind !== "weekly") return fail("wrong_status");
  if (state.entitlements.some((entry) => entry.sourceLessonId === lesson.id)) return fail("wrong_status");
  const at = ctx.now.toISOString();
  return commit(
    {
      ...state,
      lessons: state.lessons.map((item) => (item.id === lesson.id ? { ...item, status: "absent" } : item)),
      entitlements: [
        ...state.entitlements,
        {
          id: ctx.id("makeup"),
          studentId: lesson.studentId,
          sourceLessonId: lesson.id,
          status: "open",
          makeupLessonId: null,
          createdAt: at,
        },
      ],
    },
    [lesson.id],
    lesson.paymentId,
  );
}

export function rescheduleLesson(
  state: DemoState,
  lessonId: string,
  slot: { start: string; end: string },
  actor: Actor,
  ctx: CommandContext,
): BookResult {
  const lesson = findLesson(state, lessonId);
  if (!lesson) return fail("not_found");
  if (!writesEnabled(state, ctx.now)) return fail("writes_disabled");
  const allowed = authorize(state, lesson, actor);
  if (allowed) return fail(allowed);
  if (lesson.status !== "confirmed" && lesson.status !== "pending_confirm") return fail("wrong_status");
  if (actor.kind !== "tutor" && !beforeCutoff(state, lesson.start, ctx.now)) return fail("inside_cutoff");
  const slotProblem = slotGate(state, slot.start, slot.end, ctx.now, false, lesson.id);
  if (slotProblem) return fail(slotProblem);
  return commit(
    {
      ...state,
      lessons: state.lessons.map((item) =>
        item.id === lesson.id
          ? { ...item, start: slot.start, end: slot.end, rescheduleCount: item.rescheduleCount + 1 }
          : item,
      ),
    },
    [lesson.id],
    lesson.paymentId,
  );
}

export function requestPackage(
  state: DemoState,
  input: { studentId: string; lessonCount: number; method: PayMethod },
  ctx: CommandContext,
): BookResult {
  const gate = studentGate(state, input.studentId, ctx.now);
  if (gate) return fail(gate);
  if (!Number.isInteger(input.lessonCount) || input.lessonCount < 1 || input.lessonCount > 40) return fail("bad_count");
  const at = ctx.now.toISOString();
  const paymentId = ctx.id("payment");
  const payment = {
    id: paymentId,
    tutorId: state.tutor.userId,
    studentId: input.studentId,
    amountHkd: state.tutor.lessonRateHkd * input.lessonCount,
    lessonCount: input.lessonCount,
    method: input.method,
    status: "requested" as const,
    lessonIds: [] as string[],
    requestedAt: at,
    receivedAt: null,
  };
  return commit({ ...state, payments: [...state.payments, payment] }, [], paymentId);
}

export function markPaymentReceived(state: DemoState, paymentId: string, actor: Actor, ctx: CommandContext): BookResult {
  const payment = state.payments.find((item) => item.id === paymentId);
  if (!payment) return fail("not_found");
  if (actor.kind !== "tutor" || actor.userId !== state.tutor.userId) return fail("forbidden");
  if (!writesEnabled(state, ctx.now)) return fail("writes_disabled");
  if (payment.status === "received") return { ok: true, state, lessonIds: payment.lessonIds, paymentId };
  if (payment.status !== "requested") return fail("payment_closed");
  const at = ctx.now.toISOString();
  const already = state.ledger.some((entry) => entry.paymentId === payment.id && entry.reason === "package_purchase");
  let next = state;
  if (!already && payment.lessonCount > 0) {
    next = withLedger(
      next,
      {
        studentId: payment.studentId,
        lessonId: null,
        paymentId: payment.id,
        delta: payment.lessonCount,
        reason: "package_purchase",
        at,
      },
      ctx,
    );
  }
  for (const lessonId of payment.lessonIds) {
    const lesson = next.lessons.find((item) => item.id === lessonId);
    if (!lesson || lesson.status !== "pending_payment") continue;
    next = holdCredit(next, lesson.studentId, lesson.id, at, ctx);
    next = {
      ...next,
      lessons: next.lessons.map((item) =>
        item.id === lesson.id ? { ...item, creditHeld: true, status: heldStatus(next) } : item,
      ),
    };
  }
  next = {
    ...next,
    payments: next.payments.map((item) =>
      item.id === payment.id ? { ...item, status: "received", receivedAt: at } : item,
    ),
  };
  return commit(next, payment.lessonIds, payment.id);
}

export type LessonAction =
  | "confirm"
  | "decline"
  | "cancel"
  | "cancel_refund"
  | "cancel_keep"
  | "reschedule"
  | "leave"
  | "complete"
  | "absent";

export function lessonActions(state: DemoState, lessonId: string, actor: Actor, now: Date): LessonAction[] {
  const lesson = findLesson(state, lessonId);
  if (!lesson || !writesEnabled(state, now)) return [];
  if (authorize(state, lesson, actor)) return [];
  const actions: LessonAction[] = [];
  if (actor.kind === "tutor") {
    if (lesson.status === "pending_confirm") actions.push("confirm", "decline", "reschedule");
    if (lesson.status === "confirmed") {
      actions.push("complete", "reschedule");
      if (lesson.creditHeld && (lesson.kind === "single" || lesson.kind === "weekly")) actions.push("absent");
    }
    if (lesson.status === "confirmed" || lesson.status === "pending_payment") {
      if (lesson.creditHeld) actions.push("cancel_refund", "cancel_keep");
      else actions.push("cancel");
    }
    return actions;
  }
  if (lesson.status === "pending_payment") return ["cancel"];
  if (lesson.status === "confirmed" || lesson.status === "pending_confirm") {
    if (!beforeCutoff(state, lesson.start, now)) return [];
    actions.push("reschedule", "cancel");
    if (lesson.creditHeld && (lesson.kind === "single" || lesson.kind === "weekly")) actions.push("leave");
  }
  return actions;
}

export function isBeforeCutoff(state: DemoState, start: string, now: Date): boolean {
  return beforeCutoff(state, start, now);
}
