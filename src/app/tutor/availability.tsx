import { AvailabilityEditor } from "../../features/people";
import { BackButton, Screen } from "../../features/shell";
import { useI18n } from "../../i18n/use-i18n";

export default function AvailabilityScreen() {
  const { t } = useI18n();
  return (
    <Screen title={t.availability}>
      <BackButton />
      <AvailabilityEditor />
    </Screen>
  );
}
