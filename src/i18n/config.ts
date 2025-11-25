import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhTranslation from './locales/zh.json';

const resources = {
  zh: {
    translation: zhTranslation
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh', // 固定使用中文
    fallbackLng: 'zh',
    debug: false,
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
