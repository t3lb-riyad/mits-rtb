import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from '../i18n/LanguageContext';
import { useCart } from '../context/CartContext';
import { api, resolveImageUrl, Product, ProductAttribute } from '../utils/api';

const ALGERIAN_WILAYAS = [
  'Adrar', 'Chlef', 'Laghouat', 'Oum El Bouaghi', 'Batna', 'Béjaïa', 'Biskra', 'Béchar',
  'Blida', 'Bouira', 'Tamanrasset', 'Tébessa', 'Tlemcen', 'Tiaret', 'Tizi Ouzou', 'Alger',
  'Djelfa', 'Jijel', 'Sétif', 'Saïda', 'Skikda', 'Sidi Bel Abbès', 'Annaba', 'Guelma',
  'Constantine', 'Médéa', 'Mostaganem', 'M\'Sila', 'Mascara', 'Ouargla', 'Oran',
  'El Bayadh', 'Illizi', 'Bordj Bou Arréridj', 'Boumerdès', 'El Tarf', 'Tindouf',
  'Tissemsilt', 'El Oued', 'Khenchela', 'Souk Ahras', 'Tipaza', 'Mila', 'Aïn Defla',
  'Naâma', 'Aïn Témouchent', 'Ghardaïa', 'Relizane', 'Timimoun', 'Bordj Badji Mokhtar',
  'Ouled Djellal', 'Béni Abbès', 'In Salah', 'In Guezzam', 'Touggourt', 'Djanet',
  'El Me\'ghaier', 'El Meniaa'
];

interface CheckoutForm {
  full_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  province: string;
  shipping_method: 'home_delivery' | 'office_pickup';
  notes: string;
}

export default function ProductPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();
  const [cartAdded, setCartAdded] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);

  const [quantity, setQuantity] = useState(1);
  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<CheckoutForm>({
    full_name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    province: '',
    shipping_method: 'home_delivery',
    notes: '',
  });

  useEffect(() => {
    if (!slug) return;
    async function load() {
      try {
        const res = await api.get<{ product: Product; attributes: ProductAttribute[] }>(`/products/${slug}`);
        setProduct(res.product);
        setAttributes(res.attributes);

        const attrMap: Record<string, string> = {};
        const grouped: Record<string, string[]> = {};
        res.attributes.forEach(a => {
          if (!grouped[a.attribute_name]) grouped[a.attribute_name] = [];
          if (!grouped[a.attribute_name].includes(a.attribute_value)) grouped[a.attribute_name].push(a.attribute_value);
        });
        Object.keys(grouped).forEach(key => { attrMap[key] = grouped[key][0]; });
        setSelectedAttrs(attrMap);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  const validatePhone = (phone: string): boolean => {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    const patterns = [
      /^05[0-9]{8}$/, /^06[0-9]{8}$/, /^07[0-9]{8}$/,
      /^21305[0-9]{8}$/, /^21306[0-9]{8}$/, /^21307[0-9]{8}$/,
      /^\+21305[0-9]{8}$/, /^\+21306[0-9]{8}$/, /^\+21307[0-9]{8}$/,
      /^0021305[0-9]{8}$/, /^0021306[0-9]{8}$/, /^0021307[0-9]{8}$/,
    ];
    return patterns.some(p => p.test(cleaned));
  };

  const attrPriceMod = attributes
    .filter(a => selectedAttrs[a.attribute_name] === a.attribute_value)
    .reduce((sum, a) => sum + (a.price_modifier || 0), 0);
  const unitPrice = product ? product.base_price + attrPriceMod : 0;
  const totalPrice = unitPrice * quantity;
  const discountPct = quantity > 10 ? 8 : quantity > 5 ? 5 : 0;
  const discountAmt = (totalPrice * discountPct) / 100;
  const finalTotal = totalPrice - discountAmt;

  const formatPrice = (price: number) => Math.round(price).toLocaleString() + ' DA';

  const getAttrGrouped = () => {
    const grouped: Record<string, ProductAttribute[]> = {};
    attributes.forEach(a => {
      if (a.attribute_name === 'Color') return;
      if (!grouped[a.attribute_name]) grouped[a.attribute_name] = [];
      grouped[a.attribute_name].push(a);
    });
    return grouped;
  };

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      productImage: resolveImageUrl(product.image_url || ''),
      quantity,
      unitPrice,
      selectedRam: selectedAttrs['RAM'] || '',
      selectedStorage: selectedAttrs['Storage'] || '',
      selectedHdd: selectedAttrs['HDD'] || '',
    });
    setCartAdded(true);
    setTimeout(() => setCartAdded(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const errors: Record<string, string> = {};
    if (!form.full_name.trim()) errors.full_name = t('product.val_full_name');
    if (!form.phone.trim()) errors.phone = t('product.val_phone');
    else if (!validatePhone(form.phone)) errors.phone = t('product.val_phone_invalid');
    if (form.shipping_method === 'home_delivery' && !form.city.trim()) errors.city = t('product.val_city');
    if (!form.province) errors.province = t('product.val_province');

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post<{ success: boolean; order_number: string }>('/orders', {
        customer_name: form.full_name,
        customer_phone: form.phone,
        customer_email: form.email || null,
        customer_address: form.shipping_method === 'home_delivery' ? form.address : null,
        customer_city: form.shipping_method === 'home_delivery' ? form.city : null,
        customer_province: form.province,
        product_id: product!.id,
        product_name: product!.name,
        quantity,
        unit_price: unitPrice,
        shipping_method: form.shipping_method,
        attributes: selectedAttrs,
        notes: form.notes || null,
        total_amount: Math.round(finalTotal),
        discount_percent: discountPct,
        discount_amount: Math.round(discountAmt),
      });
      setOrderNumber(res.order_number);
      setSubmitted(true);
    } catch (err: any) {
      setFormErrors({ form: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const updateForm = (field: keyof CheckoutForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-primary text-lg">{t('product.loading')}</div></div>;
  if (error) return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-red-600 text-lg">{error}</div></div>;
  if (!product) return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-gray-500 text-lg">{t('product.product_not_found')}</div></div>;

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="bg-white border border-gray-200 p-12">
          <div className="w-16 h-16 bg-green-100 text-green-700 flex items-center justify-center mx-auto mb-6 text-3xl font-bold">OK</div>
          <h1 className="text-2xl font-bold text-dark mb-4">{t('product.order_confirm_title')}</h1>
          <p className="text-gray-600 mb-2">{t('product.order_confirm_msg')}</p>
          <p className="text-lg font-semibold text-primary mb-6">{t('product.order_number')} {orderNumber}</p>
          <p className="text-sm text-gray-500 mb-8">{t('product.order_confirm_whatsapp')}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/" className="btn-primary">{t('product.continue_shopping')}</Link>
          </div>
        </div>
      </div>
    );
  }

  const attrGrouped = getAttrGrouped();

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Breadcrumb */}
      <div className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-8">
        <Link to="/" className="hover:text-primary">{t('footer.home')}</Link>
        <span className="mx-2">/</span>
        {product.category_name && <><Link to={`/?category=${product.category_name}`} className="hover:text-primary">{product.category_name}</Link><span className="mx-2">/</span></>}
        <span className="text-dark font-medium">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
        {/* Product Info */}
        <div>
          {/* Image Gallery */}
          {(() => {
            const galleryImages: string[] = [];
            if (product.image_url) galleryImages.push(product.image_url);
            try {
              const parsed = product.image_urls ? JSON.parse(product.image_urls) : [];
              if (Array.isArray(parsed)) parsed.forEach((u: string) => { if (!galleryImages.includes(u)) galleryImages.push(u); });
            } catch {}
            const current = resolveImageUrl(galleryImages[selectedImage] || product.image_url);
            return (
              <div>
                <div className="bg-light rounded-sm h-60 sm:h-80 flex items-center justify-center mb-3 overflow-hidden">
                  {current ? (
                    <img key={selectedImage} src={current} alt={product.name} className="h-full w-full object-contain p-4" />
                  ) : (
                    <span className="text-6xl sm:text-8xl text-primary font-bold">{product.name.charAt(0)}</span>
                  )}
                </div>
                {galleryImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {galleryImages.map((url, i) => (
                      <button key={i} type="button" onClick={() => setSelectedImage(i)}
                        className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 border-2 rounded-sm overflow-hidden transition-all ${
                          selectedImage === i ? 'border-primary' : 'border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        <img src={resolveImageUrl(url)} alt={`${product.name} ${i}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-dark mb-2 sm:mb-3">{product.name}</h1>
          {product.short_description && (
            <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">{product.short_description}</p>
          )}
          <p className="text-2xl sm:text-3xl font-bold text-primary mb-3 sm:mb-4">{formatPrice(product.base_price)}</p>
          {product.description && (
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed mb-4 sm:mb-6">{product.description}</p>
          )}

          {product.stock_quantity <= product.low_stock_threshold && product.stock_quantity > 0 && (
            <p className="text-xs sm:text-sm text-orange-600 font-medium mb-3 sm:mb-4">{t('product.only_remaining', String(product.stock_quantity))}</p>
          )}
          {product.stock_quantity === 0 && (
            <p className="text-xs sm:text-sm text-red-600 font-medium mb-3 sm:mb-4">{t('product.out_of_stock')}</p>
          )}

          {/* WhatsApp & Call Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-6">
            <a href="https://wa.me/213660824724" target="_blank" rel="noopener noreferrer" className="whatsapp-btn w-full sm:w-auto justify-center">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              {t('product.whatsapp')}
            </a>
            <a href="tel:+213660824724" className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-sm text-sm font-medium hover:bg-blue-800 transition-colors w-full sm:w-auto justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
              {t('product.call_us')}
            </a>
          </div>
        </div>

        {/* Order Form */}
        <div className="bg-light p-4 sm:p-8 rounded-sm">
          <h2 className="text-lg sm:text-xl font-bold text-dark mb-4 sm:mb-6 uppercase tracking-wider">{t('product.place_your_order')}</h2>

          {formErrors.form && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm mb-6">{formErrors.form}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-dark mb-2">{t('product.quantity')}</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-10 h-10 border border-gray-300 flex items-center justify-center text-lg hover:border-primary transition-colors">-</button>
                <span className="text-xl font-bold text-dark w-10 text-center">{quantity}</span>
                <button type="button" onClick={() => setQuantity(q => q + 1)}
                  className="w-10 h-10 border border-gray-300 flex items-center justify-center text-lg hover:border-primary transition-colors">+</button>
              </div>
            </div>

            {/* Attributes */}
            {Object.entries(attrGrouped).map(([name, attrs]) => (
              <div key={name}>
                <label className="block text-sm font-medium text-dark mb-2 capitalize">{name}</label>
                <div className="flex flex-wrap gap-2">
                  {attrs.map(a => (
                    <button key={a.id} type="button"
                      onClick={() => setSelectedAttrs(prev => ({ ...prev, [name]: a.attribute_value }))}
                      className={`px-3 sm:px-4 py-2 text-xs sm:text-sm border transition-all ${
                        selectedAttrs[name] === a.attribute_value
                          ? 'border-primary bg-primary text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-primary'
                      }`}
                    >
                      {a.attribute_value}
                      {a.price_modifier > 0 && ` (+${formatPrice(a.price_modifier)})`}
                      {a.price_modifier < 0 && ` (${formatPrice(a.price_modifier)})`}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Customer Name */}
            <div>
              <label className="block text-sm font-medium text-dark mb-2">{t('product.name')} *</label>
              <input type="text" value={form.full_name} onChange={e => updateForm('full_name', e.target.value)}
                className={`input-field ${formErrors.full_name ? 'border-red-500' : ''}`} placeholder={t('product.name_placeholder')} />
              {formErrors.full_name && <p className="text-xs text-red-600 mt-1">{formErrors.full_name}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-dark mb-2">{t('product.phone')} *</label>
              <input type="tel" value={form.phone} onChange={e => updateForm('phone', e.target.value)}
                className={`input-field ${formErrors.phone ? 'border-red-500' : ''}`}
                placeholder={t('product.phone_placeholder')} />
              {formErrors.phone && <p className="text-xs text-red-600 mt-1">{formErrors.phone}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-dark mb-2">{t('product.email')}</label>
              <input type="email" value={form.email} onChange={e => updateForm('email', e.target.value)}
                className="input-field" placeholder="email@example.com" />
            </div>

            {/* Shipping Method */}
            <div>
              <label className="block text-sm font-medium text-dark mb-2">{t('product.delivery_method')} *</label>
              <div className="flex gap-2 sm:gap-3">
                <button type="button"
                  onClick={() => updateForm('shipping_method', 'home_delivery')}
                  className={`flex-1 px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm border transition-all ${
                    form.shipping_method === 'home_delivery'
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-primary'
                  }`}
                >
                  {t('product.home_delivery')}
                </button>
                <button type="button"
                  onClick={() => updateForm('shipping_method', 'office_pickup')}
                  className={`flex-1 px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm border transition-all ${
                    form.shipping_method === 'office_pickup'
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-primary'
                  }`}
                >
                  {t('product.office_pickup')}
                </button>
              </div>
            </div>

            {/* Province */}
            <div>
              <label className="block text-sm font-medium text-dark mb-2">{t('product.province')} *</label>
              <select value={form.province} onChange={e => updateForm('province', e.target.value)}
                className={`input-field ${formErrors.province ? 'border-red-500' : ''}`}>
                <option value="">{t('product.select_province')}</option>
                {ALGERIAN_WILAYAS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {formErrors.province && <p className="text-xs text-red-600 mt-1">{formErrors.province}</p>}
            </div>

            {/* Home Delivery - City & Address */}
            {form.shipping_method === 'home_delivery' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-dark mb-2">{t('product.city')} *</label>
                  <input type="text" value={form.city} onChange={e => updateForm('city', e.target.value)}
                    className={`input-field ${formErrors.city ? 'border-red-500' : ''}`} placeholder={t('product.city_placeholder')} />
                  {formErrors.city && <p className="text-xs text-red-600 mt-1">{formErrors.city}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark mb-2">{t('product.address')}</label>
                  <input type="text" value={form.address} onChange={e => updateForm('address', e.target.value)}
                    className="input-field" placeholder={t('product.address_placeholder')} />
                </div>
              </>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-dark mb-2">{t('product.notes')}</label>
              <textarea value={form.notes} onChange={e => updateForm('notes', e.target.value)}
                className="input-field h-20 resize-none" placeholder={t('product.notes_placeholder')} />
            </div>

            {/* Price Summary */}
            <div className="bg-white p-4 border border-gray-200">
              <div className="flex justify-between text-sm mb-2">
                <span>{t('product.base_price')}</span>
                <span>{product ? formatPrice(product.base_price) : ''}</span>
              </div>
              {attrPriceMod > 0 && (
                <div className="flex justify-between text-sm text-blue-700 mb-2">
                  <span>{t('product.specs_upgrade')}</span>
                  <span>+{formatPrice(attrPriceMod)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm mb-2">
                <span>{t('product.unit_price')}</span>
                <span>{formatPrice(unitPrice)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span>{t('product.quantity')}</span>
                <span>{quantity}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                <span>Original Price</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
              {discountPct > 0 && (
                <>
                  <div className="flex justify-between text-sm text-green-700 font-medium mt-1">
                    <span>Bulk Discount (-{discountPct}%)</span>
                    <span>-{formatPrice(discountAmt)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-green-200 text-green-900">
                    <span>Final Price</span>
                    <span>{formatPrice(finalTotal)}</span>
                  </div>
                </>
              )}
              {discountPct === 0 && (
                <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-gray-200">
                  <span>{t('product.total')}</span>
                  <span className="text-primary">{formatPrice(totalPrice)}</span>
                </div>
              )}
              {quantity > 0 && discountPct === 0 && quantity <= 5 && (
                <p className="text-xs text-gray-400 mt-2 text-right border-t border-gray-50 pt-2">
                  Add {6 - quantity} more item{6 - quantity !== 1 ? 's' : ''} to get a 5% bulk discount
                </p>
              )}
              {discountPct === 5 && (
                <p className="text-xs text-green-600 mt-2 text-right">
                  Add {11 - quantity} more item{11 - quantity !== 1 ? 's' : ''} to get an 8% bulk discount
                </p>
              )}
            </div>

            {cartAdded && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 text-sm text-center rounded">
                Added to cart! <Link to="/cart" className="font-medium underline">View Cart</Link>
              </div>
            )}
            <div className="flex gap-3">
              <button type="button" onClick={handleAddToCart} disabled={product.stock_quantity === 0}
                className="flex-1 text-center py-3 px-4 text-sm font-bold uppercase tracking-wider text-white bg-primary border-2 border-primary hover:bg-white hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {product.stock_quantity === 0 ? t('product.out_of_stock') : t('product.add_to_cart')}
              </button>
              <button type="submit" disabled={submitting || product.stock_quantity === 0}
                className="flex-1 text-center py-3 px-4 text-sm font-bold uppercase tracking-wider text-primary bg-white border-2 border-primary hover:bg-primary hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting ? t('product.processing') : t('product.place_order')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
