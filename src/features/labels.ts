import type { Dictionary } from "../i18n/dictionary";
import type { LedgerReason, LessonKind, LessonStatus } from "../domain/types";

export function statusLabel(t: Dictionary, status: LessonStatus): string {
  switch (status) {
    case "pending_payment":
      return t.statusPendingPayment;
    case "pending_confirm":
      return t.statusPendingConfirm;
    case "confirmed":
      return t.statusConfirmed;
    case "completed":
      return t.statusCompleted;
    case "cancelled":
      return t.statusCancelled;
    case "absent":
      return t.statusAbsent;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export function statusTone(status: LessonStatus): "neutral" | "teal" | "amber" | "red" | "green" {
  switch (status) {
    case "pending_payment":
    case "pending_confirm":
      return "amber";
    case "confirmed":
      return "teal";
    case "completed":
      return "green";
    case "cancelled":
    case "absent":
      return "red";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export function kindLabel(t: Dictionary, kind: LessonKind): string {
  switch (kind) {
    case "single":
      return t.kindSingle;
    case "weekly":
      return t.kindWeekly;
    case "trial":
      return t.kindTrial;
    case "makeup":
      return t.kindMakeup;
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

export function reasonLabel(t: Dictionary, reason: LedgerReason): string {
  switch (reason) {
    case "package_purchase":
      return t.reasonPurchase;
    case "book":
      return t.reasonBook;
    case "cancel_refund":
      return t.reasonRefund;
    case "trial":
      return t.reasonTrial;
    case "makeup":
      return t.reasonMakeup;
    default: {
      const exhaustive: never = reason;
      return exhaustive;
    }
  }
}
