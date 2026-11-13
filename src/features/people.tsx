import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { useStore } from "../data/store";
import { creditBalance } from "../domain/credits";
import { formatWeekday, personName } from "../domain/format";
import { absoluteUrl, bookingPath, joinPath, whatsappUrl } from "../domain/links";
import type { Locale } from "../domain/types";
import { useI18n } from "../i18n/use-i18n";
import { AppText, Banner, Button, Card, Field, Segmented } from "../ui/components";
import { currentOrigin } from "../ui/origin";
import { colors } from "../ui/theme";
import { explainError } from "../i18n/errors";
import { Agenda } from "./agenda";
import { copyText, openUrl } from "./open-url";
import { inviteMessage } from "./share-text";

export function StudentList() {
  const store = useStore();
  const { locale, t } = useI18n();
  return (
    <View style={{ gap: 12 }}>
      {store.data.students.length === 0 ? <AppText>{t.noStudents}</AppText> : null}
      {store.data.students.map((student) => (
        <Card key={student.id}>
          <AppText weight="bold">{personName(locale, student)}</AppText>
          <AppText>{t.creditsLeft(creditBalance(store.data.ledger, student.id))}</AppText>
          <AppText style={{ color: colors.inkSoft }}>{student.active ? t.active : t.inactive}</AppText>
          <Button kind="secondary" label={t.view} onPress={() => router.push(`/tutor/student/${student.id}`)} />
        </Card>
      ))}
    </View>
  );
}

export function StudentDetail({ studentId }: { studentId: string }) {
  const store = useStore();
  const { locale, t } = useI18n();
  const [copied, setCopied] = useState("");
  const student = store.data.students.find((item) => item.id === studentId);
  if (!student) return <Banner tone="red">{explainError(locale, "not_found")}</Banner>;
  const tutor = store.data.users.find((item) => item.id === store.data.tutor.userId);
  const origin = currentOrigin(store.data.tutor.defaultWebOrigin);
  const invites = store.data.invites.filter((invite) => invite.studentId === student.id);
  return (
    <View style={{ gap: 12 }}>
      <Card>
        <AppText weight="bold" style={{ fontSize: 24 }}>
          {personName(locale, student)}
        </AppText>
        <AppText>{t.creditsLeft(creditBalance(store.data.ledger, student.id))}</AppText>
        <Button
          kind="secondary"
          label={student.active ? t.active : t.inactive}
          onPress={() => store.setStudentActive(student.id, !student.active)}
        />
      </Card>
      {invites.map((invite) => {
        const path = invite.role === "parent" ? bookingPath(store.data.tutor.slug, invite.token) : joinPath(invite.token);
        const url = absoluteUrl(origin, path);
        const message = inviteMessage(locale, { tutor: tutor ? personName(locale, tutor) : t.appName, url });
        return (
          <Card key={invite.token}>
            <AppText weight="bold">{invite.role === "parent" ? t.inviteParent : t.inviteStudent}</AppText>
            <View style={{ backgroundColor: colors.white, padding: 12, alignSelf: "center" }}>
              <QRCode value={url} size={180} />
            </View>
            <AppText selectable style={{ color: colors.inkSoft }}>
              {url}
            </AppText>
            <AppText style={{ color: colors.inkSoft }}>{t.qrHint}</AppText>
            <Button kind="secondary" label={copied === invite.token ? t.copied : t.copyLink} onPress={() => void copyText(url).then(() => setCopied(invite.token))} />
            <Button label={t.whatsapp} onPress={() => openUrl(whatsappUrl(store.data.tutor.whatsappPhone, message))} />
          </Card>
        );
      })}
      <Agenda lessons={store.data.lessons.filter((lesson) => lesson.studentId === student.id && lesson.status !== "cancelled")} empty={t.noLessons} />
    </View>
  );
}

export function AvailabilityEditor() {
  const store = useStore();
  const { locale, t } = useI18n();
  const [weekday, setWeekday] = useState("2");
  const [start, setStart] = useState("16:00");
  const [end, setEnd] = useState("17:00");
  const [error, setError] = useState<string | null>(null);
  return (
    <View style={{ gap: 12 }}>
      <AppText style={{ color: colors.inkSoft }}>{t.availabilityNote}</AppText>
      {!store.writesOpen ? <Banner>{t.writesPaused}</Banner> : null}
      {store.data.availability
        .slice()
        .sort((left, right) => left.weekday - right.weekday || left.start.localeCompare(right.start))
        .map((block) => (
          <Card key={block.id}>
            <AppText weight="bold">
              {formatWeekday(locale, block.weekday)} {block.start}–{block.end}
            </AppText>
            <Button kind="ghost" label={t.remove} onPress={() => store.removeAvailability(block.id)} />
          </Card>
        ))}
      <Segmented
        value={weekday}
        options={[1, 2, 3, 4, 5, 6, 0].map((day) => ({ value: String(day), label: formatWeekday(locale, day) }))}
        onChange={setWeekday}
      />
      <Field label={timeLabel(locale, "start")} value={start} onChangeText={setStart} placeholder="16:00" autoCapitalize="none" />
      <Field label={timeLabel(locale, "end")} value={end} onChangeText={setEnd} placeholder="17:00" autoCapitalize="none" />
      <Button
        label={t.addSlot}
        disabled={!store.writesOpen}
        onPress={() => {
          const result = store.addAvailability(Number(weekday), start, end);
          setError(!result.ok && result.error ? explainError(locale, result.error) : null);
        }}
      />
      {error ? <Banner tone="red">{error}</Banner> : null}
    </View>
  );
}

function timeLabel(locale: Locale, which: "start" | "end"): string {
  switch (locale) {
    case "en":
      return which === "start" ? "Start" : "End";
    case "zh-Hant":
      return which === "start" ? "開始" : "結束";
    case "zh-Hans":
      return which === "start" ? "开始" : "结束";
    default: {
      const exhaustive: never = locale;
      return exhaustive;
    }
  }
}
