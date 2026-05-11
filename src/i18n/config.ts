import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en/common.json";
import fr from "./locales/fr/common.json";
import it from "./locales/it/common.json";

const resources = {
  en: { common: en },
  it: { common: it },
  fr: { common: fr },
} as const;

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: "en",
    fallbackLng: "en",
    supportedLngs: ["en", "it", "fr"],
    defaultNS: "common",
    ns: ["common"],
    interpolation: { escapeValue: false },
  });
}

export default i18n;
