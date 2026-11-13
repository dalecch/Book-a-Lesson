import { InboxPanel } from "../features/inbox-panel";
import { BackButton, Screen } from "../features/shell";
import { useI18n } from "../i18n/use-i18n";

export default function InboxScreen() {
  const { t } = useI18n();
  return (
    <Screen title={t.inbox}>
      <BackButton />
      <InboxPanel />
    </Screen>
  );
}
