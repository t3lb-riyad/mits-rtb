import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n/LanguageContext';
import { useCart } from '../context/CartContext';
import { api, Product, Category } from '../utils/api';

const BEST_OF_OPTIONS = ['study', 'work', 'gaming'] as const;

export default function HomePage() {
  const { t } = useTranslation();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [bestOfProducts, setBestOfProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [bestOfFilter, setBestOfFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [filterBrand, setFilterBrand] = useState('');
  const [filterRam, setFilterRam] = useState('');
  const [filterStorage, setFilterStorage] = useState('');
  const [filterOptions, setFilterOptions] = useState<{ brands: string[]; rams: string[]; storages: string[] }>({ brands: [], rams: [], storages: [] });

  const buildFilterQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (filterBrand) params.set('brand', filterBrand);
    if (filterRam) params.set('ram', filterRam);
    if (filterStorage) params.set('storage', filterStorage);
    const qs = params.toString();
    return qs ? `/products?${qs}` : '/products';
  }, [filterBrand, filterRam, filterStorage]);

  useEffect(() => {
    async function load() {
      try {
        const [catRes, boRes, filterRes] = await Promise.all([
          api.get<{ categories: Category[] }>('/categories'),
          api.get<{ products: Product[] }>('/products?best_of=الدراسة'),
          api.get<{ brands: string[]; rams: string[]; storages: string[] }>('/products/filters'),
        ]);
        setCategories(catRes.categories);
        setBestOfProducts(boRes.products);
        setFilterOptions(filterRes);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    async function loadFiltered() {
      try {
        const res = await api.get<{ products: Product[] }>(buildFilterQuery());
        setAllProducts(res.products);
      } catch (err) {
        console.error('Failed to load filtered products:', err);
      }
    }
    loadFiltered();
  }, [buildFilterQuery]);

  const bestOfFiltered = bestOfFilter
    ? allProducts.filter(p => p.best_of === (
        bestOfFilter === 'study' ? 'الدراسة' :
        bestOfFilter === 'work' ? 'العمل' :
        bestOfFilter === 'gaming' ? 'الألعاب' : null
      ))
    : allProducts.filter(p => p.best_of);

  const filteredProducts = selectedCategory
    ? allProducts.filter((p) => p.category_name?.toLowerCase() === categories.find(c => c.slug === selectedCategory)?.name?.toLowerCase())
    : allProducts;

  const formatPrice = (price: number) => price.toLocaleString() + ' DA';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-primary text-lg font-medium">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div>
      <section className="bg-primary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-6">
              {t('home.hero.title')}
            </h1>
            <p className="text-lg text-blue-200 mb-8 leading-relaxed">
              {t('home.hero.desc')}
            </p>
            <a href="#products" className="inline-block bg-white text-primary font-semibold px-8 py-3 text-sm uppercase tracking-wider hover:bg-blue-50 transition-colors">
              {t('home.hero.browse')}
            </a>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="bg-light py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="section-title mb-8" style={{ color: '#3D1534' }}>{t('home.categories')}</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-5 py-2 text-sm font-medium rounded-sm transition-all ${
                  !selectedCategory ? 'bg-primary text-white' : 'bg-white text-gray-700 border border-gray-200 hover:border-primary'
                }`}
              >
                {t('home.all')}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`px-5 py-2 text-sm font-medium rounded-sm transition-all ${
                    selectedCategory === cat.slug ? 'bg-primary text-white' : 'bg-white text-gray-700 border border-gray-200 hover:border-primary'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {allProducts.some(p => p.best_of) && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="section-title mb-6" style={{ color: '#3D1534' }}>{t('home.best_of')}</h2>
            <div className="flex flex-wrap gap-3 mb-8">
              <button onClick={() => setBestOfFilter(null)}
                className={`px-5 py-2 text-sm font-medium rounded-sm transition-all ${!bestOfFilter ? 'bg-primary text-white' : 'bg-white text-gray-700 border border-gray-200 hover:border-primary'}`}
              >
                {t('home.best_of_all')}
              </button>
              {BEST_OF_OPTIONS.map(opt => (
                <button key={opt} onClick={() => setBestOfFilter(opt)}
                  className={`px-5 py-2 text-sm font-medium rounded-sm transition-all ${bestOfFilter === opt ? 'bg-primary text-white' : 'bg-white text-gray-700 border border-gray-200 hover:border-primary'}`}
                >
                  {t(`home.best_of_${opt}`)}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {bestOfFiltered.map((product) => (
                <div key={product.id} className="card p-5 group hover:shadow-md hover:border-[#3D1534] transition-all flex flex-col">
                  <Link to={`/product/${product.slug}`}>
                    <div className="bg-light rounded-sm h-48 flex items-center justify-center mb-4 overflow-hidden">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="h-full w-full object-contain p-2" />
                      ) : (
                        <span className="text-4xl text-primary group-hover:text-[#3D1534] font-bold">{product.name.charAt(0)}</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-dark mb-2 group-hover:text-[#3D1534] transition-colors">{product.name}</h3>
                    {product.short_description && (
                      <p className="text-xs text-gray-500 mb-3">{product.short_description}</p>
                    )}
                  </Link>
                  <div className="mt-auto">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-primary group-hover:text-[#3D1534]">{formatPrice(product.base_price)}</span>
                      {product.best_of && (
                        <span className="text-xs bg-primary/10 group-hover:bg-[#3D1534]/10 text-primary group-hover:text-[#3D1534] px-2 py-0.5 rounded-sm font-medium">{product.best_of}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => addItem({
                        productId: product.id, productName: product.name, productSlug: product.slug,
                        productImage: product.image_url || '', quantity: 1, unitPrice: product.base_price,
                        selectedRam: '', selectedStorage: '',
                      })} className="flex-1 bg-primary text-white border-2 border-primary text-sm font-medium py-2 rounded hover:bg-white hover:text-primary transition-colors">
                        {t('product.add_to_cart')}
                      </button>
                      <button onClick={() => {
                        addItem({
                          productId: product.id, productName: product.name, productSlug: product.slug,
                          productImage: product.image_url || '', quantity: 1, unitPrice: product.base_price,
                          selectedRam: '', selectedStorage: '',
                        });
                        navigate('/product/' + product.slug);
                      }} className="flex-1 bg-primary text-white border-2 border-primary text-sm font-medium py-2 rounded hover:bg-white hover:text-primary transition-colors">
                        {t('product.place_order')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="products" className="py-16 bg-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <h2 className="section-title mb-0" style={{ color: '#3D1534' }}>
              {selectedCategory ? categories.find(c => c.slug === selectedCategory)?.name || 'Products' : t('home.all_products')}
            </h2>
            <div className="flex-1" />
            <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)} className="input-field text-sm w-auto min-w-[120px]">
              <option value="">{t('home.filter_brand')}</option>
              {filterOptions.brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={filterRam} onChange={e => setFilterRam(e.target.value)} className="input-field text-sm w-auto min-w-[120px]">
              <option value="">{t('home.filter_ram')}</option>
              {filterOptions.rams.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={filterStorage} onChange={e => setFilterStorage(e.target.value)} className="input-field text-sm w-auto min-w-[120px]">
              <option value="">{t('home.filter_storage')}</option>
              {filterOptions.storages.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {(filterBrand || filterRam || filterStorage) && (
              <button onClick={() => { setFilterBrand(''); setFilterRam(''); setFilterStorage(''); }}
                className="text-xs text-red-600 font-medium hover:underline">{t('home.filter_clear')}</button>
            )}
          </div>
          {filteredProducts.length === 0 ? (
            <p className="text-gray-500">{t('home.no_products')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <div key={product.id} className="card p-5 group hover:shadow-md hover:border-[#3D1534] transition-all flex flex-col">
                  <Link to={`/product/${product.slug}`}>
                    <div className="bg-white rounded-sm h-48 flex items-center justify-center mb-4 border border-gray-100 overflow-hidden">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="h-full w-full object-contain p-2" />
                      ) : (
                        <span className="text-4xl text-primary group-hover:text-[#3D1534] font-bold">{product.name.charAt(0)}</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-dark mb-2 group-hover:text-[#3D1534] transition-colors">{product.name}</h3>
                    {product.short_description && (
                      <p className="text-xs text-gray-500 mb-3">{product.short_description}</p>
                    )}
                  </Link>
                  <div className="mt-auto">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-primary group-hover:text-[#3D1534]">{formatPrice(product.base_price)}</span>
                      {product.stock_quantity > 0 ? (
                        <span className="text-xs text-green-600 font-medium">{t('product.in_stock')}</span>
                      ) : (
                        <span className="text-xs text-red-600 font-medium">{t('product.out_of_stock')}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => addItem({
                        productId: product.id, productName: product.name, productSlug: product.slug,
                        productImage: product.image_url || '', quantity: 1, unitPrice: product.base_price,
                        selectedRam: '', selectedStorage: '',
                      })} className="flex-1 bg-primary text-white border-2 border-primary text-sm font-medium py-2 rounded hover:bg-white hover:text-primary transition-colors">
                        {t('product.add_to_cart')}
                      </button>
                      <button onClick={() => {
                        addItem({
                          productId: product.id, productName: product.name, productSlug: product.slug,
                          productImage: product.image_url || '', quantity: 1, unitPrice: product.base_price,
                          selectedRam: '', selectedStorage: '',
                        });
                        navigate('/product/' + product.slug);
                      }} className="flex-1 bg-primary text-white border-2 border-primary text-sm font-medium py-2 rounded hover:bg-white hover:text-primary transition-colors">
                        {t('product.place_order')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-primary text-white flex items-center justify-center mx-auto mb-4 text-lg font-bold">1</div>
              <h3 className="font-semibold text-dark mb-2">{t('home.feature1.title')}</h3>
              <p className="text-sm text-gray-600">{t('home.feature1.desc')}</p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-primary text-white flex items-center justify-center mx-auto mb-4 text-lg font-bold">2</div>
              <h3 className="font-semibold text-dark mb-2">{t('home.feature2.title')}</h3>
              <p className="text-sm text-gray-600">{t('home.feature2.desc')}</p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-primary text-white flex items-center justify-center mx-auto mb-4 text-lg font-bold">3</div>
              <h3 className="font-semibold text-dark mb-2">{t('home.feature3.title')}</h3>
              <p className="text-sm text-gray-600">{t('home.feature3.desc')}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
