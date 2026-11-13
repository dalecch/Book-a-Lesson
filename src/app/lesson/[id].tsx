import { useLocalSearchParams } from "expo-router";

import { LessonView } from "../../features/lesson-view";
import { BackButton, Screen } from "../../features/shell";
import { useI18n } from "../../i18n/use-i18n";
import { oneParam } from "../../ui/origin";

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  return (
    <Screen title={t.upcoming}>
      <BackButton />
      <LessonView lessonId={oneParam(id)} />
    </Screen>
  );
}
