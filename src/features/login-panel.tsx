import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { useStore } from "../data/store";
import { demoAccounts, ids, tutorSlug } from "../domain/demo";
import { personName } from "../domain/format";
import { bookingPath, joinPath } from "../domain/links";
import { useI18n } from "../i18n/use-i18n";
import { AppText, Banner, Button, Card, Field } from "../ui/components";
import { colors } from "../ui/theme";
import { homeHref, roleLabel } from "./shell";

export function LoginPanel() {
  const store = useStore();
  const { locale, t } = useI18n();
  const [email, setEmail] = useState<string>(demoAccounts.tutorEmail);
  const [password, setPassword] = useState<string>(demoAccounts.password);
  const [error, setError] = useState(false);

  const enter = (userId: string) => {
    const user = store.data.users.find((item) => item.id === userId);
    if (!user) return;
    store.loginAs(user.id);
    router.replace(homeHref(user.role));
  };

  return (
    <View style={{ gap: 12 }}>
      <AppText weight="bold" style={{ fontSize: 36, lineHeight: 44 }}>
        {t.appName}
      </AppText>
      <AppText>{t.englishName}</AppText>
      <AppText>{t.tagline}</AppText>
      <AppText style={{ color: colors.inkSoft }}>{t.notMarketplace}</AppText>
      <AppText weight="bold" style={{ fontSize: 24 }}>
        {t.loginTitle}
      </AppText>
      <AppText style={{ color: colors.inkSoft }}>{t.loginSubtitle}</AppText>
      {store.data.users.map((user) => (
        <Card key={user.id}>
          <AppText weight="bold">
            {roleLabel(t, user.role)} · {personName(locale, user)}
          </AppText>
          <AppText selectable>{user.email}</AppText>
          <AppText style={{ color: colors.inkSoft }}>{t.demoPassword(demoAccounts.password)}</AppText>
          <Button label={t.signIn} onPress={() => enter(user.id)} />
        </Card>
      ))}
      <Button kind="secondary" label={t.openBookingLink} onPress={() => router.push(`${bookingPath(tutorSlug, ids.inviteParentMing)}`)} />
      <Button kind="secondary" label={t.openStudentLink} onPress={() => router.push(joinPath(ids.inviteStudentMing))} />
      <Field label={t.email} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Field label={t.password} value={password} onChangeText={setPassword} secureTextEntry />
      {error ? <Banner tone="red">{t.signInError}</Banner> : null}
      <Button
        kind="secondary"
        label={t.signIn}
        onPress={() => {
          const ok = store.login(email, password);
          setError(!ok);
          if (!ok) return;
          const user = store.data.users.find((item) => item.email.toLowerCase() === email.trim().toLowerCase());
          if (user) router.replace(homeHref(user.role));
        }}
      />
      <Button kind="ghost" label={t.resetDemo} onPress={store.resetDemo} />
      <AppText style={{ color: colors.inkSoft }}>{t.dataStays}</AppText>
    </View>
  );
}
