import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { useStore } from "../data/store";
import { creditBalance } from "../domain/credits";
import { formatHkd, formatWhen } from "../domain/format";
import type { PayMethod } from "../domain/types";
import { explainError } from "../i18n/errors";
import { useI18n } from "../i18n/use-i18n";
import { AppText, Banner, Button, Card, Segmented } from "../ui/components";
import { colors } from "../ui/theme";
import { reasonLabel } from "./labels";

export function CreditsPanel({ studentId, canRequest }: { studentId: string; canRequest: boolean }) {
  const store = useStore();
  const { locale, t } = useI18n();
  const [method, setMethod] = useState<PayMethod>("fps");
  const [error, setError] = useState<string | null>(null);
  const balance = creditBalance(store.data.ledger, studentId);
  const entries = store.data.ledger.filter((entry) => entry.studentId === studentId).slice().reverse();
  const makeups = store.data.entitlements.filter((entry) => entry.studentId === studentId);
  const payments = store.data.payments.filter((payment) => payment.studentId === studentId);

  const request = (lessonCount: number) => {
    const result = store.requestPackage(studentId, lessonCount, method);
    if (!result.ok && result.error) setError(explainError(locale, result.error));
    else if (result.paymentId) router.push(`/pay/${result.paymentId}`);
  };

  return (
    <View style={{ gap: 12 }}>
      <Card>
        <AppText style={{ color: colors.inkSoft }}>{t.balanceTitle}</AppText>
        <AppText weight="bold" style={{ fontSize: 40, lineHeight: 48 }}>
          {balance}
        </AppText>
        <AppText>{t.sharedNote}</AppText>
        {makeups.filter((item) => item.status === "open").length > 0 ? (
          <AppText>{t.makeupLeft(makeups.filter((item) => item.status === "open").length)}</AppText>
        ) : null}
      </Card>
      {canRequest ? (
        <Card>
          <AppText weight="bold">{t.requestPackage}</AppText>
          <Segmented
            value={method}
            options={[
              { value: "fps", label: t.payFps },
              { value: "bank_transfer", label: t.payBank },
            ]}
            onChange={setMethod}
          />
          <Button label={`${t.package4} · ${formatHkd(locale, store.data.tutor.lessonRateHkd * 4)}`} onPress={() => request(4)} />
          <Button kind="secondary" label={`${t.package8} · ${formatHkd(locale, store.data.tutor.lessonRateHkd * 8)}`} onPress={() => request(8)} />
        </Card>
      ) : (
        <AppText style={{ color: colors.inkSoft }}>{t.studentNotPayer}</AppText>
      )}
      {error ? <Banner tone="red">{error}</Banner> : null}
      {payments.map((payment) => (
        <Card key={payment.id}>
          <AppText weight="bold">{formatHkd(locale, payment.amountHkd)}</AppText>
          <AppText>{payment.status === "received" ? t.paymentReceived : payment.status === "cancelled" ? t.paymentCancelled : t.paymentRequested}</AppText>
          <Button kind="secondary" label={t.openPayment} onPress={() => router.push(`/pay/${payment.id}`)} />
        </Card>
      ))}
      <AppText weight="bold">{t.ledger}</AppText>
      {entries.length === 0 ? <AppText style={{ color: colors.inkSoft }}>{t.emptyLedger}</AppText> : null}
      {entries.map((entry) => (
        <Card key={entry.id}>
          <AppText weight="bold">
            {entry.delta > 0 ? `+${entry.delta}` : String(entry.delta)} · {reasonLabel(t, entry.reason)}
          </AppText>
          <AppText style={{ color: colors.inkSoft }}>{formatWhen(locale, entry.at)}</AppText>
        </Card>
      ))}
    </View>
  );
}
