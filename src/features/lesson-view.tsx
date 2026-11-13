import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { useStore } from "../data/store";
import { creditBalance } from "../domain/credits";
import { formatWhen, personName, tutorSubject } from "../domain/format";
import { lessonActions, type LessonAction } from "../domain/booking";
import { whatsappUrl } from "../domain/links";
import { openSlots } from "../domain/schedule";
import type { Actor } from "../domain/types";
import { explainError } from "../i18n/errors";
import { useI18n } from "../i18n/use-i18n";
import { AppText, Banner, Button, Card, Pill } from "../ui/components";
import { colors } from "../ui/theme";
import { kindLabel, statusLabel, statusTone } from "./labels";
import { reminderMessage } from "./share-text";
import { openUrl } from "./open-url";

export function LessonView({ lessonId }: { lessonId: string }) {
  const store = useStore();
  const { locale, t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const lesson = store.data.lessons.find((item) => item.id === lessonId);
  if (!lesson) return <Banner tone="red">{explainError(locale, "not_found")}</Banner>;
  const student = store.data.students.find((item) => item.id === lesson.studentId);
  const actor = currentActor(store.user);
  const actions = actor ? lessonActions(store.data, lesson.id, actor, new Date()) : [];
  const slots = openSlots(store.data, new Date(), 28).filter((slot) => slot.start !== lesson.start);

  const run = (action: LessonAction, slot?: { start: string; end: string }) => {
    const result =
      action === "confirm"
        ? store.confirmLesson(lesson.id)
        : action === "decline"
          ? store.declineLesson(lesson.id)
          : action === "cancel"
            ? store.cancelLesson(lesson.id, false)
            : action === "cancel_refund"
              ? store.cancelLesson(lesson.id, true)
              : action === "cancel_keep"
                ? store.cancelLesson(lesson.id, false)
                : action === "leave"
                  ? store.requestLeave(lesson.id)
                  : action === "complete"
                    ? store.markCompleted(lesson.id)
                    : action === "absent"
                      ? store.markAbsent(lesson.id)
                      : store.rescheduleLesson(lesson.id, slot ?? { start: lesson.start, end: lesson.end });
    if (!result.ok && result.error) setError(explainError(locale, result.error));
    else setError(null);
    if (action === "reschedule") setMoving(false);
  };

  const remind = () => {
    const message = reminderMessage(locale, {
      student: student ? personName(locale, student) : "",
      when: formatWhen(locale, lesson.start),
      subject: tutorSubject(locale, store.data.tutor),
    });
    openUrl(whatsappUrl(store.data.tutor.whatsappPhone, message));
  };

  return (
    <View style={{ gap: 12 }}>
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
          <AppText weight="bold">{formatWhen(locale, lesson.start)}</AppText>
          <Pill label={statusLabel(t, lesson.status)} tone={statusTone(lesson.status)} />
        </View>
        <AppText>{student ? personName(locale, student) : ""}</AppText>
        <AppText style={{ color: colors.inkSoft }}>
          {kindLabel(t, lesson.kind)}
          {lesson.seriesId ? ` · ${t.series}` : ""}
        </AppText>
        <AppText>{t.creditsLeft(creditBalance(store.data.ledger, lesson.studentId))}</AppText>
        {lesson.kind === "makeup" ? <AppText>{t.makeupSafe}</AppText> : null}
        {lesson.kind === "trial" ? <AppText>{t.trialFree}</AppText> : null}
      </Card>
      {!actor ? <Banner>{t.readOnlyLesson}</Banner> : null}
      {actions.length === 0 && actor && actor.kind !== "tutor" && (lesson.status === "confirmed" || lesson.status === "pending_confirm") ? (
        <AppText style={{ color: colors.inkSoft }}>{t.cutoffNote(store.data.tutor.cancelCutoffHours)}</AppText>
      ) : null}
      {actions.includes("confirm") ? <Button label={t.confirm} onPress={() => run("confirm")} /> : null}
      {actions.includes("decline") ? <Button kind="secondary" label={t.decline} onPress={() => run("decline")} /> : null}
      {actions.includes("complete") ? <Button label={t.complete} onPress={() => run("complete")} /> : null}
      {actions.includes("absent") ? <Button kind="secondary" label={t.markAbsent} onPress={() => run("absent")} /> : null}
      {actions.includes("leave") ? <Button kind="secondary" label={t.leave} onPress={() => run("leave")} /> : null}
      {actions.includes("reschedule") ? <Button kind="secondary" label={t.reschedule} onPress={() => setMoving((value) => !value)} /> : null}
      {actions.includes("cancel_refund") ? <Button kind="secondary" label={t.cancelRefund} onPress={() => run("cancel_refund")} /> : null}
      {actions.includes("cancel_keep") ? <Button kind="danger" label={t.cancelKeep} onPress={() => run("cancel_keep")} /> : null}
      {actions.includes("cancel") ? <Button kind="danger" label={t.cancelLesson} onPress={() => run("cancel")} /> : null}
      {lesson.paymentId ? <Button kind="secondary" label={t.openPayment} onPress={() => router.push(`/pay/${lesson.paymentId}`)} /> : null}
      {lesson.status === "confirmed" ? <Button kind="secondary" label={t.sendReminder} onPress={remind} /> : null}
      {moving ? (
        <View style={{ gap: 8 }}>
          {slots.map((slot) => (
            <Pressable key={slot.start} onPress={() => run("reschedule", slot)}>
              <Card>
                <AppText weight="bold">{formatWhen(locale, slot.start)}</AppText>
                <AppText style={{ color: colors.inkSoft }}>{t.moveHere}</AppText>
              </Card>
            </Pressable>
          ))}
        </View>
      ) : null}
      {error ? <Banner tone="red">{error}</Banner> : null}
    </View>
  );
}

function currentActor(user: { id: string; role: "tutor" | "parent" | "student" } | null): Actor | null {
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
}
