import { router } from "expo-router";
import { Pressable, View } from "react-native";

import { useStore } from "../data/store";
import { dayKey, formatDay, formatWhen, personName } from "../domain/format";
import type { Lesson } from "../domain/types";
import { useI18n } from "../i18n/use-i18n";
import { AppText, Card, Pill } from "../ui/components";
import { colors } from "../ui/theme";
import { kindLabel, statusLabel, statusTone } from "./labels";

export function Agenda({ lessons, empty }: { lessons: Lesson[]; empty: string }) {
  const { data } = useStore();
  const { locale, t } = useI18n();
  if (lessons.length === 0) return <AppText style={{ color: colors.inkSoft }}>{empty}</AppText>;
  const groups = new Map<string, Lesson[]>();
  for (const lesson of [...lessons].sort((left, right) => left.start.localeCompare(right.start))) {
    const key = dayKey(lesson.start);
    groups.set(key, [...(groups.get(key) ?? []), lesson]);
  }
  return (
    <View style={{ gap: 12 }}>
      {[...groups.entries()].map(([day, items]) => (
        <View key={day} style={{ gap: 8 }}>
          <AppText weight="bold">{formatDay(locale, items[0]?.start ?? day)}</AppText>
          {items.map((lesson) => {
            const student = data.students.find((item) => item.id === lesson.studentId);
            return (
              <Pressable key={lesson.id} onPress={() => router.push(`/lesson/${lesson.id}`)}>
                <Card>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                    <AppText weight="bold">{formatWhen(locale, lesson.start)}</AppText>
                    <Pill label={statusLabel(t, lesson.status)} tone={statusTone(lesson.status)} />
                  </View>
                  <AppText>{student ? personName(locale, student) : ""}</AppText>
                  <AppText style={{ color: colors.inkSoft }}>{kindLabel(t, lesson.kind)}</AppText>
                </Card>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
