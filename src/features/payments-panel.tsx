import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { useStore } from "../data/store";
import { bankName, formatHkd, formatPhone, personName } from "../domain/format";
import { absoluteUrl, payPath, whatsappUrl } from "../domain/links";
import type { PayMethod, PayStatus } from "../domain/types";
import { explainError } from "../i18n/errors";
import { useI18n } from "../i18n/use-i18n";
import { AppText, Banner, Button, Card, Field } from "../ui/components";
import { currentOrigin } from "../ui/origin";
import { colors } from "../ui/theme";
import { copyText, openUrl } from "./open-url";
import { paymentMessage } from "./share-text";

export function PaymentsPanel() {
  const store = useStore();
  const { locale, t } = useI18n();
  const [fps, setFps] = useState(store.data.tutor.fpsId);
  const [bank, setBank] = useState(bankName(locale, store.data.tutor));
  const [account, setAccount] = useState(store.data.tutor.bankAccount);
  const [phone, setPhone] = useState(store.data.tutor.whatsappPhone);
  const [error, setError] = useState<string | null>(null);
  const outstanding = store.data.payments.filter((payment) => payment.status === "requested").reduce((sum, payment) => sum + payment.amountHkd, 0);
  const received = store.data.payments.filter((payment) => payment.status === "received").reduce((sum, payment) => sum + payment.amountHkd, 0);

  return (
    <View style={{ gap: 12 }}>
      <Card>
        <AppText weight="bold">{t.reconciliation}</AppText>
        <AppText>{t.outstanding(formatHkd(locale, outstanding))}</AppText>
        <AppText>{t.receivedTotal(formatHkd(locale, received))}</AppText>
        <AppText style={{ color: colors.inkSoft }}>{t.markPaidHint}</AppText>
      </Card>
      {store.data.payments.length === 0 ? <AppText style={{ color: colors.inkSoft }}>{t.noPayments}</AppText> : null}
      {store.data.payments.map((payment) => {
        const student = store.data.students.find((item) => item.id === payment.studentId);
        return (
          <Card key={payment.id}>
            <AppText weight="bold">{student ? personName(locale, student) : ""}</AppText>
            <AppText>
              {formatHkd(locale, payment.amountHkd)} · {methodLabel(t, payment.method)} · {statusLabel(t, payment.status)}
            </AppText>
            <AppText>{t.lessonsCount(payment.lessonCount)}</AppText>
            <Button kind="secondary" label={t.openPayment} onPress={() => router.push(`/pay/${payment.id}`)} />
            {payment.status === "requested" && store.user?.role === "tutor" ? (
              <Button
                label={t.markReceived}
                onPress={() => {
                  const result = store.markPaymentReceived(payment.id);
                  setError(!result.ok && result.error ? explainError(locale, result.error) : null);
                }}
              />
            ) : null}
          </Card>
        );
      })}
      <Field label={t.fpsId} value={fps} onChangeText={setFps} onBlur={() => store.setPaymentDetails({ fpsId: fps })} />
      <Field
        label={t.bankName}
        value={bank}
        onChangeText={setBank}
        onBlur={() => {
          switch (locale) {
            case "en":
              store.setPaymentDetails({ bankNameEn: bank });
              break;
            case "zh-Hant":
              store.setPaymentDetails({ bankNameZh: bank });
              break;
            case "zh-Hans":
              store.setPaymentDetails({ bankNameHans: bank });
              break;
            default: {
              const exhaustive: never = locale;
              return exhaustive;
            }
          }
        }}
      />
      <Field label={t.account} value={account} onChangeText={setAccount} onBlur={() => store.setPaymentDetails({ bankAccount: account })} />
      <Field label={t.whatsappPhone} value={phone} onChangeText={setPhone} onBlur={() => store.setPaymentDetails({ whatsappPhone: phone })} />
      <AppText style={{ color: colors.inkSoft }}>{formatPhone(store.data.tutor.whatsappPhone)}</AppText>
      {error ? <Banner tone="red">{error}</Banner> : null}
    </View>
  );
}

export function PayPanel({ paymentId }: { paymentId: string }) {
  const store = useStore();
  const { locale, t } = useI18n();
  const [copied, setCopied] = useState("");
  const [error, setError] = useState<string | null>(null);
  const payment = store.data.payments.find((item) => item.id === paymentId);
  if (!payment) return <Banner tone="red">{explainError(locale, "not_found")}</Banner>;
  const student = store.data.students.find((item) => item.id === payment.studentId);
  const tutorUser = store.data.users.find((item) => item.id === store.data.tutor.userId);
  const link = absoluteUrl(currentOrigin(store.data.tutor.defaultWebOrigin), payPath(payment.id));
  const message = paymentMessage(locale, {
    tutor: tutorUser ? personName(locale, tutorUser) : "",
    student: student ? personName(locale, student) : "",
    amount: formatHkd(locale, payment.amountHkd),
    lessons: payment.lessonCount,
    method: methodLabel(t, payment.method),
    fps: store.data.tutor.fpsId,
    bank: bankName(locale, store.data.tutor),
    account: store.data.tutor.bankAccount,
    link,
  });
  const remember = async (label: string, value: string) => {
    await copyText(value);
    setCopied(label);
  };

  return (
    <View style={{ gap: 12 }}>
      <Card>
        <AppText weight="bold" style={{ fontSize: 28 }}>
          {formatHkd(locale, payment.amountHkd)}
        </AppText>
        <AppText>{student ? personName(locale, student) : ""}</AppText>
        <AppText>{t.lessonsCount(payment.lessonCount)} · {methodLabel(t, payment.method)}</AppText>
        <AppText>{statusLabel(t, payment.status)}</AppText>
        <AppText>{t.payOutside}</AppText>
      </Card>
      <Card>
        <AppText weight="bold">{t.fpsId}</AppText>
        <AppText>{store.data.tutor.fpsId}</AppText>
        <AppText weight="bold">{t.bankName}</AppText>
        <AppText>{bankName(locale, store.data.tutor)}</AppText>
        <AppText>{store.data.tutor.bankAccount}</AppText>
        <Button kind="secondary" label={copied === "fps" ? t.copied : t.copyFps} onPress={() => void remember("fps", store.data.tutor.fpsId)} />
        <Button kind="secondary" label={copied === "bank" ? t.copied : t.copyBank} onPress={() => void remember("bank", store.data.tutor.bankAccount)} />
        <Button kind="secondary" label={copied === "link" ? t.copied : t.copyLink} onPress={() => void remember("link", link)} />
        <Button label={t.whatsapp} onPress={() => openUrl(whatsappUrl(store.data.tutor.whatsappPhone, message))} />
      </Card>
      {payment.status === "requested" && store.user?.role === "tutor" ? (
        <Button
          label={t.markReceived}
          onPress={() => {
            const result = store.markPaymentReceived(payment.id);
            setError(!result.ok && result.error ? explainError(locale, result.error) : null);
          }}
        />
      ) : null}
      {error ? <Banner tone="red">{error}</Banner> : null}
    </View>
  );
}

function methodLabel(t: ReturnType<typeof useI18n>["t"], method: PayMethod): string {
  switch (method) {
    case "fps":
      return t.methodFps;
    case "bank_transfer":
      return t.methodBank;
    default: {
      const exhaustive: never = method;
      return exhaustive;
    }
  }
}

function statusLabel(t: ReturnType<typeof useI18n>["t"], status: PayStatus): string {
  switch (status) {
    case "requested":
      return t.paymentRequested;
    case "received":
      return t.paymentReceived;
    case "cancelled":
      return t.paymentCancelled;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}
