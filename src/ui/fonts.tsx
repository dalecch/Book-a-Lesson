import { NotoSansSC_400Regular } from "@expo-google-fonts/noto-sans-sc/400Regular";
import { NotoSansSC_700Bold } from "@expo-google-fonts/noto-sans-sc/700Bold";
import { NotoSansTC_400Regular } from "@expo-google-fonts/noto-sans-tc/400Regular";
import { NotoSansTC_700Bold } from "@expo-google-fonts/noto-sans-tc/700Bold";
import { useFonts } from "expo-font";
import { createContext, useContext, type ReactNode } from "react";

interface FontFamilies {
  regular?: string;
  bold?: string;
  hansRegular?: string;
  hansBold?: string;
  ready: boolean;
}

const FontContext = createContext<FontFamilies>({ ready: false });

export function FontProvider({ children }: { children: ReactNode }) {
  const [loaded, error] = useFonts({
    NotoSansTC_400Regular,
    NotoSansTC_700Bold,
    NotoSansSC_400Regular,
    NotoSansSC_700Bold,
  });
  const value: FontFamilies = {
    regular: loaded ? "NotoSansTC_400Regular" : undefined,
    bold: loaded ? "NotoSansTC_700Bold" : undefined,
    hansRegular: loaded ? "NotoSansSC_400Regular" : undefined,
    hansBold: loaded ? "NotoSansSC_700Bold" : undefined,
    ready: loaded || Boolean(error),
  };
  return <FontContext.Provider value={value}>{children}</FontContext.Provider>;
}

export function useFontFamilies(): FontFamilies {
  return useContext(FontContext);
}
