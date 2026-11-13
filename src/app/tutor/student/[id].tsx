import { useLocalSearchParams } from "expo-router";

import { StudentDetail } from "../../../features/people";
import { BackButton, Screen } from "../../../features/shell";
import { useI18n } from "../../../i18n/use-i18n";
import { oneParam } from "../../../ui/origin";

export default function StudentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  return (
    <Screen title={t.tabStudents}>
      <BackButton />
      <StudentDetail studentId={oneParam(id)} />
    </Screen>
  );
}
