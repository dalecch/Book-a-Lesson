import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { useStore } from "../data/store";
import { creditBalance, openEntitlements } from "../domain/credits";
import { formatWhen, personName } from "../domain/format";
import { hkHm, hkWeekday } from "../domain/hk";
import { nextWeeklySlots, openSlots } from "../domain/schedule";
import type { Checkout, LessonKind } from "../domain/types";
import { explainError } from "../i18n/errors";
import { useI18n } from "../i18n/use-i18n";
import { AppText, Banner, Button, Card, Segmented } from "../ui/components";
import { colors } from "../ui/theme";

export function BookPanel({ studentId, inviteToken }: { studentId: string; inviteToken?: string }) {
  const store = useStore();
  const { locale, t } = useI18n();
  const student = store.data.students.find((item) => item.id === studentId);
  const slots = openSlots(store.data, new Date(), 28);
  const balance = creditBalance(store.data.ledger, studentId);
  const makeups = openEntitlements(store.data, studentId).length;
  const [kind, setKind] = useState<LessonKind>("single");
  const [slotIndex, setSlotIndex] = useState(0);
  const [weeks, setWeeks] = useState(4);
  const [method, setMethod] = useState<Checkout>(balance > 0 ? "credit" : "fps");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (!student) return <Banner tone="red">{t.invalidInvite}</Banner>;

  const selected = slots[slotIndex] ?? null;
  const weekly = selected
    ? nextWeeklySlots(
        store.data,
        new Date(new Date(selected.start).getTime() - 1000),
        hkWeekday(new Date(selected.start)),
        hkHm(new Date(selected.start)),
        hkHm(new Date(selected.end)),
        weeks,
      )
    : [];
  const needed = kind === "weekly" ? weekly.length : 1;
  const usesCredit = kind === "single" || kind === "weekly";
  const kinds: { value: LessonKind; label: string }[] = [
    { value: "single", label: t.single },
    { value: "weekly", label: t.weekly },
  ];
  if (!student.trialUsed) kinds.push({ value: "trial", label: t.trial });
  if (makeups > 0) kinds.push({ value: "makeup", label: t.makeup });

  const submit = () => {
    if (!selected || pending) return;
    setPending(true);
    setError(null);
    const access = { studentId, inviteToken };
    const result =
      kind === "trial"
        ? store.bookTrial({ ...access, start: selected.start, end: selected.end })
        : kind === "makeup"
          ? store.bookMakeup({ ...access, start: selected.start, end: selected.end })
          : kind === "weekly"
            ? store.bookWeekly({ ...access, slots: weekly, method })
            : store.bookSingle({ ...access, start: selected.start, end: selected.end, method });
    setPending(false);
    if (!result.ok) {
      setError(result.error ? explainError(locale, result.error) : t.notEnoughWeeks(weekly.length));
      return;
    }
    if (result.lessonId) router.push(`/lesson/${result.lessonId}`);
  };

  return (
    <View style={styles.stack}>
      {!store.writesOpen ? <Banner>{t.writesPaused}</Banner> : null}
      <Card>
        <AppText weight="bold">{t.bookFor(personName(locale, student))}</AppText>
        <AppText>{t.creditsLeft(balance)}</AppText>
        {makeups > 0 ? <AppText>{t.makeupLeft(makeups)}</AppText> : null}
        <AppText style={styles.quiet}>{store.data.tutor.confirmMode === "instant" ? t.confirmInstant : t.confirmManual}</AppText>
      </Card>
      <Segmented value={kind} options={kinds} onChange={setKind} />
      {kind === "makeup" ? <Banner tone="teal">{t.makeupSafe}</Banner> : null}
      {kind === "trial" ? <Banner tone="teal">{t.trialFree}</Banner> : null}
      {kind === "weekly" ? (
        <Segmented
          value={String(weeks)}
          options={[1, 4, 8].map((count) => ({ value: String(count), label: t.weeks(count) }))}
          onChange={(value) => setWeeks(Number(value))}
        />
      ) : null}
      <AppText weight="bold">{t.selectSlot}</AppText>
      {slots.length === 0 ? <AppText style={styles.quiet}>{t.noSlots}</AppText> : null}
      {slots.map((slot, index) => (
        <Pressable key={slot.start} onPress={() => setSlotIndex(index)}>
          <Card>
            <AppText weight={index === slotIndex ? "bold" : "regular"}>{formatWhen(locale, slot.start)}</AppText>
          </Card>
        </Pressable>
      ))}
      {kind === "weekly" && selected ? (
        <AppText>
          {weekly.length < weeks ? t.notEnoughWeeks(weekly.length) : t.weeklyPreview(weekly.length)}
        </AppText>
      ) : null}
      {usesCredit ? (
        <Segmented
          value={method}
          options={[
            { value: "credit" as const, label: needed === 1 ? t.useCredit : t.useCredits(needed) },
            { value: "fps" as const, label: t.payFps },
            { value: "bank_transfer" as const, label: t.payBank },
          ]}
          onChange={setMethod}
        />
      ) : null}
      {error ? <Banner tone="red">{error}</Banner> : null}
      <Button label={t.bookCta} disabled={!store.writesOpen || !selected || pending || (kind === "weekly" && weekly.length === 0)} onPress={submit} />
      <AppText style={styles.quiet}>{t.rules(store.data.tutor.cancelCutoffHours)}</AppText>
      <AppText style={styles.quiet}>{t.hongKongTime}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  quiet: { color: colors.inkSoft },
});
