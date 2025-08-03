import { en } from './en';
import { ru } from './ru';

export type Language = 'en' | 'ru';
export type Locale = typeof en;

const locales: Record<Language, Locale> = {
  en,
  ru
};

export function getLocale(language: Language): Locale {
  return locales[language] || locales.en;
}

export function t(language: Language, key: string): string {
  const locale = getLocale(language);
  const keys = key.split('.');
  let value: any = locale;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key; // Return key if translation not found
    }
  }
  
  return typeof value === 'string' ? value : key;
}

export { en, ru }; 