import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function CartDrawer() {
  const { items, removeItem, updateQuantity, totalItems, totalPrice } = useCart();
  const [open, setOpen] = useState(false);

  if (totalItems === 0) return null;

  const formatPrice = (price: number) => Math.round(price).toLocaleString() + ' DA';

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 w-14 h-14 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95"
        aria-label="Open cart"
      >
        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shadow">
          {totalItems > 99 ? '99+' : totalItems}
        </span>
      </button>

      {/* Backdrop */}
      {open && <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} />}

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[400px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-dark">Shopping Cart ({totalItems})</h2>
          <button onClick={() => setOpen(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {items.map(item => (
            <div key={item.cartId} className="flex gap-3 py-3 border-b border-gray-50 last:border-0">
              <div className="w-16 h-16 flex-shrink-0 bg-gray-50 rounded overflow-hidden">
                {item.productImage ? (
                  <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl font-bold">{(item.productName || '?')[0]}</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link to={`/product/${item.productSlug}`} onClick={() => setOpen(false)} className="text-sm font-medium text-dark hover:text-primary truncate block">
                  {item.productName}
                </Link>
                {item.selectedRam || item.selectedStorage ? (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {item.selectedRam && `RAM: ${item.selectedRam}`}{item.selectedRam && item.selectedStorage ? ', ' : ''}{item.selectedStorage && `Storage: ${item.selectedStorage}`}
                  </p>
                ) : null}
                <p className="text-sm font-semibold text-primary mt-1">{formatPrice(item.unitPrice)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => updateQuantity(item.cartId, item.quantity - 1)} className="w-6 h-6 border border-gray-300 rounded flex items-center justify-center text-xs text-gray-500 hover:bg-gray-100">&minus;</button>
                  <span className="text-xs font-medium w-5 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.cartId, item.quantity + 1)} className="w-6 h-6 border border-gray-300 rounded flex items-center justify-center text-xs text-gray-500 hover:bg-gray-100">+</button>
                  <button onClick={() => removeItem(item.cartId)} className="ml-auto text-red-400 hover:text-red-600 text-xs font-medium">Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-4 space-y-3">
          <div className="flex justify-between items-center text-base">
            <span className="font-semibold text-dark">Total</span>
            <span className="font-bold text-primary text-lg">{formatPrice(totalPrice)}</span>
          </div>
          <Link to="/cart" onClick={() => setOpen(false)}
            className="block w-full text-center py-3 bg-primary text-white font-bold uppercase tracking-wider text-sm hover:bg-blue-800 transition-colors rounded-sm">
            View Cart & Checkout
          </Link>
          <button onClick={() => setOpen(false)}
            className="block w-full text-center py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Continue Shopping
          </button>
        </div>
      </div>
    </>
  );
}
