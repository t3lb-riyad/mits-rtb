import { Link } from 'react-router-dom';
import { useTranslation } from '../i18n/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import { useCart } from '../context/CartContext';

export default function Header() {
  const { t } = useTranslation();
  const { totalItems } = useCart();
  return (
    <header className="bg-primary text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-2">
              <span className="text-2xl font-bold tracking-wider">{t('site.name')}</span>
            </span>
            <span className="flex sm:hidden items-center">
              <img src="/images/mobile-logo.png" alt="LA MAISON CD" className="h-8 w-auto" />
            </span>
            <span className="hidden sm:block text-sm font-light text-blue-200 border-l border-blue-400 pl-3">
              {t('site.tagline')}
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link to="/" className="text-sm font-medium hover:text-blue-200 transition-colors">
              {t('nav.store')}
            </Link>
            <Link to="/exchange" className="text-sm font-medium hover:text-blue-200 transition-colors">
              {t('nav.exchange')}
            </Link>
            <a href="/#products" className="text-sm font-medium hover:text-blue-200 transition-colors" title="Search & Filter">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </a>
            <Link to="/cart" className="relative text-sm font-medium hover:text-blue-200 transition-colors" title="Cart">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </Link>
            <LanguageSwitcher />
          </nav>
        </div>
      </div>
    </header>
  );
}
