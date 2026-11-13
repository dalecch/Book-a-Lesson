import { useState } from "react";
import { View } from "react-native";

import { useStore } from "../data/store";
import { formatDay, formatHkd, promoLabel } from "../domain/format";
import type { BillingPhase, PromoType } from "../domain/types";
import { explainError, type AppError } from "../i18n/errors";
import { useI18n } from "../i18n/use-i18n";
import { AppText, Banner, Button, Card, Field, Segmented } from "../ui/components";
import { colors } from "../ui/theme";

export function BillingPanel() {
  const store = useStore();
  const { locale, t } = useI18n();
  const quote = store.quote();
  const [fee, setFee] = useState(String(store.data.tutor.monthlyFeeHkd));
  const [rate, setRate] = useState(String(store.data.tutor.lessonRateHkd));
  const [cutoff, setCutoff] = useState(String(store.data.tutor.cancelCutoffHours));
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [promoType, setPromoType] = useState<PromoType>("amount");
  const [promoValue, setPromoValue] = useState("10");
  const [promoFrom, setPromoFrom] = useState("2026-01-01");
  const [promoUntil, setPromoUntil] = useState("2027-12-31");
  const [promoCode, setPromoCode] = useState("");

  const saveNumber = (raw: string, apply: (value: number) => { ok: boolean; error?: AppError }) => {
    const result = apply(Number(raw));
    setError(!result.ok && result.error ? explainError(locale, result.error) : null);
  };

  return (
    <View style={{ gap: 12 }}>
      <Banner tone={quote.phase === "cancelled" || quote.phase === "trial_ended" ? "amber" : "teal"}>{phaseText(t, quote.phase, formatDay(locale, quote.trialEndsAt), quote.freeLimit)}</Banner>
      <Card>
        <AppText weight="bold">{t.softwareFee}</AppText>
        <AppText style={{ fontSize: 32, lineHeight: 40 }} weight="bold">
          {formatHkd(locale, quote.payableNowHkd)} {t.perMonth}
        </AppText>
        <AppText>{t.listPrice(formatHkd(locale, quote.listPriceHkd))}</AppText>
        <AppText>{t.duePrice(formatHkd(locale, quote.dueHkd))}</AppText>
        <AppText>{t.payable(formatHkd(locale, quote.payableNowHkd))}</AppText>
        <AppText>{t.studentsCount(quote.activeStudents, quote.freeLimit)}</AppText>
        <AppText style={{ color: colors.inkSoft }}>{t.feeNote}</AppText>
        <AppText style={{ color: colors.inkSoft }}>{t.noCard}</AppText>
        {quote.phase === "cancelled" ? <AppText>{t.runningWould(phaseText(t, quote.runningPhase, formatDay(locale, quote.trialEndsAt), quote.freeLimit))}</AppText> : null}
      </Card>
      <Field label={t.softwareFee} value={fee} onChangeText={setFee} keyboardType="number-pad" onBlur={() => saveNumber(fee, store.setMonthlyFee)} />
      <Field label={t.lessonRate} value={rate} onChangeText={setRate} keyboardType="number-pad" onBlur={() => saveNumber(rate, store.setLessonRate)} />
      <AppText style={{ color: colors.inkSoft }}>{t.lessonRateNote}</AppText>
      <Field label={t.cutoff} value={cutoff} onChangeText={setCutoff} keyboardType="number-pad" onBlur={() => saveNumber(cutoff, store.setCutoff)} />
      <AppText weight="bold">{t.confirmMode}</AppText>
      <Segmented
        value={store.data.tutor.confirmMode}
        options={[
          { value: "instant" as const, label: t.instant },
          { value: "tutor_confirm" as const, label: t.manual },
        ]}
        onChange={store.setConfirmMode}
      />
      <Card>
        <AppText weight="bold">{t.promoInput}</AppText>
        <AppText style={{ color: colors.inkSoft }}>{t.examplePromos}</AppText>
        {store.data.promos.map((promo) => (
          <Button key={promo.code} kind="secondary" label={`${promo.code} · ${promoLabel(locale, promo)}`} onPress={() => setCode(promo.code)} />
        ))}
        <Field label={t.promoInput} value={code} onChangeText={setCode} autoCapitalize="characters" />
        <Button
          label={t.applyPromo}
          onPress={() => {
            const result = store.applyPromo(code);
            setError(!result.ok && result.error ? explainError(locale, result.error) : null);
          }}
        />
        {store.data.tutor.promoCode ? <Button kind="ghost" label={t.clearPromo} onPress={store.clearPromo} /> : null}
      </Card>
      <Card>
        <AppText weight="bold">{t.addPromo}</AppText>
        <AppText style={{ color: colors.inkSoft }}>{t.addPromoHint}</AppText>
        <Field label={t.promoInput} value={promoCode} onChangeText={setPromoCode} autoCapitalize="characters" />
        <Segmented
          value={promoType}
          options={[
            { value: "amount" as const, label: t.amountOff },
            { value: "percent" as const, label: t.percent },
          ]}
          onChange={setPromoType}
        />
        <Field label={t.promoValue} value={promoValue} onChangeText={setPromoValue} keyboardType="number-pad" />
        <Field label={t.promoFrom} value={promoFrom} onChangeText={setPromoFrom} placeholder="2026-01-01" />
        <Field label={t.promoUntil} value={promoUntil} onChangeText={setPromoUntil} placeholder="2027-12-31" />
        <Button
          label={t.save}
          onPress={() => {
            const result = store.addPromo({
              code: promoCode,
              type: promoType,
              value: Number(promoValue),
              validFrom: promoFrom,
              validUntil: promoUntil,
              labelEn: `Example code ${promoCode.toUpperCase()}`,
              labelZh: `範例優惠碼 ${promoCode.toUpperCase()}`,
              labelHans: `示例优惠码 ${promoCode.toUpperCase()}`,
            });
            if (!result.ok && result.error) setError(explainError(locale, result.error));
            else setError(null);
          }}
        />
      </Card>
      {quote.phase === "cancelled" ? (
        <Button label={t.resumePlan} onPress={store.activatePlan} />
      ) : (
        <Button label={t.startPlan} onPress={store.activatePlan} />
      )}
      {quote.phase !== "cancelled" ? <Button kind="danger" label={t.cancelPlan} onPress={store.cancelPlan} /> : null}
      <AppText style={{ color: colors.inkSoft }}>{t.phaseCancelled}</AppText>
      {error ? <Banner tone="red">{error}</Banner> : null}
      <Button kind="ghost" label={t.resetDemo} onPress={store.resetDemo} />
    </View>
  );
}

function phaseText(t: ReturnType<typeof useI18n>["t"], phase: BillingPhase, trialDate: string, limit: number): string {
  switch (phase) {
    case "trial":
      return t.phaseTrial(trialDate);
    case "free_tier":
      return t.phaseFree(limit);
    case "active":
      return t.phaseActive;
    case "trial_ended":
      return t.phaseTrialEnded;
    case "cancelled":
      return t.phaseCancelled;
    default: {
      const exhaustive: never = phase;
      return exhaustive;
    }
  }
}
