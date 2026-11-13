import { StudentList } from "../../../features/people";
import { Screen } from "../../../features/shell";
import { useI18n } from "../../../i18n/use-i18n";

export default function StudentsScreen() {
  const { t } = useI18n();
  return (
    <Screen title={t.tabStudents}>
      <StudentList />
    </Screen>
  );
}
