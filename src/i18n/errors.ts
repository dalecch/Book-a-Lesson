import { byLocale } from "../domain/format";
import type { BookError, Locale, SettingsError } from "../domain/types";

export type AppError = BookError | SettingsError;

export function explainError(locale: Locale, error: AppError): string {
  switch (error) {
    case "writes_disabled":
      return byLocale(locale, {
        en: "New bookings are paused. Existing lessons and credits stay visible.",
        hant: "新預約已暫停，已有課堂和堂數仍可查看。",
        hans: "新的预约已暂停，已有课程和课时仍然可以查看。",
      });
    case "inactive_student":
      return byLocale(locale, { en: "This student is not active.", hant: "這位學生未啟用。", hans: "这名学生未启用。" });
    case "not_found":
      return byLocale(locale, { en: "That record could not be found.", hant: "找不到這項資料。", hans: "找不到这项资料。" });
    case "past":
      return byLocale(locale, { en: "That time is already in the past.", hant: "不能預約已經過去的時段。", hans: "不能预约已经过去的时间。" });
    case "bad_time":
      return byLocale(locale, { en: "That time is not valid.", hant: "時間不正確。", hans: "时间不正确。" });
    case "outside_availability":
      return byLocale(locale, { en: "That time is not an open slot.", hant: "這個時段不在可預約時間內。", hans: "这个时间不在可约范围内。" });
    case "slot_taken":
      return byLocale(locale, { en: "That time already has a lesson.", hant: "這個時段已經有課堂。", hans: "这个时间已经有课。" });
    case "insufficient_credits":
      return byLocale(locale, {
        en: "Not enough lesson credits. Request FPS or a bank transfer instead.",
        hant: "堂數不足。可以改為要求轉數快或銀行轉帳。",
        hans: "课时不够。可以改为请家长用转数快或银行转账。",
      });
    case "trial_already_used":
      return byLocale(locale, { en: "The trial lesson has already been used.", hant: "試堂已經用過。", hans: "试听已经用过了。" });
    case "no_makeup_entitlement":
      return byLocale(locale, {
        en: "There is no makeup credit to use, so the balance was not changed.",
        hant: "沒有可補的堂，所以不會改動堂數。",
        hans: "没有可补的课，所以课时余额没有变动。",
      });
    case "inside_cutoff":
      return byLocale(locale, {
        en: "The cutoff for rescheduling, leave, or cancellation has passed.",
        hant: "已過改期、請假或取消的時限。",
        hans: "已经过了改时间、请假或取消的时限。",
      });
    case "wrong_status":
      return byLocale(locale, { en: "That action is not available for this lesson.", hant: "這個課堂不能做這個操作。", hans: "这节课不能做这个操作。" });
    case "payment_closed":
      return byLocale(locale, { en: "This payment is already complete or cancelled.", hant: "這筆付款已完成或已取消。", hans: "这笔付款已经完成或已取消。" });
    case "bad_count":
      return byLocale(locale, { en: "That number of lessons is not valid.", hant: "堂數數量不正確。", hans: "课时数量不正确。" });
    case "forbidden":
      return byLocale(locale, { en: "You cannot manage this lesson.", hant: "你不能管理這個課堂。", hans: "你不能管理这节课。" });
    case "invariant":
      return byLocale(locale, { en: "Nothing was saved. The credit balance was not changed.", hant: "未能儲存。堂數沒有被改動。", hans: "没有保存。课时余额没有被改动。" });
    case "overlap":
      return byLocale(locale, { en: "That block overlaps an existing availability slot.", hant: "這段時間與現有可預約時段重疊。", hans: "这段时间和现有的可约时间重叠了。" });
    case "bad_number":
      return byLocale(locale, { en: "Enter a whole number in range.", hant: "請輸入有效整數。", hans: "请输入有效的整数。" });
    case "promo_not_found":
      return byLocale(locale, { en: "That promo code was not found.", hant: "找不到這個優惠碼。", hans: "找不到这个优惠码。" });
    case "promo_expired":
      return byLocale(locale, { en: "That promo code has expired.", hant: "這個優惠碼已過期。", hans: "这个优惠码已经过期。" });
    case "promo_not_yet":
      return byLocale(locale, { en: "That promo code is not valid yet.", hant: "這個優惠碼尚未生效。", hans: "这个优惠码还没到生效日期。" });
    case "promo_invalid":
      return byLocale(locale, { en: "That promo code is not valid.", hant: "優惠碼資料不正確。", hans: "优惠码信息不正确。" });
    default: {
      const exhaustive: never = error;
      return exhaustive;
    }
  }
}
