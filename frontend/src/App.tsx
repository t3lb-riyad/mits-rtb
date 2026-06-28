import { useState, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './i18n/LanguageContext';
import { CartProvider } from './context/CartContext';
import Preloader from './components/Preloader';
import Header from './components/Header';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import HomePage from './pages/HomePage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import ExchangePage from './pages/ExchangePage';

function App() {
  const [preloaderDone, setPreloaderDone] = useState(false);
  const handlePreloaderFinish = useCallback(() => setPreloaderDone(true), []);

  return (
    <>
      {!preloaderDone && <Preloader onFinish={handlePreloaderFinish} />}
      <LanguageProvider>
        <CartProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/product/:slug" element={<ProductPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/exchange" element={<ExchangePage />} />
              </Routes>
            </main>
            <Footer />
            <CartDrawer />
          </div>
        </CartProvider>
      </LanguageProvider>
    </>
  );
}

export default App;
