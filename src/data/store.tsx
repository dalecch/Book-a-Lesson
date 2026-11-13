import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  bookMakeup,
  bookSingle,
  bookTrial,
  bookWeekly,
  cancelLesson,
  canBookStudent,
  confirmLesson,
  declineLesson,
  markAbsent,
  markCompleted,
  markPaymentReceived,
  requestLeave,
  requestPackage,
  rescheduleLesson,
} from "../domain/booking";
import { createSeed } from "./seed";
import { tutorSlug } from "../domain/demo";
import { randomId } from "../domain/ids";
import { billingQuote, writesEnabled } from "../domain/pricing";
import {
  activateSubscription,
  addAvailability,
  addPromoCode,
  applyPromoCode,
  cancelSubscription,
  clearPromoCode,
  removeAvailability,
  setConfirmMode,
  setCutoffHours,
  setLessonRate,
  setMonthlyFee,
  setPaymentDetails,
  setStudentActive,
} from "../domain/settings";
import type {
  Actor,
  AppNotification,
  Checkout,
  CommandContext,
  ConfirmMode,
  DemoState,
  Locale,
  PayMethod,
  PromoCode,
  User,
} from "../domain/types";
import type { AppError } from "../i18n/errors";
import type { BookResult, SettingsResult } from "../domain/types";

const STORAGE_KEY = "booklesson.demo.v2";

export interface UiResult {
  ok: boolean;
  error?: AppError;
  lessonId: string | null;
  paymentId: string | null;
}

interface StoreValue {
  ready: boolean;
  locale: Locale;
  user: User | null;
  data: DemoState;
  writesOpen: boolean;
  setLocale: (locale: Locale) => void;
  login: (email: string, password: string) => boolean;
  loginAs: (userId: string) => void;
  logout: () => void;
  resetDemo: () => void;
  quote: () => ReturnType<typeof billingQuote>;
  bookSingle: (input: { studentId: string; start: string; end: string; method: Checkout; inviteToken?: string }) => UiResult;
  bookWeekly: (input: { studentId: string; slots: { start: string; end: string }[]; method: Checkout; inviteToken?: string }) => UiResult;
  bookTrial: (input: { studentId: string; start: string; end: string; inviteToken?: string }) => UiResult;
  bookMakeup: (input: { studentId: string; start: string; end: string; inviteToken?: string }) => UiResult;
  confirmLesson: (lessonId: string) => UiResult;
  declineLesson: (lessonId: string) => UiResult;
  cancelLesson: (lessonId: string, refund: boolean) => UiResult;
  requestLeave: (lessonId: string) => UiResult;
  markCompleted: (lessonId: string) => UiResult;
  markAbsent: (lessonId: string) => UiResult;
  rescheduleLesson: (lessonId: string, slot: { start: string; end: string }) => UiResult;
  requestPackage: (studentId: string, lessonCount: number, method: PayMethod) => UiResult;
  markPaymentReceived: (paymentId: string) => UiResult;
  applyPromo: (code: string) => UiResult;
  clearPromo: () => void;
  setMonthlyFee: (amount: number) => UiResult;
  setLessonRate: (amount: number) => UiResult;
  setCutoff: (hours: number) => UiResult;
  setConfirmMode: (mode: ConfirmMode) => void;
  setPaymentDetails: (patch: Parameters<typeof setPaymentDetails>[1]) => void;
  activatePlan: () => void;
  cancelPlan: () => void;
  setStudentActive: (studentId: string, active: boolean) => void;
  addAvailability: (weekday: number, start: string, end: string) => UiResult;
  removeAvailability: (blockId: string) => void;
  addPromo: (promo: PromoCode) => UiResult;
  markAllRead: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function failure(error: AppError): UiResult {
  return { ok: false, error, lessonId: null, paymentId: null };
}

function success(lessonId: string | null, paymentId: string | null): UiResult {
  return { ok: true, lessonId, paymentId };
}

function isLocale(value: unknown): value is Locale {
  switch (value) {
    case "en":
    case "zh-Hant":
    case "zh-Hans":
      return true;
    default:
      return false;
  }
}

function isDemoState(value: unknown): value is DemoState {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<DemoState>;
  const user = record.users?.[0];
  return (
    Array.isArray(record.users) &&
    Boolean(user && "nameHans" in user) &&
    record.tutor?.slug === tutorSlug &&
    Boolean(record.tutor?.subjectHans) &&
    Array.isArray(record.lessons)
  );
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [locale, setLocaleState] = useState<Locale>("zh-Hant");
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [data, setDataState] = useState<DemoState>(() => createSeed(new Date()));
  const dataRef = useRef(data);
  const sessionRef = useRef(sessionUserId);
  dataRef.current = data;
  sessionRef.current = sessionUserId;

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw) as { schemaVersion?: number; locale?: Locale; sessionUserId?: string | null; data?: unknown };
        if (parsed.schemaVersion !== 2 || !isDemoState(parsed.data)) return;
        setDataState(parsed.data);
        if (isLocale(parsed.locale)) setLocaleState(parsed.locale);
        setSessionUserId(parsed.sessionUserId ?? null);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const payload = JSON.stringify({ schemaVersion: 2, locale, sessionUserId, data });
    void AsyncStorage.setItem(STORAGE_KEY, payload);
  }, [ready, locale, sessionUserId, data]);

  const value = useMemo<StoreValue>(() => {
    const command = (): CommandContext => ({ now: new Date(), id: randomId });
    const user = data.users.find((item) => item.id === sessionUserId) ?? null;

    const actor = (): Actor | null => {
      if (!user) return null;
      switch (user.role) {
        case "tutor":
        case "parent":
        case "student":
          return { kind: user.role, userId: user.id };
        default: {
          const exhaustive: never = user.role;
          return exhaustive;
        }
      }
    };

    const commit = (next: DemoState) => {
      dataRef.current = next;
      setDataState(next);
    };

    const pushNote = (state: DemoState, userId: string | null, note: Omit<AppNotification, "id" | "userId" | "at" | "read">): DemoState => {
      if (!userId || userId === sessionRef.current) return state;
      return {
        ...state,
        notifications: [
          { ...note, id: randomId("note"), userId, at: new Date().toISOString(), read: false },
          ...state.notifications,
        ],
      };
    };

    const tellOthers = (state: DemoState, studentId: string, note: Omit<AppNotification, "id" | "userId" | "at" | "read">): DemoState => {
      const student = state.students.find((item) => item.id === studentId);
      let next = pushNote(state, state.tutor.userId, note);
      next = pushNote(next, student?.parentId ?? null, note);
      next = pushNote(next, student?.studentUserId ?? null, note);
      return next;
    };

    const applyBook = (result: BookResult, studentId: string | null, note: Omit<AppNotification, "id" | "userId" | "at" | "read"> | null): UiResult => {
      if (!result.ok) return failure(result.error);
      const next = studentId && note ? tellOthers(result.state, studentId, note) : result.state;
      commit(next);
      return success(result.lessonIds[0] ?? null, result.paymentId);
    };

    const applySettings = (result: SettingsResult): UiResult => {
      if (!result.ok) return failure(result.error);
      commit(result.state);
      return success(null, null);
    };

    const requireActor = (): Actor | UiResult => actor() ?? failure("forbidden");

    return {
      ready,
      locale,
      user,
      data,
      writesOpen: writesEnabled(data, new Date()),
      setLocale: setLocaleState,
      login: (email, password) => {
        const found = dataRef.current.users.find(
          (item) => item.email.toLowerCase() === email.trim().toLowerCase() && item.password === password,
        );
        if (!found) return false;
        sessionRef.current = found.id;
        setSessionUserId(found.id);
        return true;
      },
      loginAs: (userId) => {
        sessionRef.current = userId;
        setSessionUserId(userId);
      },
      logout: () => {
        sessionRef.current = null;
        setSessionUserId(null);
      },
      resetDemo: () => {
        const fresh = createSeed(new Date());
        sessionRef.current = null;
        setSessionUserId(null);
        commit(fresh);
      },
      quote: () => billingQuote(dataRef.current, new Date()),
      bookSingle: (input) => {
        const current = dataRef.current;
        if (!canBookStudent(current, input.studentId, { userId: sessionRef.current, inviteToken: input.inviteToken })) {
          return failure("forbidden");
        }
        return applyBook(bookSingle(current, input, command()), input.studentId, {
          titleEn: "Lesson booked",
          titleZh: "已有新預約",
          titleHans: "有新的预约",
          bodyEn: "A lesson was booked from an open slot.",
          bodyZh: "有人預約了一個空檔。",
          bodyHans: "有人预约了一个空档。",
          href: "/tutor",
        });
      },
      bookWeekly: (input) => {
        const current = dataRef.current;
        if (!canBookStudent(current, input.studentId, { userId: sessionRef.current, inviteToken: input.inviteToken })) {
          return failure("forbidden");
        }
        return applyBook(bookWeekly(current, input, command()), input.studentId, {
          titleEn: "Weekly lessons booked",
          titleZh: "已預約每週課堂",
          titleHans: "已预约每周课程",
          bodyEn: "A weekly series was booked from open slots.",
          bodyZh: "有人預約了一組每週課堂。",
          bodyHans: "有人预约了一组每周课程。",
          href: "/tutor",
        });
      },
      bookTrial: (input) => {
        const current = dataRef.current;
        if (!canBookStudent(current, input.studentId, { userId: sessionRef.current, inviteToken: input.inviteToken })) {
          return failure("forbidden");
        }
        return applyBook(bookTrial(current, input, command()), input.studentId, {
          titleEn: "Trial lesson booked",
          titleZh: "已預約試堂",
          titleHans: "已预约试听",
          bodyEn: "A trial lesson was booked. It does not use credits.",
          bodyZh: "已預約試堂，不會扣堂數。",
          bodyHans: "已预约试听，不会扣课时。",
          href: "/tutor",
        });
      },
      bookMakeup: (input) => {
        const current = dataRef.current;
        if (!canBookStudent(current, input.studentId, { userId: sessionRef.current, inviteToken: input.inviteToken })) {
          return failure("forbidden");
        }
        return applyBook(bookMakeup(current, input, command()), input.studentId, {
          titleEn: "Makeup lesson booked",
          titleZh: "已預約補堂",
          titleHans: "已预约补课",
          bodyEn: "A makeup lesson was booked. The credit balance did not change.",
          bodyZh: "已預約補堂，堂數餘額沒有改變。",
          bodyHans: "已预约补课，课时余额没有变化。",
          href: "/tutor",
        });
      },
      confirmLesson: (lessonId) => {
        const who = requireActor();
        if ("ok" in who) return who;
        const current = dataRef.current;
        const lesson = current.lessons.find((item) => item.id === lessonId);
        return applyBook(confirmLesson(current, lessonId, who, command()), lesson?.studentId ?? null, {
          titleEn: "Lesson confirmed",
          titleZh: "課堂已確認",
          titleHans: "课程已确认",
          bodyEn: "The tutor confirmed a lesson.",
          bodyZh: "導師已確認課堂。",
          bodyHans: "老师已确认这节课。",
          href: `/lesson/${lessonId}`,
        });
      },
      declineLesson: (lessonId) => {
        const who = requireActor();
        if ("ok" in who) return who;
        const current = dataRef.current;
        const lesson = current.lessons.find((item) => item.id === lessonId);
        return applyBook(declineLesson(current, lessonId, who, command()), lesson?.studentId ?? null, {
          titleEn: "Booking declined",
          titleZh: "預約未獲確認",
          titleHans: "预约未通过",
          bodyEn: "The tutor declined a booking. A held credit was returned.",
          bodyZh: "導師沒有確認這項預約。已扣的堂數已退回。",
          bodyHans: "老师没有确认这项预约。已扣的课时已退回。",
          href: `/lesson/${lessonId}`,
        });
      },
      cancelLesson: (lessonId, refund) => {
        const who = requireActor();
        if ("ok" in who) return who;
        const current = dataRef.current;
        const lesson = current.lessons.find((item) => item.id === lessonId);
        return applyBook(cancelLesson(current, lessonId, who, refund, command()), lesson?.studentId ?? null, {
          titleEn: "Lesson cancelled",
          titleZh: "課堂已取消",
          titleHans: "课程已取消",
          bodyEn: refund ? "A lesson was cancelled and the credit was returned." : "A lesson was cancelled.",
          bodyZh: refund ? "課堂已取消，堂數已退回。" : "課堂已取消。",
          bodyHans: refund ? "课程已取消，课时已退回。" : "课程已取消。",
          href: `/lesson/${lessonId}`,
        });
      },
      requestLeave: (lessonId) => {
        const who = requireActor();
        if ("ok" in who) return who;
        const current = dataRef.current;
        const lesson = current.lessons.find((item) => item.id === lessonId);
        return applyBook(requestLeave(current, lessonId, who, command()), lesson?.studentId ?? null, {
          titleEn: "Leave requested",
          titleZh: "已請假",
          titleHans: "已请假",
          bodyEn: "Leave was requested. The credit stays used and one makeup lesson is available.",
          bodyZh: "已請假。堂數維持已扣，並可補一堂。",
          bodyHans: "已请假。课时仍然算已用，并可以补一节课。",
          href: `/lesson/${lessonId}`,
        });
      },
      markCompleted: (lessonId) => {
        const who = requireActor();
        if ("ok" in who) return who;
        return applyBook(markCompleted(dataRef.current, lessonId, who, command()), null, null);
      },
      markAbsent: (lessonId) => {
        const who = requireActor();
        if ("ok" in who) return who;
        const current = dataRef.current;
        const lesson = current.lessons.find((item) => item.id === lessonId);
        return applyBook(markAbsent(current, lessonId, who, command()), lesson?.studentId ?? null, {
          titleEn: "Marked absent",
          titleZh: "已標記缺席",
          titleHans: "已标为缺席",
          bodyEn: "The lesson was marked absent. One makeup lesson is available and the balance did not change.",
          bodyZh: "課堂已標記缺席。可補一堂，堂數餘額沒有改變。",
          bodyHans: "这节课已标为缺席。可以补一节，课时余额没有变化。",
          href: `/lesson/${lessonId}`,
        });
      },
      rescheduleLesson: (lessonId, slot) => {
        const who = requireActor();
        if ("ok" in who) return who;
        const current = dataRef.current;
        const lesson = current.lessons.find((item) => item.id === lessonId);
        return applyBook(rescheduleLesson(current, lessonId, slot, who, command()), lesson?.studentId ?? null, {
          titleEn: "Lesson rescheduled",
          titleZh: "課堂已改期",
          titleHans: "课程已改时间",
          bodyEn: "A lesson was moved to another open slot. The credit balance did not change.",
          bodyZh: "課堂已改到另一個空檔。堂數餘額沒有改變。",
          bodyHans: "课程已改到另一个空档。课时余额没有变化。",
          href: `/lesson/${lessonId}`,
        });
      },
      requestPackage: (studentId, lessonCount, method) => {
        const current = dataRef.current;
        if (!canBookStudent(current, studentId, { userId: sessionRef.current })) return failure("forbidden");
        return applyBook(requestPackage(current, { studentId, lessonCount, method }, command()), studentId, {
          titleEn: "Tuition payment requested",
          titleZh: "已發出學費要求",
          titleHans: "已发出学费请求",
          bodyEn: "A package payment is waiting to be checked.",
          bodyZh: "有一筆堂數學費待核對。",
          bodyHans: "有一笔课时费等待核对。",
          href: "/tutor/payments",
        });
      },
      markPaymentReceived: (paymentId) => {
        const who = requireActor();
        if ("ok" in who) return who;
        const current = dataRef.current;
        const payment = current.payments.find((item) => item.id === paymentId);
        return applyBook(markPaymentReceived(current, paymentId, who, command()), payment?.studentId ?? null, {
          titleEn: "Tuition marked received",
          titleZh: "學費已確認收款",
          titleHans: "学费已确认到账",
          bodyEn: "The tutor confirmed a transfer and updated the credit balance.",
          bodyZh: "導師已確認轉帳，堂數已更新。",
          bodyHans: "老师已确认转账，课时已更新。",
          href: `/pay/${paymentId}`,
        });
      },
      applyPromo: (code) => applySettings(applyPromoCode(dataRef.current, code, new Date())),
      clearPromo: () => {
        const result = clearPromoCode(dataRef.current);
        if (result.ok) commit(result.state);
      },
      setMonthlyFee: (amount) => applySettings(setMonthlyFee(dataRef.current, amount)),
      setLessonRate: (amount) => applySettings(setLessonRate(dataRef.current, amount)),
      setCutoff: (hours) => applySettings(setCutoffHours(dataRef.current, hours)),
      setConfirmMode: (mode) => {
        const result = setConfirmMode(dataRef.current, mode);
        if (result.ok) commit(result.state);
      },
      setPaymentDetails: (patch) => {
        const result = setPaymentDetails(dataRef.current, patch);
        if (result.ok) commit(result.state);
      },
      activatePlan: () => {
        const result = activateSubscription(dataRef.current);
        if (result.ok) commit(result.state);
      },
      cancelPlan: () => {
        const result = cancelSubscription(dataRef.current);
        if (result.ok) commit(result.state);
      },
      setStudentActive: (studentId, active) => {
        const result = setStudentActive(dataRef.current, studentId, active);
        if (result.ok) commit(result.state);
      },
      addAvailability: (weekday, start, end) => applySettings(addAvailability(dataRef.current, weekday, start, end)),
      removeAvailability: (blockId) => {
        const result = removeAvailability(dataRef.current, blockId);
        if (result.ok) commit(result.state);
      },
      addPromo: (promo) => applySettings(addPromoCode(dataRef.current, promo)),
      markAllRead: () => {
        const current = dataRef.current;
        commit({
          ...current,
          notifications: current.notifications.map((item) =>
            item.userId === sessionRef.current ? { ...item, read: true } : item,
          ),
        });
      },
    };
  }, [data, locale, ready, sessionUserId]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("Store missing");
  return value;
}
