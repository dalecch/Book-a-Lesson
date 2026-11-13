import { router } from "expo-router";
import { View } from "react-native";

import { useStore } from "../data/store";
import { creditBalance, openEntitlements } from "../domain/credits";
import { formatHkd, formatWhen, personName, tutorSubject } from "../domain/format";
import { whatsappUrl } from "../domain/links";
import { upcomingLessons } from "../domain/schedule";
import { useI18n } from "../i18n/use-i18n";
import { AppText, Button, Card } from "../ui/components";
import { colors } from "../ui/theme";
import { Agenda } from "./agenda";
import { openUrl } from "./open-url";
import { reminderMessage } from "./share-text";

export function TutorHome() {
  const store = useStore();
  const { locale, t } = useI18n();
  const quote = store.quote();
  const tutor = store.data.users.find((item) => item.id === store.data.tutor.userId);
  const now = new Date();
  const upcoming = upcomingLessons(store.data.lessons, now);
  const pendingPay = store.data.payments.filter((payment) => payment.status === "requested");
  const pendingConfirm = store.data.lessons.filter((lesson) => lesson.status === "pending_confirm");
  const reminders = upcoming.filter((lesson) => new Date(lesson.start).getTime() - now.getTime() <= 36 * 60 * 60 * 1000);
  return (
    <View style={{ gap: 12 }}>
      <AppText weight="bold" style={{ fontSize: 28, lineHeight: 36 }}>
        {t.hello(tutor ? personName(locale, tutor) : "")}
      </AppText>
      <Card>
        <AppText>{t.studentsCount(quote.activeStudents, quote.freeLimit)}</AppText>
        <AppText weight="bold">
          {formatHkd(locale, quote.payableNowHkd)} {t.perMonth}
        </AppText>
        <AppText style={{ color: colors.inkSoft }}>{store.data.tutor.confirmMode === "instant" ? t.confirmInstant : t.confirmManual}</AppText>
      </Card>
      <AppText weight="bold">{t.needsYou}</AppText>
      {pendingPay.length === 0 && pendingConfirm.length === 0 ? <AppText style={{ color: colors.inkSoft }}>{t.noneDue}</AppText> : null}
      {pendingPay.map((payment) => {
        const student = store.data.students.find((item) => item.id === payment.studentId);
        return (
          <Card key={payment.id}>
            <AppText weight="bold">{student ? personName(locale, student) : ""}</AppText>
            <AppText>
              {formatHkd(locale, payment.amountHkd)} · {t.paymentRequested}
            </AppText>
            <Button label={t.markReceived} onPress={() => router.push(`/pay/${payment.id}`)} />
          </Card>
        );
      })}
      {pendingConfirm.map((lesson) => {
        const student = store.data.students.find((item) => item.id === lesson.studentId);
        return (
          <Card key={lesson.id}>
            <AppText weight="bold">{student ? personName(locale, student) : ""}</AppText>
            <AppText>{formatWhen(locale, lesson.start)}</AppText>
            <Button kind="secondary" label={t.confirm} onPress={() => router.push(`/lesson/${lesson.id}`)} />
          </Card>
        );
      })}
      <Button kind="secondary" label={t.availability} onPress={() => router.push("/tutor/availability")} />
      <Button kind="secondary" label={t.payments} onPress={() => router.push("/tutor/payments")} />
      <AppText weight="bold">{t.upcoming}</AppText>
      <Agenda lessons={upcoming.slice(0, 6)} empty={t.noLessons} />
      <AppText weight="bold">{t.reminders}</AppText>
      {reminders.length === 0 ? <AppText style={{ color: colors.inkSoft }}>{t.noneDue}</AppText> : null}
      {reminders.map((lesson) => {
        const student = store.data.students.find((item) => item.id === lesson.studentId);
        return (
          <Button
            key={lesson.id}
            kind="secondary"
            label={`${t.sendReminder} · ${student ? personName(locale, student) : ""}`}
            onPress={() =>
              openUrl(
                whatsappUrl(
                  store.data.tutor.whatsappPhone,
                  reminderMessage(locale, {
                    student: student ? personName(locale, student) : "",
                    when: formatWhen(locale, lesson.start),
                    subject: tutorSubject(locale, store.data.tutor),
                  }),
                ),
              )
            }
          />
        );
      })}
    </View>
  );
}

export function FamilyHome({ mode }: { mode: "parent" | "student" }) {
  const store = useStore();
  const { locale, t } = useI18n();
  const student =
    mode === "parent"
      ? store.data.students.find((item) => item.parentId === store.user?.id)
      : store.data.students.find((item) => item.studentUserId === store.user?.id);
  if (!student || !store.user) return <AppText>{t.noLessons}</AppText>;
  const lessons = store.data.lessons.filter((lesson) => lesson.studentId === student.id);
  const upcoming = upcomingLessons(lessons, new Date());
  const makeups = openEntitlements(store.data, student.id).length;
  return (
    <View style={{ gap: 12 }}>
      <AppText weight="bold" style={{ fontSize: 28, lineHeight: 36 }}>
        {t.hello(personName(locale, store.user))}
      </AppText>
      <Card>
        <AppText weight="bold">{personName(locale, student)}</AppText>
        <AppText style={{ fontSize: 32, lineHeight: 40 }} weight="bold">
          {t.creditsLeft(creditBalance(store.data.ledger, student.id))}
        </AppText>
        {makeups > 0 ? <AppText>{t.makeupLeft(makeups)}</AppText> : null}
        <AppText style={{ color: colors.inkSoft }}>{t.sharedNote}</AppText>
        {mode === "student" ? <AppText style={{ color: colors.inkSoft }}>{t.studentNotPayer}</AppText> : null}
      </Card>
      <Button
        kind="secondary"
        label={t.whatsapp}
        onPress={() =>
          openUrl(
            whatsappUrl(
              store.data.tutor.whatsappPhone,
              reminderMessage(locale, {
                student: personName(locale, student),
                when: upcoming[0] ? formatWhen(locale, upcoming[0].start) : t.upcoming,
                subject: tutorSubject(locale, store.data.tutor),
              }),
            ),
          )
        }
      />
      <AppText weight="bold">{t.upcoming}</AppText>
      <Agenda lessons={upcoming} empty={t.noLessons} />
    </View>
  );
}
