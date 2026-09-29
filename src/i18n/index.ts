import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import ta from "./locales/ta.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ta: { translation: ta },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "ta"],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "edupath_language",
      caches: ["localStorage"],
    } as object,
  });

export default i18n;

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English",         native: "English" },
  { code: "ta", label: "Tamil",           native: "தமிழ்" },
] as const;

export type LangCode = "en" | "ta";

export function setLanguage(code: LangCode) {
  i18n.changeLanguage(code);
  localStorage.setItem("edupath_language", code);
}
