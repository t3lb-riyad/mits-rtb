import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Lang, translations } from './translations';

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, ...args: string[]) => string;
  dir: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  t: (k: string, ...args: string[]) => { let v = k; args.forEach((a,i) => { v = v.replace(`{${i}}`, a); }); return v; },
  dir: 'ltr',
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem('lang');
    if (saved === 'ar' || saved === 'fr') return saved;
    return 'en';
  });

  useEffect(() => {
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const t = (key: string, ...args: string[]): string => {
    let val = translations[lang]?.[key] ?? translations.en?.[key] ?? key;
    args.forEach((arg, i) => { val = val.replace(`{${i}}`, arg); });
    return val;
  };
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir }}>
      <div dir={dir}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export const useTranslation = () => useContext(LanguageContext);
