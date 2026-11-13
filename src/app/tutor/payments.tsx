import { PaymentsPanel } from "../../features/payments-panel";
import { BackButton, Screen } from "../../features/shell";
import { useI18n } from "../../i18n/use-i18n";

export default function PaymentsScreen() {
  const { locale, t } = useI18n();
  return (
    <Screen title={t.payments}>
      <BackButton />
      <PaymentsPanel key={locale} />
    </Screen>
  );
}
