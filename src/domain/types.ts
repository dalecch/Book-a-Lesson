export type Locale = "en" | "zh-Hant" | "zh-Hans";

export type Role = "tutor" | "parent" | "student";

export type ConfirmMode = "instant" | "tutor_confirm";

export type SubscriptionStatus = "trial" | "active" | "cancelled";

export type BillingPhase = "free_tier" | "trial" | "active" | "trial_ended" | "cancelled";

export type LessonKind = "single" | "weekly" | "trial" | "makeup";

export type LessonStatus =
  | "pending_payment"
  | "pending_confirm"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "absent";

export type LedgerReason = "package_purchase" | "book" | "cancel_refund" | "trial" | "makeup";

export type EntitlementStatus = "open" | "used";

export type PayMethod = "fps" | "bank_transfer";

export type PayStatus = "requested" | "received" | "cancelled";

export type Checkout = "credit" | PayMethod;

export type PromoType = "amount" | "percent";

export type ActorKind = "tutor" | "parent" | "student";

export interface User {
  id: string;
  role: Role;
  email: string;
  password: string;
  nameEn: string;
  nameZh: string;
  nameHans: string;
  phone: string;
}

export interface TutorSettings {
  userId: string;
  slug: string;
  subjectEn: string;
  subjectZh: string;
  subjectHans: string;
  bioEn: string;
  bioZh: string;
  bioHans: string;
  monthlyFeeHkd: number;
  freeStudentLimit: number;
  lessonRateHkd: number;
  confirmMode: ConfirmMode;
  cancelCutoffHours: number;
  fpsId: string;
  bankNameEn: string;
  bankNameZh: string;
  bankNameHans: string;
  bankAccount: string;
  whatsappPhone: string;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: string;
  promoCode: string | null;
  defaultWebOrigin: string;
}

export interface Student {
  id: string;
  tutorId: string;
  parentId: string | null;
  studentUserId: string | null;
  nameEn: string;
  nameZh: string;
  nameHans: string;
  trialUsed: boolean;
  active: boolean;
}

export interface AvailabilityBlock {
  id: string;
  weekday: number;
  start: string;
  end: string;
}

export interface Lesson {
  id: string;
  tutorId: string;
  studentId: string;
  seriesId: string | null;
  kind: LessonKind;
  status: LessonStatus;
  start: string;
  end: string;
  creditHeld: boolean;
  makeupEntitlementId: string | null;
  paymentId: string | null;
  rescheduleCount: number;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  studentId: string;
  lessonId: string | null;
  paymentId: string | null;
  delta: number;
  reason: LedgerReason;
  at: string;
}

export interface MakeupEntitlement {
  id: string;
  studentId: string;
  sourceLessonId: string;
  status: EntitlementStatus;
  makeupLessonId: string | null;
  createdAt: string;
}

export interface TuitionPayment {
  id: string;
  tutorId: string;
  studentId: string;
  amountHkd: number;
  lessonCount: number;
  method: PayMethod;
  status: PayStatus;
  lessonIds: string[];
  requestedAt: string;
  receivedAt: string | null;
}

export interface PromoCode {
  code: string;
  type: PromoType;
  value: number;
  validFrom: string;
  validUntil: string;
  labelEn: string;
  labelZh: string;
  labelHans: string;
}

export interface Invite {
  token: string;
  tutorId: string;
  role: "parent" | "student";
  studentId: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  titleEn: string;
  titleZh: string;
  titleHans: string;
  bodyEn: string;
  bodyZh: string;
  bodyHans: string;
  at: string;
  read: boolean;
  href: string;
}

export interface DemoState {
  users: User[];
  tutor: TutorSettings;
  students: Student[];
  availability: AvailabilityBlock[];
  lessons: Lesson[];
  ledger: LedgerEntry[];
  entitlements: MakeupEntitlement[];
  payments: TuitionPayment[];
  promos: PromoCode[];
  invites: Invite[];
  notifications: AppNotification[];
}

export interface Actor {
  kind: ActorKind;
  userId: string;
}

export type BookError =
  | "writes_disabled"
  | "inactive_student"
  | "not_found"
  | "past"
  | "bad_time"
  | "outside_availability"
  | "slot_taken"
  | "insufficient_credits"
  | "trial_already_used"
  | "no_makeup_entitlement"
  | "inside_cutoff"
  | "wrong_status"
  | "payment_closed"
  | "bad_count"
  | "forbidden"
  | "invariant";

export type SettingsError =
  | "bad_time"
  | "overlap"
  | "bad_number"
  | "promo_not_found"
  | "promo_expired"
  | "promo_not_yet"
  | "promo_invalid"
  | "not_found";

export interface BookSuccess {
  ok: true;
  state: DemoState;
  lessonIds: string[];
  paymentId: string | null;
}

export interface BookFailure {
  ok: false;
  error: BookError;
  available?: number;
  detail?: string;
}

export type BookResult = BookSuccess | BookFailure;

export type SettingsResult = { ok: true; state: DemoState } | { ok: false; error: SettingsError };

export type IdFactory = (prefix: string) => string;

export interface CommandContext {
  now: Date;
  id: IdFactory;
}
