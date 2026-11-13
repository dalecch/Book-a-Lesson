import { useStore } from "../data/store";
import { dictionaryFor } from "./dictionary";

export function useI18n() {
  const { locale, setLocale } = useStore();
  return { locale, setLocale, t: dictionaryFor(locale) };
}
