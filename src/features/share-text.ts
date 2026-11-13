import { byLocale } from "../domain/format";
import type { Locale } from "../domain/types";

export function paymentMessage(
  locale: Locale,
  input: { tutor: string; student: string; amount: string; lessons: number; method: string; fps: string; bank: string; account: string; link: string },
): string {
  return byLocale(locale, {
    en: `Hello, this is ${input.tutor}. Please pay tuition ${input.amount} by ${input.method} (${input.lessons} lessons, student: ${input.student}). FPS: ${input.fps}. Bank: ${input.bank} ${input.account}. I will mark it received in Book堂 after the transfer arrives. ${input.link}`,
    hant: `你好，我是${input.tutor}。請以${input.method}支付學費 ${input.amount}（${input.lessons} 堂，學生：${input.student}）。轉數快：${input.fps}。銀行：${input.bank} ${input.account}。我核對到帳後會在 Book堂 確認收款。${input.link}`,
    hans: `你好，我是${input.tutor}。请用${input.method}支付学费 ${input.amount}（${input.lessons} 节课，学生：${input.student}）。转数快：${input.fps}。银行：${input.bank} ${input.account}。我核对到账后，会在 Book堂 里确认收款。${input.link}`,
  });
}

export function reminderMessage(locale: Locale, input: { student: string; when: string; subject: string }): string {
  return byLocale(locale, {
    en: `Reminder: ${input.student} has ${input.subject} on ${input.when}.`,
    hant: `提醒：${input.student}於 ${input.when} 有${input.subject}。`,
    hans: `提醒：${input.student}在 ${input.when} 有${input.subject}。`,
  });
}

export function inviteMessage(locale: Locale, input: { tutor: string; url: string }): string {
  return byLocale(locale, {
    en: `${input.tutor} invited you to book a lesson in Book堂. You do not need to install the app first: ${input.url}`,
    hant: `${input.tutor}邀請你用 Book堂 預約課堂。不必先安裝應用程式：${input.url}`,
    hans: `${input.tutor}邀请你用 Book堂 预约课程。不用先安装应用：${input.url}`,
  });
}
