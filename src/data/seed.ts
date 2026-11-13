import {
  bookSingle,
  bookTrial,
  markAbsent,
  markCompleted,
  markPaymentReceived,
  requestPackage,
} from "../domain/booking";
import { demoAccounts, ids, tutorSlug } from "../domain/demo";
import { sequenceIds } from "../domain/ids";
import { nextWeeklySlots, previousOccurrence } from "../domain/schedule";
import type { Actor, BookResult, CommandContext, DemoState, IdFactory } from "../domain/types";

const tutor: Actor = { kind: "tutor", userId: ids.tutor };

function unwrap(result: BookResult, label: string): Extract<BookResult, { ok: true }> {
  if (!result.ok) {
    throw new Error(`${label}: ${result.error}${result.detail ? ` (${result.detail})` : ""}`);
  }
  return result;
}

function takeSlot(state: DemoState, now: Date, weekday: number, start: string, end: string) {
  const slot = nextWeeklySlots(state, now, weekday, start, end, 1)[0];
  if (!slot) throw new Error(`No open slot ${weekday} ${start}`);
  return slot;
}

export function createSeed(now: Date, id: IdFactory = sequenceIds("seed")): DemoState {
  const ctx: CommandContext = { now, id };
  const paidAt = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
  const paidCtx: CommandContext = { now: paidAt, id };
  let state: DemoState = {
    users: [
      {
        id: ids.tutor,
        role: "tutor",
        email: demoAccounts.tutorEmail,
        password: demoAccounts.password,
        nameEn: "Cheung Man Yee",
        nameZh: "張敏怡",
        nameHans: "张敏怡",
        phone: "85291234567",
      },
      {
        id: ids.parent,
        role: "parent",
        email: demoAccounts.parentEmail,
        password: demoAccounts.password,
        nameEn: "Mrs Chan",
        nameZh: "陳太",
        nameHans: "陈太",
        phone: "85292345678",
      },
      {
        id: ids.studentUser,
        role: "student",
        email: demoAccounts.studentEmail,
        password: demoAccounts.password,
        nameEn: "Chan Siu Ming",
        nameZh: "陳小明",
        nameHans: "陈小明",
        phone: "85293456789",
      },
    ],
    tutor: {
      userId: ids.tutor,
      slug: tutorSlug,
      subjectEn: "Primary maths",
      subjectZh: "小學數學",
      subjectHans: "小学数学",
      bioEn: "Lessons are booked by invitation. Parents pay the tutor directly by FPS or bank transfer.",
      bioZh: "課堂只經邀請預約。學費由家長直接以轉數快或銀行轉帳付給導師。",
      bioHans: "课程只通过邀请预约。学费由家长直接用转数快或银行转账付给老师。",
      monthlyFeeHkd: 98,
      freeStudentLimit: 2,
      lessonRateHkd: 300,
      confirmMode: "instant",
      cancelCutoffHours: 24,
      fpsId: "91234567",
      bankNameEn: "HSBC (demo)",
      bankNameZh: "滙豐（示範）",
      bankNameHans: "汇丰（演示）",
      bankAccount: "004-123456-838",
      whatsappPhone: "85291234567",
      subscriptionStatus: "trial",
      trialEndsAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      promoCode: null,
      defaultWebOrigin: "http://localhost:8081",
    },
    students: [
      {
        id: ids.ming,
        tutorId: ids.tutor,
        parentId: ids.parent,
        studentUserId: ids.studentUser,
        nameEn: "Chan Siu Ming",
        nameZh: "陳小明",
        nameHans: "陈小明",
        trialUsed: false,
        active: true,
      },
      {
        id: ids.tung,
        tutorId: ids.tutor,
        parentId: null,
        studentUserId: null,
        nameEn: "Lee Wing Tung",
        nameZh: "李詠桐",
        nameHans: "李咏桐",
        trialUsed: false,
        active: true,
      },
      {
        id: ids.ching,
        tutorId: ids.tutor,
        parentId: null,
        studentUserId: null,
        nameEn: "Wong Lok Ching",
        nameZh: "黃樂晴",
        nameHans: "黄乐晴",
        trialUsed: false,
        active: true,
      },
    ],
    availability: [
      { id: "av-tue-16", weekday: 2, start: "16:00", end: "17:00" },
      { id: "av-tue-17", weekday: 2, start: "17:00", end: "18:00" },
      { id: "av-thu-16", weekday: 4, start: "16:00", end: "17:00" },
      { id: "av-sat-10", weekday: 6, start: "10:00", end: "11:00" },
      { id: "av-sat-11", weekday: 6, start: "11:00", end: "12:00" },
    ],
    lessons: [],
    ledger: [],
    entitlements: [],
    payments: [],
    promos: [
      {
        code: "DEMO10",
        type: "amount",
        value: 10,
        validFrom: "2026-01-01",
        validUntil: "2027-12-31",
        labelEn: "Example: HKD 10 off the software fee",
        labelZh: "範例：軟件月費減 HKD 10",
        labelHans: "示例：软件月费减 HKD 10",
      },
      {
        code: "DEMO20PCT",
        type: "percent",
        value: 20,
        validFrom: "2026-01-01",
        validUntil: "2027-12-31",
        labelEn: "Example: 20% off the software fee",
        labelZh: "範例：軟件月費減 20%",
        labelHans: "示例：软件月费减 20%",
      },
      {
        code: "OLDDEMO",
        type: "amount",
        value: 50,
        validFrom: "2025-01-01",
        validUntil: "2026-01-01",
        labelEn: "Example: expired HKD 50 off",
        labelZh: "範例：已過期，減 HKD 50",
        labelHans: "示例：已过期，减 HKD 50",
      },
    ],
    invites: [
      { token: ids.inviteParentMing, tutorId: ids.tutor, role: "parent", studentId: ids.ming },
      { token: ids.inviteStudentMing, tutorId: ids.tutor, role: "student", studentId: ids.ming },
      { token: ids.inviteParentTung, tutorId: ids.tutor, role: "parent", studentId: ids.tung },
      { token: ids.inviteParentChing, tutorId: ids.tutor, role: "parent", studentId: ids.ching },
    ],
    notifications: [],
  };

  const mingPackage = unwrap(requestPackage(state, { studentId: ids.ming, lessonCount: 8, method: "bank_transfer" }, paidCtx), "ming package");
  state = mingPackage.state;
  state = unwrap(markPaymentReceived(state, mingPackage.paymentId ?? "", tutor, paidCtx), "ming paid").state;
  const mingPast = previousOccurrence(now, 2, "16:00", "17:00");
  const mingPastBooked = bookSingle(
    state,
    { studentId: ids.ming, start: mingPast.start, end: mingPast.end, method: "credit", allowPast: true },
    ctx,
  );
  const mingPastDone = unwrap(mingPastBooked, "ming past");
  state = mingPastDone.state;
  state = unwrap(markCompleted(state, mingPastDone.lessonIds[0] ?? "", tutor, ctx), "ming completed").state;
  const mingNext = takeSlot(state, now, 2, "16:00", "17:00");
  const mingNextBooked = unwrap(bookSingle(state, { studentId: ids.ming, ...mingNext, method: "credit" }, ctx), "ming next");
  state = mingNextBooked.state;
  const mingNextLessonId = mingNextBooked.lessonIds[0] ?? "";
  const mingAfter = takeSlot(state, now, 2, "16:00", "17:00");
  state = unwrap(bookSingle(state, { studentId: ids.ming, ...mingAfter, method: "credit" }, ctx), "ming after").state;

  const tungPackage = unwrap(requestPackage(state, { studentId: ids.tung, lessonCount: 4, method: "fps" }, paidCtx), "tung package");
  state = tungPackage.state;
  state = unwrap(markPaymentReceived(state, tungPackage.paymentId ?? "", tutor, paidCtx), "tung paid").state;
  const tungPast = previousOccurrence(now, 4, "16:00", "17:00");
  const tungPastBooked = bookSingle(
    state,
    { studentId: ids.tung, start: tungPast.start, end: tungPast.end, method: "credit", allowPast: true },
    ctx,
  );
  const tungPastDone = unwrap(tungPastBooked, "tung past");
  state = tungPastDone.state;
  state = unwrap(markAbsent(state, tungPastDone.lessonIds[0] ?? "", tutor, ctx), "tung absent").state;
  const tungNext = takeSlot(state, now, 6, "10:00", "11:00");
  state = unwrap(bookSingle(state, { studentId: ids.tung, ...tungNext, method: "credit" }, ctx), "tung next").state;

  const chingTrial = takeSlot(state, now, 6, "11:00", "12:00");
  state = unwrap(bookTrial(state, { studentId: ids.ching, start: chingTrial.start, end: chingTrial.end }, ctx), "ching trial").state;
  const chingPackage = unwrap(requestPackage(state, { studentId: ids.ching, lessonCount: 4, method: "fps" }, ctx), "ching request");
  state = chingPackage.state;

  const pendingId = chingPackage.paymentId ?? "";
  state = {
    ...state,
    notifications: [
      {
        id: id("note"),
        userId: ids.tutor,
        titleEn: "FPS payment to confirm",
        titleZh: "有一筆轉數快待確認",
        titleHans: "有一笔转数快待确认",
        bodyEn: "Wong Lok Ching asked to pay HKD 1,200 for 4 lessons by FPS.",
        bodyZh: "黃樂晴申請以轉數快支付 4 堂學費，合共 HKD 1,200。",
        bodyHans: "黄乐晴申请用转数快支付 4 节课的学费，一共 HKD 1,200。",
        at: now.toISOString(),
        read: false,
        href: `/pay/${pendingId}`,
      },
      {
        id: id("note"),
        userId: ids.parent,
        titleEn: "Upcoming maths lesson",
        titleZh: "即將上堂",
        titleHans: "即将上课",
        bodyEn: "Chan Siu Ming has a confirmed maths lesson. Attendance reminders can be sent on WhatsApp.",
        bodyZh: "陳小明有一堂已確認的數學課。可以經 WhatsApp 發送出席提醒。",
        bodyHans: "陈小明有一节已确认的数学课。可以用 WhatsApp 发送上课提醒。",
        at: now.toISOString(),
        read: false,
        href: `/lesson/${mingNextLessonId}`,
      },
    ],
  };
  return state;
}
