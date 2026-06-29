import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Lang, translations } from './translations';
import { API_BASE } from '../utils/api';

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, ...args: string[]) => string;
  dir: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'fr',
  setLang: () => {},
  t: (k: string, ...args: string[]) => { let v = k; args.forEach((a,i) => { v = v.replace(`{${i}}`, a); }); return v; },
  dir: 'ltr',
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('fr');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('lang') as Lang | null;
    if (saved && (saved === 'ar' || saved === 'fr' || saved === 'en')) {
      setLang(saved);
      setReady(true);
      return;
    }
    const base = API_BASE.replace(/\/api$/, '');
    fetch(`${base}/api/config`)
      .then(r => r.json())
      .then(cfg => {
        const sysLang = (cfg.default_language === 'ar' || cfg.default_language === 'en') ? cfg.default_language : 'fr';
        setLang(sysLang);
      })
      .catch(() => setLang('fr'))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang, ready]);

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
