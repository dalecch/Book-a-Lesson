import { useStore } from "../../data/store";
import { BookPanel } from "../../features/book-panel";
import { Screen } from "../../features/shell";
import { useI18n } from "../../i18n/use-i18n";
import { Banner } from "../../ui/components";

export default function StudentBookScreen() {
  const { user, data } = useStore();
  const { t } = useI18n();
  const student = data.students.find((item) => item.studentUserId === user?.id);
  return (
    <Screen title={t.bookTitle}>
      {student ? <BookPanel studentId={student.id} /> : <Banner tone="red">{t.noStudents}</Banner>}
    </Screen>
  );
}
