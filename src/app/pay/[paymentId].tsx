import { useLocalSearchParams } from "expo-router";

import { PayPanel } from "../../features/payments-panel";
import { BackButton, Screen } from "../../features/shell";
import { useI18n } from "../../i18n/use-i18n";
import { oneParam } from "../../ui/origin";

export default function PayScreen() {
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const { t } = useI18n();
  return (
    <Screen title={t.payments}>
      <BackButton />
      <PayPanel paymentId={oneParam(paymentId)} />
    </Screen>
  );
}
