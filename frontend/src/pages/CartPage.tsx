import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart, getProductDiscountPercent } from '../context/CartContext';
import { useTranslation } from '../i18n/LanguageContext';
import { api, API_BASE } from '../utils/api';

const ALGERIAN_WILAYAS = [
  'Adrar','Chlef','Laghouat','Oum El Bouaghi','Batna','Béjaïa','Biskra','Béchar','Blida','Bouira',
  'Tamanrasset','Tébessa','Tlemcen','Tiaret','Tizi Ouzou','Algiers','Djelfa','Jijel','Sétif','Saïda',
  'Skikda','Sidi Bel Abbès','Annaba','Guelma','Constantine','Médéa','Mostaganem','M\'Sila','Mascara',
  'Ouargla','Oran','El Bayadh','Illizi','Bordj Bou Arréridj','Boumerdès','El Tarf','Tindouf',
  'Tissemsilt','El Oued','Khenchela','Souk Ahras','Tipaza','Mila','Aïn Defla','Naâma','Aïn Témouchent',
  'Ghardaïa','Relizane','El M\'Ghair','El Meniaa','Ouled Djellal','Bordj Baji Mokhtar','Béni Abbès',
  'Timimoun','Touggourt','Djanet','In Salah','In Guezzam',
];

const BASE_URL = API_BASE.replace(/\/api$/, '');

export default function CartPage() {
  const { t } = useTranslation();
  const { items, removeItem, updateQuantity, clearCart, totalPrice, totalItems, discountPercent, discountAmount, finalTotal } = useCart();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<any>(null);
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [deliveryFeeLoading, setDeliveryFeeLoading] = useState(false);

  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', customer_email: '',
    customer_address: '', customer_city: '', customer_province: '',
    shipping_method: 'home_delivery', notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!form.customer_province) { setDeliveryFee(null); return; }
    const method = form.shipping_method === 'home_delivery' ? 'home_delivery_fee' : 'office_pickup_fee';
    setDeliveryFeeLoading(true);
    fetch(`${BASE_URL}/api/delivery/fees/${encodeURIComponent(form.customer_province)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setDeliveryFee(data ? Number(data[method]) || 0 : null))
      .catch(() => setDeliveryFee(null))
      .finally(() => setDeliveryFeeLoading(false));
  }, [form.customer_province, form.shipping_method]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.customer_name.trim()) e.name = t('product.val_full_name');
    if (!form.customer_phone.trim()) e.phone = t('product.val_phone');
    else if (!/^(\+213|0|00213)[5-7]\d{8}$/.test(form.customer_phone.replace(/[\s\-\(\)]/g, ''))) e.phone = t('product.val_phone_invalid');
    if (!form.customer_province) e.province = t('product.val_province');
    if (form.shipping_method === 'home_delivery') {
      if (!form.customer_city.trim()) e.city = t('product.val_city');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (items.length === 0) return alert('Cart is empty.');
    setSubmitting(true);
    try {
      const cartItems = items.map(i => ({
        product_id: i.productId,
        product_name: i.productName,
        product_image: i.productImage || null,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        selected_ram: i.selectedRam,
        selected_storage: i.selectedStorage,
        selected_hdd: i.selectedHdd,
      }));
      const fee = deliveryFee || 0;
      const payload = {
        ...form,
        customer_phone: form.customer_phone.replace(/[\s\-\(\)]/g, ''),
        items: cartItems,
        discount_percent: discountPercent,
        discount_amount: Math.round(discountAmount),
        total_amount: Math.round(finalTotal + fee),
        delivery_fee: fee,
      };
      const res = await api.post<{ success: boolean; order_number: string }>('/orders', payload);
      setOrderResult(res);
      clearCart();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (orderResult) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="bg-green-50 border border-green-200 rounded-lg p-8">
          <div className="text-5xl mb-4">&#10003;</div>
          <h2 className="text-2xl font-bold text-green-700 mb-2">{t('product.order_confirm_title')}</h2>
          <p className="text-green-600 mb-1">{t('product.order_confirm_msg')}</p>
          <p className="text-lg font-bold text-primary mb-4">{t('product.order_number')} {orderResult.order_number}</p>
          <p className="text-sm text-gray-500 mb-6">{t('product.order_confirm_whatsapp')}</p>
          <Link to="/" className="btn-primary inline-block">{t('product.continue_shopping')}</Link>
        </div>
      </div>
    );
  }

  if (items.length === 0 && !showForm) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-6xl text-gray-300 mb-4">
          <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
        </div>
        <h2 className="text-xl font-bold text-dark mb-2">{t('cart.empty_title')}</h2>
        <p className="text-gray-500 mb-6">{t('cart.empty_desc')}</p>
        <Link to="/" className="btn-primary">{t('home.hero.browse')}</Link>
      </div>
    );
  }

  const grandTotal = finalTotal + (deliveryFee || 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-dark mb-6">
        {t('cart.title', String(totalItems))}
      </h1>

      <div className="space-y-4 mb-8">
        {items.map(item => (
          <div key={item.cartId} className="card p-4 flex gap-4 items-center">
            <div className="w-16 h-16 flex-shrink-0 bg-gray-50 rounded overflow-hidden">
              {item.productImage ? (
                <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <Link to={`/product/${item.productSlug}`} className="font-medium text-dark hover:text-primary truncate block">
                {item.productName}
              </Link>
              {item.selectedRam || item.selectedStorage || item.selectedHdd ? (
                <p className="text-xs text-gray-500 mt-0.5">
                  {item.selectedRam && `RAM: ${item.selectedRam}`}{item.selectedRam && (item.selectedStorage || item.selectedHdd) ? ', ' : ''}{item.selectedStorage && `Storage: ${item.selectedStorage}`}{item.selectedStorage && item.selectedHdd ? ', ' : ''}{item.selectedHdd && `HDD: ${item.selectedHdd}`}
                </p>
              ) : null}
              <p className="text-sm text-primary font-semibold mt-1">{Math.round(item.unitPrice).toLocaleString()} {t('cart.unit_suffix')}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => updateQuantity(item.cartId, item.quantity - 1)} className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-sm">&minus;</button>
              <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
              <button onClick={() => updateQuantity(item.cartId, item.quantity + 1)} className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-sm">+</button>
            </div>
            <div className="text-right w-24">
              <p className="font-bold text-dark">{(item.unitPrice * item.quantity).toLocaleString()} DA</p>
            </div>
            <button onClick={() => removeItem(item.cartId)} className="text-red-400 hover:text-red-600 text-lg p-1">&times;</button>
          </div>
        ))}
      </div>

      <div className="card p-6 mb-8">
        <div className="border-b border-gray-100 pb-4 mb-2">
          <div className="flex justify-between items-center text-base">
            <span className="text-gray-600">{t('cart.subtotal')} ({totalItems})</span>
            <span className="text-gray-800 font-semibold">{Math.round(totalPrice).toLocaleString()} DA</span>
          </div>
        </div>

        {discountPercent > 0 && (
          <div className="bg-green-50 border border-green-100 rounded-sm p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-green-800 font-semibold text-sm">{t('cart.bulk_discount_line', String(discountPercent))}</span>
              <span className="text-green-700 font-bold">-{Math.round(discountAmount).toLocaleString()} DA</span>
            </div>
          </div>
        )}

        <div className="border-t border-gray-100 pt-4 mt-4 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">{t('cart.delivery_fee')}</span>
            <span className="font-medium">
              {!form.customer_province ? (
                <span className="text-gray-400 text-xs">{t('cart.select_province_fee')}</span>
              ) : deliveryFeeLoading ? (
                <span className="text-gray-400">{t('loading')}</span>
              ) : deliveryFee === 0 || deliveryFee === null ? (
                <span className="text-green-600">{t('cart.delivery_fee_free')}</span>
              ) : (
                <span>{Math.round(deliveryFee).toLocaleString()} DA</span>
              )}
            </span>
          </div>

          {discountPercent > 0 ? (
            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
              <span className="font-bold text-lg text-dark">{t('cart.total_with_delivery')}</span>
              <span className="font-bold text-primary text-xl">{Math.round(grandTotal).toLocaleString()} DA</span>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg text-dark">{t('product.total')}</span>
              <span className="font-bold text-primary text-2xl">{Math.round(grandTotal).toLocaleString()} DA</span>
            </div>
          )}
        </div>

        {items.some(i => {
          const pct = getProductDiscountPercent(i.quantity, i.discountTier1Percent, i.discountTier2Percent);
          return pct === 0 && i.discountTier1Percent > 0 && i.quantity < 5;
        }) && (
          <p className="text-xs text-gray-400 mt-4 text-right border-t border-gray-50 pt-3">
            {t('cart.bulk_hint')}
          </p>
        )}
      </div>

      {!showForm ? (
        <div className="flex gap-4">
          <button onClick={() => setShowForm(true)} className="btn-primary text-lg px-8 py-3">{t('cart.proceed_checkout')}</button>
          <Link to="/" className="btn-secondary text-lg px-6 py-3">{t('product.continue_shopping')}</Link>
        </div>
      ) : (
        <div className="card p-6">
          <h2 className="section-title mb-4">{t('product.place_your_order')}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('product.name')} *</label>
              <input type="text" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                className="input-field" placeholder={t('product.name_placeholder')} />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('product.phone')} *</label>
              <input type="tel" value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))}
                className="input-field" placeholder={t('product.phone_placeholder')} />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('product.email')}</label>
              <input type="email" value={form.customer_email} onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))}
                className="input-field" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('product.shipping_method')} *</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="shipping_method" value="home_delivery" checked={form.shipping_method === 'home_delivery'}
                    onChange={e => setForm(f => ({ ...f, shipping_method: e.target.value }))} className="accent-primary" />
                  <span className="text-sm">{t('product.home_delivery')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="shipping_method" value="office_pickup" checked={form.shipping_method === 'office_pickup'}
                    onChange={e => setForm(f => ({ ...f, shipping_method: e.target.value }))} className="accent-primary" />
                  <span className="text-sm">{t('product.office_pickup')}</span>
                </label>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('product.province')} *</label>
              <select value={form.customer_province} onChange={e => setForm(f => ({ ...f, customer_province: e.target.value }))} className="input-field">
                <option value="">{t('product.select_province')}</option>
                {ALGERIAN_WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
              {errors.province && <p className="text-xs text-red-500 mt-1">{errors.province}</p>}
            </div>
            {form.shipping_method === 'home_delivery' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('product.city')} *</label>
                  <input type="text" value={form.customer_city} onChange={e => setForm(f => ({ ...f, customer_city: e.target.value }))}
                    className="input-field" placeholder={t('product.city_placeholder')} />
                  {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('product.address')}</label>
                  <input type="text" value={form.customer_address} onChange={e => setForm(f => ({ ...f, customer_address: e.target.value }))}
                    className="input-field" placeholder={t('product.address_placeholder')} />
                </div>
              </>
            )}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('product.notes')}</label>
              <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="input-field" placeholder={t('product.notes_placeholder')} />
            </div>
            <div className="sm:col-span-2 flex gap-4">
              <button type="submit" disabled={submitting} className="btn-primary text-lg px-8 py-3">
                {submitting ? t('product.processing') : `${t('product.place_order')} (${Math.round(grandTotal).toLocaleString()} DA)`}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
