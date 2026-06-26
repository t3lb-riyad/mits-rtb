import { useTranslation } from '../i18n/LanguageContext';
import type { Lang } from '../i18n/translations';

const flags: Record<Lang, string> = { en: '🇬🇧', ar: '🇩🇿', fr: '🇫🇷' };
const labels: Record<Lang, string> = { en: 'EN', ar: 'AR', fr: 'FR' };

export default function LanguageSwitcher() {
  const { lang, setLang } = useTranslation();
  return (
    <div className="flex items-center gap-1">
      {(Object.keys(flags) as Lang[]).map(l => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-2 py-1 text-xs font-medium rounded-sm transition-colors ${
            lang === l
              ? 'bg-white/20 text-white'
              : 'text-blue-200 hover:text-white hover:bg-white/10'
          }`}
        >
          {labels[l]}
        </button>
      ))}
    </div>
  );
}
