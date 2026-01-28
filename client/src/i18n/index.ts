import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import tg from './locales/tg.json';
import ru from './locales/ru.json';
import zh from './locales/zh.json';

// Get saved language or detect from browser
const getSavedLanguage = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('tez-language');
    if (saved && ['tg', 'ru', 'zh'].includes(saved)) {
      return saved;
    }
  }
  return 'tg'; // Default to Tajik
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      tg: { translation: tg },
      ru: { translation: ru },
      zh: { translation: zh },
    },
    lng: getSavedLanguage(),
    fallbackLng: 'tg',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export const changeLanguage = (lang: string) => {
  i18n.changeLanguage(lang);
  if (typeof window !== 'undefined') {
    localStorage.setItem('tez-language', lang);
    // Update HTML lang attribute
    document.documentElement.lang = lang;
  }
};

export const languages = [
  { code: 'tg', name: 'Тоҷикӣ', flag: '🇹🇯' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
];

export default i18n;
