import { useStore } from "../../../data/store";
import { Agenda } from "../../../features/agenda";
import { Screen } from "../../../features/shell";
import { useI18n } from "../../../i18n/use-i18n";

export default function TimetableScreen() {
  const { data } = useStore();
  const { t } = useI18n();
  return (
    <Screen title={t.tabSchedule}>
      <Agenda lessons={data.lessons.filter((lesson) => lesson.status !== "cancelled")} empty={t.noLessons} />
    </Screen>
  );
}
