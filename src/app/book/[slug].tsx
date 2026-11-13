import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { useStore } from "../../data/store";
import { personName, tutorBio, tutorSubject } from "../../domain/format";
import { BookPanel } from "../../features/book-panel";
import { Screen } from "../../features/shell";
import { useI18n } from "../../i18n/use-i18n";
import { AppText, Banner } from "../../ui/components";
import { oneParam } from "../../ui/origin";
import { colors } from "../../ui/theme";

export default function PublicBookScreen() {
  const params = useLocalSearchParams<{ slug: string; invite?: string }>();
  const store = useStore();
  const { locale, t } = useI18n();
  const slug = oneParam(params.slug);
  const token = oneParam(params.invite);
  const invite = store.data.invites.find((item) => item.token === token);
  const tutorUser = store.data.users.find((item) => item.id === store.data.tutor.userId);
  if (slug !== store.data.tutor.slug || !invite) {
    return (
      <Screen title={t.bookTitle} showDemo>
        <Banner tone="red">{t.invalidInvite}</Banner>
      </Screen>
    );
  }
  return (
    <Screen title={t.bookTitle}>
      <View style={{ gap: 4 }}>
        <AppText weight="bold" style={{ fontSize: 24 }}>
          {tutorUser ? personName(locale, tutorUser) : t.appName}
        </AppText>
        <AppText>{tutorSubject(locale, store.data.tutor)}</AppText>
        <AppText style={{ color: colors.inkSoft }}>{tutorBio(locale, store.data.tutor)}</AppText>
      </View>
      <BookPanel studentId={invite.studentId} inviteToken={invite.token} />
    </Screen>
  );
}
