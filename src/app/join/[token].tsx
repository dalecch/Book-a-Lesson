import { Redirect, router, useLocalSearchParams } from "expo-router";

import { useStore } from "../../data/store";
import { personName, tutorSubject } from "../../domain/format";
import { bookingPath } from "../../domain/links";
import { upcomingLessons } from "../../domain/schedule";
import { Agenda } from "../../features/agenda";
import { CreditsPanel } from "../../features/credits-panel";
import { Screen } from "../../features/shell";
import { useI18n } from "../../i18n/use-i18n";
import { AppText, Banner, Button } from "../../ui/components";
import { oneParam } from "../../ui/origin";

export default function JoinScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const store = useStore();
  const { locale, t } = useI18n();
  const invite = store.data.invites.find((item) => item.token === oneParam(token));
  if (!invite) {
    return (
      <Screen title={t.appName}>
        <Banner tone="red">{t.invalidInvite}</Banner>
      </Screen>
    );
  }
  if (invite.role === "parent") {
    return <Redirect href={`${bookingPath(store.data.tutor.slug, invite.token)}`} />;
  }
  const student = store.data.students.find((item) => item.id === invite.studentId);
  if (!student) {
    return (
      <Screen title={t.appName}>
        <Banner tone="red">{t.invalidInvite}</Banner>
      </Screen>
    );
  }
  const lessons = upcomingLessons(
    store.data.lessons.filter((lesson) => lesson.studentId === student.id),
    new Date(),
  );
  return (
    <Screen title={personName(locale, student)}>
      <AppText>{tutorSubject(locale, store.data.tutor)}</AppText>
      <AppText>{t.sharedNote}</AppText>
      <Agenda lessons={lessons} empty={t.noLessons} />
      <CreditsPanel studentId={student.id} canRequest={false} />
      <Button label={t.bookTitle} onPress={() => router.push(bookingPath(store.data.tutor.slug, invite.token))} />
      {student.studentUserId ? (
        <Button
          kind="secondary"
          label={t.continueStudent}
          onPress={() => {
            store.loginAs(student.studentUserId ?? "");
            router.replace("/student");
          }}
        />
      ) : null}
    </Screen>
  );
}
