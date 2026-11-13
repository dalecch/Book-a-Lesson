import * as Clipboard from "expo-clipboard";
import { Linking, Platform } from "react-native";

export function openUrl(url: string): void {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  void Linking.openURL(url);
}

export async function copyText(value: string): Promise<void> {
  await Clipboard.setStringAsync(value);
}
