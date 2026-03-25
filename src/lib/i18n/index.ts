import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation resources
import esTranslations from './locales/es-DO.json';
import htTranslations from './locales/ht.json';
import enTranslations from './locales/en.json';

const resources = {
  'es-DO': {
    translation: esTranslations
  },
  'ht': {
    translation: htTranslations
  },
  'en': {
    translation: enTranslations
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'es-DO', // Dominican Spanish as default
    debug: import.meta.env.MODE === 'development',
    
    // Language detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'whatsopi-language'
    },

    interpolation: {
      escapeValue: false, // React already escapes
    },

    // Context handling for plurals and gender
    context: true,
    contextSeparator: '_',
    
    // Plural handling
    pluralSeparator: '_',
    
    // Namespace handling
    defaultNS: 'translation',
    
    // Key separator
    keySeparator: '.',
    
    // Return objects for nested translations
    returnObjects: true,
    
    // Return empty string for missing keys in development
    returnEmptyString: import.meta.env.MODE === 'development',
    
    // Post-processing
    postProcess: ['interval'],
    
    // Load languages synchronously
    initImmediate: false,
    
    // React specific options
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'em', 'span']
    }
  });

export default i18n;