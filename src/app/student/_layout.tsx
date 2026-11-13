import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";

import { useStore } from "../../data/store";
import { useI18n } from "../../i18n/use-i18n";
import { useFontFamilies } from "../../ui/fonts";
import { colors } from "../../ui/theme";

export default function StudentLayout() {
  const { user, ready } = useStore();
  const { t } = useI18n();
  const fonts = useFontFamilies();
  if (!ready) return null;
  if (user?.role !== "student") return <Redirect href="/" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.inkSoft,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line },
        tabBarLabelStyle: { fontFamily: fonts.regular, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t.tabSchedule, tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={typeof color === "string" ? color : colors.ink} size={size} /> }} />
      <Tabs.Screen name="book" options={{ title: t.tabBook, tabBarIcon: ({ color, size }) => <Ionicons name="add-circle-outline" color={typeof color === "string" ? color : colors.ink} size={size} /> }} />
      <Tabs.Screen name="credits" options={{ title: t.tabCredits, tabBarIcon: ({ color, size }) => <Ionicons name="layers-outline" color={typeof color === "string" ? color : colors.ink} size={size} /> }} />
    </Tabs>
  );
}
