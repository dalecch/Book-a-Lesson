import { Redirect, Stack } from "expo-router";

import { useStore } from "../../data/store";

export default function TutorLayout() {
  const { user, ready } = useStore();
  if (!ready) return null;
  if (user?.role !== "tutor") return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
