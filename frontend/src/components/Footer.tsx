import { useTranslation } from '../i18n/LanguageContext';

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="bg-dark text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4">{t('site.name')}</h3>
            <p className="text-sm text-gray-300 leading-relaxed mb-2">
              {t('footer.location')}
            </p>
            <a href="https://maps.app.goo.gl/rhYen9BCe1GyqsF88?g_st=iw" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300 transition-colors underline">
              {t('footer.map_link')}
            </a>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">{t('footer.quick_links')}</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><a href="/" className="hover:text-white transition-colors">{t('footer.home')}</a></li>
              <li><a href="/exchange" className="hover:text-white transition-colors">{t('footer.exchange')}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">{t('footer.contact')}</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>{t('footer.phone_line')}</li>
              <li>{t('footer.email_line')}</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">{t('footer.info')}</h4>
            <p className="text-sm text-gray-300 leading-relaxed">
              {t('footer.created_by_prefix')}<a href="https://make-it-self.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors underline">MAKE IT SELF</a>{t('footer.created_by_suffix')}
            </p>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} MAKE IT SELF. {t('footer.copyright')}
        </div>
      </div>
    </footer>
  );
}
