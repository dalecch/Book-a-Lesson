import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, type ReactNode } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { StoreProvider, useStore } from "../data/store";
import { FontProvider, useFontFamilies } from "../ui/fonts";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function Gate({ children }: { children: ReactNode }) {
  const store = useStore();
  const fonts = useFontFamilies();
  const ready = store.ready && fonts.ready;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);
  if (!ready) return null;
  return children;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StoreProvider>
        <FontProvider>
          <Gate>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }} />
          </Gate>
        </FontProvider>
      </StoreProvider>
    </GestureHandlerRootView>
  );
}
