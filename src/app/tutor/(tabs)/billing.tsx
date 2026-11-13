import { BillingPanel } from "../../../features/billing-panel";
import { Screen } from "../../../features/shell";
import { useI18n } from "../../../i18n/use-i18n";

export default function BillingScreen() {
  const { t } = useI18n();
  return (
    <Screen title={t.softwareFee}>
      <BillingPanel />
    </Screen>
  );
}
