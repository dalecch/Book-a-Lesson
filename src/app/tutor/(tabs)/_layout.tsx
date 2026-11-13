import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { useI18n } from "../../../i18n/use-i18n";
import { useFontFamilies } from "../../../ui/fonts";
import { colors } from "../../../ui/theme";

export default function TutorTabs() {
  const { t } = useI18n();
  const fonts = useFontFamilies();
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
      <Tabs.Screen
        name="index"
        options={{ title: t.tabHome, tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={typeof color === "string" ? color : colors.ink} size={size} /> }}
      />
      <Tabs.Screen
        name="timetable"
        options={{ title: t.tabSchedule, tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={typeof color === "string" ? color : colors.ink} size={size} /> }}
      />
      <Tabs.Screen
        name="students"
        options={{ title: t.tabStudents, tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={typeof color === "string" ? color : colors.ink} size={size} /> }}
      />
      <Tabs.Screen
        name="billing"
        options={{ title: t.tabBilling, tabBarIcon: ({ color, size }) => <Ionicons name="card-outline" color={typeof color === "string" ? color : colors.ink} size={size} /> }}
      />
    </Tabs>
  );
}
