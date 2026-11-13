import { useStore } from "../../data/store";
import { CreditsPanel } from "../../features/credits-panel";
import { Screen } from "../../features/shell";
import { useI18n } from "../../i18n/use-i18n";
import { Banner } from "../../ui/components";

export default function ParentCreditsScreen() {
  const { user, data } = useStore();
  const { t } = useI18n();
  const student = data.students.find((item) => item.parentId === user?.id);
  return (
    <Screen title={t.balanceTitle}>
      {student ? <CreditsPanel studentId={student.id} canRequest /> : <Banner tone="red">{t.noStudents}</Banner>}
    </Screen>
  );
}
