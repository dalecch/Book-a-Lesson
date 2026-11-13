import { router } from "expo-router";
import { Pressable, View } from "react-native";

import { useStore } from "../data/store";
import { formatWhen, noteBody, noteTitle } from "../domain/format";
import { useI18n } from "../i18n/use-i18n";
import { AppText, Button, Card } from "../ui/components";
import { colors } from "../ui/theme";

export function InboxPanel() {
  const store = useStore();
  const { locale, t } = useI18n();
  const notes = store.data.notifications.filter((item) => item.userId === store.user?.id);
  return (
    <View style={{ gap: 12 }}>
      <Button kind="secondary" label={t.markAllRead} onPress={store.markAllRead} />
      {notes.length === 0 ? <AppText style={{ color: colors.inkSoft }}>{t.emptyInbox}</AppText> : null}
      {notes.map((note) => (
        <Pressable key={note.id} onPress={() => router.push(note.href)}>
          <Card>
            <AppText weight={note.read ? "regular" : "bold"}>{noteTitle(locale, note)}</AppText>
            <AppText>{noteBody(locale, note)}</AppText>
            <AppText style={{ color: colors.inkSoft }}>{formatWhen(locale, note.at)}</AppText>
          </Card>
        </Pressable>
      ))}
    </View>
  );
}
