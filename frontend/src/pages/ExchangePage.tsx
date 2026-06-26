import { useState } from 'react';
import { api } from '../utils/api';
import { useTranslation } from '../i18n/LanguageContext';

export default function ExchangePage() {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; orders?: any[] } | null>(null);
  const [error, setError] = useState('');

  const validatePhone = (p: string) => {
    const cleaned = p.replace(/[\s\-\(\)]/g, '');
    return /^(05|06|07|21305|21306|21307|\+21305|\+21306|\+21307|0021305|0021306|0021307)/.test(cleaned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!phone.trim()) { setError(t('exchange.required_phone')); return; }
    if (!validatePhone(phone)) { setError(t('exchange.invalid_phone')); return; }
    if (!reason.trim()) { setError(t('exchange.required_reason')); return; }

    setLoading(true);
    try {
      const res = await api.post<{ success: boolean; message: string; orders?: any[] }>('/exchanges', {
        customer_phone: phone,
        reason,
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-dark mb-3 uppercase tracking-wider">{t('exchange.title')}</h1>
        <p className="text-gray-600">{t('exchange.desc')}</p>
      </div>

      <div className="bg-light p-8 rounded-sm mb-10">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark mb-2">{t('exchange.phone')}</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              className="input-field" placeholder="e.g. 05XX-XX-XX-XX" />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark mb-2">{t('exchange.reason')}</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              className="input-field h-24 resize-none" placeholder={t('exchange.reason_placeholder')} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? t('exchange.submitting') : t('exchange.submit')}
          </button>
        </form>
      </div>

      {result && (
        <div className={`p-6 border ${
          result.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
        }`}>
          <p className={`font-medium mb-2 ${result.success ? 'text-green-700' : 'text-yellow-700'}`}>
            {result.message}
          </p>
          {result.orders && result.orders.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">{t('exchange.recent_orders')}</p>
              <ul className="text-sm text-gray-600 space-y-1">
                {result.orders.map((o: any) => (
                  <li key={o.id} className="flex justify-between">
                    <span>{o.order_number} - {o.product_name}</span>
                    <span>{new Date(o.created_at).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
