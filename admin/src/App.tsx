import { useState, useEffect } from 'react';
import { adminApi, API_BASE, resolveImageUrl } from './utils/api';

type Page = 'dashboard' | 'orders' | 'order-detail' | 'customers' | 'customer-detail'
  | 'products' | 'categories' | 'brands' | 'analytics' | 'inventory' | 'delayed' | 'exchanges'
  | 'abandoned' | 'bulk-import' | 'settings' | 'expenses' | 'delivery';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('admin_token'));
  const [page, setPage] = useState<Page>('dashboard');
  const [admin, setAdmin] = useState<any>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  if (!token) {
    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError('');
      try {
        const res = await adminApi.login(loginForm.username, loginForm.password);
        localStorage.setItem('admin_token', res.token);
        setToken(res.token);
        setAdmin(res.admin);
      } catch (err: any) {
        setLoginError(err.message);
      }
    };
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="card p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-primary">LA MAISON CD</h1>
            <p className="text-sm text-gray-500">Admin ERP Panel</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input type="text" value={loginForm.username} onChange={e => setLoginForm(p => ({ ...p, username: e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))}
                className="input-field" />
            </div>
            {loginError && <p className="text-sm text-red-600">{loginError}</p>}
            <button type="submit" className="btn-primary w-full">Sign In</button>
          </form>
        </div>
      </div>
    );
  }

  const logout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
    setAdmin(null);
  };

  const nav: { page: Page; label: string }[] = [
    { page: 'dashboard', label: 'Dashboard' },
    { page: 'orders', label: 'Orders' },
    { page: 'delayed', label: 'Delayed Shipments' },
    { page: 'products', label: 'Products' },
    { page: 'categories', label: 'Categories' },
    { page: 'brands', label: 'Brands' },
    { page: 'customers', label: 'Customers' },
    { page: 'analytics', label: 'Analytics & Profit' },
    { page: 'expenses', label: 'Expenses' },
    { page: 'inventory', label: 'Inventory' },
    { page: 'delivery', label: 'Delivery Fees' },
    { page: 'exchanges', label: 'Exchanges' },
    { page: 'abandoned', label: 'Abandoned Carts' },
    { page: 'bulk-import', label: 'Bulk Import' },
    { page: 'settings', label: 'Settings' },
  ];

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-dark text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold">LA MAISON CD</h2>
          <p className="text-xs text-gray-400">ERP Admin Panel</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map(n => (
            <button key={n.page} onClick={() => setPage(n.page)}
              className={`sidebar-link w-full text-left ${page === n.page ? 'active' : ''}`}>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-700">
          <p className="text-xs text-gray-400 mb-2">{admin?.full_name || 'Admin'}</p>
          <button onClick={logout} className="text-xs text-gray-400 hover:text-white transition-colors">Sign Out</button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {page === 'dashboard' && <DashboardPage />}
          {page === 'orders' && <OrdersPage onViewOrder={() => setPage('order-detail')} />}
          {page === 'order-detail' && <OrderDetailPage />}
          {page === 'customers' && <CustomersPage />}
          {page === 'products' && <ProductsPage />}
          {page === 'categories' && <CategoriesPage />}
          {page === 'brands' && <BrandsPage />}
          {page === 'analytics' && <AnalyticsPage />}
          {page === 'expenses' && <ExpensesPage />}
          {page === 'inventory' && <InventoryPage />}
          {page === 'delayed' && <DelayedShipmentsPage />}
          {page === 'exchanges' && <ExchangesPage />}
          {page === 'abandoned' && <AbandonedCartsPage />}
          {page === 'bulk-import' && <BulkImportPage />}
          {page === 'delivery' && <DeliveryPage />}
          {page === 'settings' && <SettingsPage />}
        </div>
      </main>
    </div>
  );
}

/* =================== DASHBOARD =================== */
function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    adminApi.get('/dashboard').then(setData).catch(err => {
      if (err.message === 'Session expired') return;
      setError(err.message);
      console.error(err);
    });
  }, []);

  if (error) return <div className="text-center py-10 text-red-500">Failed to load dashboard: {error}</div>;
  if (!data) return <div className="text-center py-10 text-gray-500">Loading dashboard...</div>;

  const cards = [
    { label: 'Total Orders', value: data.totalOrders, color: 'text-primary' },
    { label: 'Pending Orders', value: data.pendingOrders, color: 'text-yellow-600' },
    { label: 'Today Orders', value: data.todayOrders, color: 'text-green-600' },
    { label: 'Total Revenue', value: `${Math.round(data.totalRevenue).toLocaleString()} DA`, color: 'text-primary' },
    { label: 'Customers', value: data.totalCustomers, color: 'text-dark' },
    { label: 'Pending Exchanges', value: data.pendingExchanges, color: 'text-orange-600' },
    { label: 'Low Stock Items', value: data.lowStock, color: 'text-red-600' },
    { label: 'Delayed Shipments', value: data.delayedShipments, color: 'text-red-600' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="card p-5">
            <p className="text-sm text-gray-500 mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =================== ORDERS =================== */
function OrdersPage({ onViewOrder }: { onViewOrder: () => void }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    adminApi.get<{ orders: any[] }>(`/orders?status=${filter}`).then(r => setOrders(r.orders)).catch(console.error);
  }, [filter]);

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { confirmed: 'badge-blue', delivered: 'badge-green', returned: 'badge-red', cancelled: 'badge-red', pending: 'badge-yellow' };
    return <span className={map[s] || 'badge-gray'}>{s}</span>;
  };

  const handleDeleteOrder = async (id: number) => {
    if (!confirm('Delete this order permanently? Revenue will be recalculated.')) return;
    try { await adminApi.del('/orders/' + id); setOrders(prev => prev.filter(o => o.id !== id)); } catch (err: any) { alert(err.message); }
  };

  const handleBanCustomer = async (order: any) => {
    if (!confirm('Block ' + order.customer_phone + ' from placing future orders?')) return;
    try { await adminApi.post('/orders/' + order.id + '/ban', {}); alert('Customer blocked.'); } catch (err: any) { alert(err.message); }
  };

  if (selectedId) {
    return <OrderDetailView orderId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-dark">Orders</h1>
        <div className="flex gap-2">
          {['all', 'confirmed', 'delivered', 'returned', 'cancelled'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1 text-xs font-medium rounded ${filter === s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">Order #</th>
              <th className="px-4 py-3 font-medium text-gray-600">Customer</th>
              <th className="px-4 py-3 font-medium text-gray-600">Product</th>
              <th className="px-4 py-3 font-medium text-gray-600">Notes</th>
              <th className="px-4 py-3 font-medium text-gray-600">Total</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 font-medium text-gray-600">Risk</th>
              <th className="px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map(o => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{o.order_number}</td>
                <td className="px-4 py-3">{o.customer_name}<br /><span className="text-xs text-gray-500">{o.customer_phone}</span></td>
                <td className="px-4 py-3">{o.product_name} x{o.quantity}</td>
                <td className="px-4 py-3 text-xs text-gray-500 max-w-[120px] truncate" title={o.notes || ''}>{o.notes || '-'}</td>
                <td className="px-4 py-3">{Math.round(o.total_amount).toLocaleString()} DA</td>
                <td className="px-4 py-3">{statusBadge(o.order_status)}</td>
                <td className="px-4 py-3">
                  {o.risk_score > 0.6 ? <span className="badge-red">High Risk</span>
                    : o.returned_packages > 0 ? <span className="badge-yellow">{o.returned_packages} Retour</span>
                    : <span className="badge-green">Low</span>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{new Date(o.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={() => setSelectedId(o.id)} className="text-primary text-xs font-medium hover:underline">View</button>
                  <button onClick={() => handleDeleteOrder(o.id)} className="text-red-600 text-xs font-medium hover:underline">Delete</button>
                  <button onClick={() => handleBanCustomer(o)} className="text-orange-600 text-xs font-medium hover:underline">Ban</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <p className="text-center py-8 text-gray-500">No orders found.</p>}
      </div>
    </div>
  );
}

/* =================== ORDER DETAIL =================== */
function OrderDetailView({ orderId, onBack }: { orderId: number; onBack: () => void }) {
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [tracking, setTracking] = useState('');
  const [courier, setCourier] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    adminApi.get<{ order: any; history: any[]; orderItems: any[] }>(`/orders/${orderId}`).then(r => {
      setData(r);
      setStatus(r.order.order_status);
      setTracking(r.order.tracking_number || '');
      setCourier(r.order.courier_name || '');
    }).catch(console.error);
  }, [orderId]);

  if (!data) return <div className="text-center py-10 text-gray-500">Loading...</div>;

  const { order, history, orderItems } = data;

  const updateStatus = async () => {
    try {
      await adminApi.put(`/orders/${orderId}/status`, {
        order_status: status,
        tracking_number: tracking,
        courier_name: courier,
        notes,
      });
      alert('Order updated successfully.');
    } catch (err: any) { alert(err.message); }
  };

  return (
    <div>
      <button onClick={onBack} className="text-primary text-sm mb-4 hover:underline">&larr; Back to Orders</button>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="section-title mb-4">Order #{order.order_number}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-500">Customer</p><p className="font-medium">{order.customer_name}</p></div>
              <div><p className="text-gray-500">Phone</p><p className="font-medium">{order.customer_phone}</p></div>
              <div><p className="text-gray-500">Items</p><p className="font-medium">{order.item_count || 1} product(s)</p></div>
              <div><p className="text-gray-500">Total</p><p className="font-medium text-primary">{Math.round(order.total_amount).toLocaleString()} DA</p></div>
              <div><p className="text-gray-500">Shipping</p><p className="font-medium capitalize">{order.shipping_method.replace(/_/g, ' ')}</p></div>
              <div><p className="text-gray-500">Date</p><p className="font-medium">{new Date(order.created_at).toLocaleString()}</p></div>
            </div>
            {orderItems && orderItems.length > 0 && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <h3 className="text-sm font-bold text-dark mb-3">Order Items</h3>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium text-gray-600">Image</th>
                      <th className="px-3 py-2 font-medium text-gray-600">Product</th>
                      <th className="px-3 py-2 font-medium text-gray-600">Options</th>
                      <th className="px-3 py-2 font-medium text-gray-600">Qty</th>
                      <th className="px-3 py-2 font-medium text-gray-600">Price</th>
                      <th className="px-3 py-2 font-medium text-gray-600">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orderItems.map((item: any) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          {(item.product_image || item.product_image_url) ? (
                            <img src={resolveImageUrl(item.product_image || item.product_image_url)} alt={item.product_name} className="h-10 w-10 object-cover rounded" />
                          ) : (
                            <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">-</div>
                          )}
                        </td>
                        <td className="px-3 py-2 font-medium">{item.product_name}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {item.selected_ram || item.selected_storage || item.selected_hdd
                            ? [item.selected_ram && `RAM: ${item.selected_ram}`, item.selected_storage && `Storage: ${item.selected_storage}`, item.selected_hdd && `HDD: ${item.selected_hdd}`].filter(Boolean).join(', ')
                            : item.attributes
                              ? (() => { try { const a = JSON.parse(item.attributes); return Object.entries(a).map(([k, v]) => `${k}: ${v}`).join(', '); } catch { return item.attributes; } })()
                              : '-'}
                        </td>
                        <td className="px-3 py-2">{item.quantity}</td>
                        <td className="px-3 py-2">{Math.round(item.unit_price).toLocaleString()} DA</td>
                        <td className="px-3 py-2 font-medium">{Math.round(item.unit_price * item.quantity).toLocaleString()} DA</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card p-6">
            <h2 className="section-title mb-4">Update Status</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Order Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="input-field">
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="returned">Returned</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tracking Number</label>
                <input type="text" value={tracking} onChange={e => setTracking(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Courier</label>
                <input type="text" value={courier} onChange={e => setCourier(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="input-field" />
              </div>
            </div>
            <button onClick={updateStatus} className="btn-primary">Update Order</button>
          </div>

          <div className="card p-6">
            <h2 className="section-title mb-4">Status History</h2>
            <div className="space-y-3">
              {history.map((h: any) => (
                <div key={h.id} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium capitalize">{h.status.replace(/_/g, ' ')}</p>
                    {h.notes && <p className="text-gray-500 text-xs">{h.notes}</p>}
                    <p className="text-xs text-gray-400">{new Date(h.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="section-title mb-4">Customer Risk Assessment</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span>Total Orders</span><span className="font-medium">{data.order.customer_total_orders || 0}</span></div>
              <div className="flex justify-between"><span>Successful Deliveries</span><span className="font-medium text-green-600">{order.successful_deliveries || 0}</span></div>
              <div className="flex justify-between"><span>Returned Packages</span><span className="font-medium text-red-600">{order.returned_packages || 0}</span></div>
              <div className="flex justify-between"><span>Risk Score</span>
                <span className={`font-medium ${(order.risk_score || 0) > 0.6 ? 'text-red-600' : 'text-green-600'}`}>
                  {((order.risk_score || 0) * 100).toFixed(0)}%
                </span>
              </div>
              {(order.returned_packages || 0) > 0 && (
                <div className="bg-red-50 border border-red-200 p-3 mt-2">
                  <p className="text-xs text-red-700 font-medium">Attention: Customer has {order.returned_packages} returned package(s).</p>
                </div>
              )}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="section-title mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <a href={`https://wa.me/${order.customer_phone}`} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-[#25D366] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#20BD5A]">
                WhatsApp Customer
              </a>
              <a href={`tel:${order.customer_phone}`} className="block w-full text-center btn-primary">
                Call Customer
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderDetailPage() {
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id') || '0');
  return <OrderDetailView orderId={id} onBack={() => window.history.back()} />;
}

/* =================== CUSTOMERS =================== */
function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    adminApi.get<{ customers: any[] }>(`/customers?search=${search}`).then(r => setCustomers(r.customers)).catch(console.error);
  }, [search]);

  if (selected) {
    return <CustomerDetailView customerId={selected.id} onBack={() => setSelected(null)} />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">Customers</h1>
      <div className="mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          className="input-field max-w-xs" placeholder="Search by name or phone..." />
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 font-medium text-gray-600">Phone</th>
              <th className="px-4 py-3 font-medium text-gray-600">Orders</th>
              <th className="px-4 py-3 font-medium text-gray-600">Spent</th>
              <th className="px-4 py-3 font-medium text-gray-600">Returns</th>
              <th className="px-4 py-3 font-medium text-gray-600">Risk</th>
              <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {customers.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{c.full_name}</td>
                <td className="px-4 py-3">{c.phone}</td>
                <td className="px-4 py-3">{c.total_orders}</td>
                <td className="px-4 py-3">{Math.round(c.total_spent).toLocaleString()} DA</td>
                <td className="px-4 py-3">
                  {c.returned_packages > 0 ? <span className="badge-red">{c.returned_packages}</span> : '-'}
                </td>
                <td className="px-4 py-3">
                  {(c.risk_score || 0) > 0.6 ? <span className="badge-red">High</span> : <span className="badge-green">Low</span>}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => setSelected(c)} className="text-primary text-xs font-medium hover:underline">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CustomerDetailView({ customerId, onBack }: { customerId: number; onBack: () => void }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    adminApi.get<{ customer: any; orders: any[]; exchanges: any[] }>(`/customers/${customerId}`).then(setData).catch(console.error);
  }, [customerId]);

  if (!data) return <div className="text-center py-10 text-gray-500">Loading...</div>;
  const { customer, orders, exchanges } = data;

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { confirmed: 'badge-blue', delivered: 'badge-green', returned: 'badge-red', cancelled: 'badge-red' };
    return <span className={map[s] || 'badge-gray'}>{s}</span>;
  };

  return (
    <div>
      <button onClick={onBack} className="text-primary text-sm mb-4 hover:underline">&larr; Back to Customers</button>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6">
          <h2 className="section-title mb-4">Customer Details</h2>
          <div className="space-y-3 text-sm">
            <div><span className="text-gray-500">Name:</span> <span className="font-medium">{customer.full_name}</span></div>
            <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{customer.phone}</span></div>
            <div><span className="text-gray-500">Email:</span> <span className="font-medium">{customer.email || '-'}</span></div>
            <div><span className="text-gray-500">Total Orders:</span> <span className="font-medium">{customer.total_orders}</span></div>
            <div><span className="text-gray-500">Total Spent:</span> <span className="font-medium text-primary">{Math.round(customer.total_spent).toLocaleString()} DA</span></div>
            <div><span className="text-gray-500">Deliveries:</span> <span className="font-medium text-green-600">{customer.successful_deliveries}</span></div>
            <div><span className="text-gray-500">Returns:</span> <span className="font-medium text-red-600">{customer.returned_packages}</span></div>
            {customer.returned_packages > 0 && (
              <div className="bg-red-50 p-3 border border-red-200 mt-2">
                <p className="text-xs text-red-700 font-medium">This customer has returned packages. Flagged for review.</p>
              </div>
            )}
          </div>
        </div>
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="section-title mb-4">Order History ({orders.length})</h2>
            <div className="space-y-3">
              {orders.map(o => (
                <div key={o.id} className="flex items-center justify-between text-sm p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{o.order_number}</p>
                    <p className="text-xs text-gray-500">{o.product_name} x{o.quantity} - {Math.round(o.total_amount).toLocaleString()} DA</p>
                  </div>
                  <div className="text-right">
                    {statusBadge(o.order_status)}
                    <p className="text-xs text-gray-400 mt-1">{new Date(o.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {exchanges.length > 0 && (
            <div className="card p-6">
              <h2 className="section-title mb-4">Exchange Requests</h2>
              {exchanges.map(e => (
                <div key={e.id} className="text-sm p-3 bg-gray-50 rounded mb-2">
                  <p className="font-medium">{e.status} - {new Date(e.created_at).toLocaleDateString()}</p>
                  <p className="text-xs text-gray-500">{e.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =================== PRODUCTS =================== */
const RAM_OPTIONS = ['2GB', '4GB', '8GB', '16GB', '18GB', '24GB', '32GB', '36GB', '64GB', '128GB'];
const STORAGE_OPTIONS = ['128GB SSD', '256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD', '4TB SSD'];
const HDD_OPTIONS = ['500GB HDD', '1TB HDD', '2TB HDD'];

function AttrValueField({ name, value, onChange }: { name: string; value: string; onChange: (v: string) => void }) {
  const options = name === 'RAM' ? RAM_OPTIONS : name === 'Storage' ? STORAGE_OPTIONS : name === 'HDD' ? HDD_OPTIONS : null;
  if (options) {
    return (
      <select value={value} onChange={e => onChange(e.target.value)} className="input-field text-xs">
        <option value="">Select...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  return <input type="text" value={value} onChange={e => onChange(e.target.value)} className="input-field text-xs" placeholder="e.g. Value" />;
}

function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', base_price: 0, cost_price: 0, stock_quantity: 0, category_id: 0, brand_id: 0, description: '', short_description: '', best_of: '', image_url: '', image_urls: [] as string[], discount_tier1_percent: 0, discount_tier2_percent: 0 });
  const [brandNewName, setBrandNewName] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productAttrs, setProductAttrs] = useState<{ attribute_name: string; attribute_value: string; price_modifier: number }[]>([]);
  const [editAttrs, setEditAttrs] = useState<{ attribute_name: string; attribute_value: string; price_modifier: number }[]>([]);
  const [editBrandNewName, setEditBrandNewName] = useState('');

  const load = () => {
    adminApi.get<{ products: any[] }>('/products').then(r => setProducts(r.products)).catch(console.error);
    adminApi.get<{ categories: any[] }>('/categories').then(r => setCategories(r.categories)).catch(console.error);
    adminApi.get<{ brands: any[] }>('/brands').then(r => setBrands(r.brands)).catch(console.error);
  };
  useEffect(load, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'create' | 'edit') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      if (target === 'create') setForm(p => ({ ...p, image_url: dataUrl }));
      else setEditingProduct((p: any) => ({ ...p, image_url: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'create' | 'edit') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    let index = 0;
    const readNext = () => {
      if (index >= files.length) { e.target.value = ''; return; }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        if (target === 'create') setForm(p => ({ ...p, image_urls: [...p.image_urls, dataUrl] }));
        else setEditingProduct((p: any) => ({ ...p, image_urls: [...(p.image_urls || []), dataUrl] }));
        index++;
        readNext();
      };
      reader.readAsDataURL(files[index]);
    };
    readNext();
  };

  const removeGalleryImage = (target: 'create' | 'edit', index: number) => {
    if (target === 'create') setForm(p => ({ ...p, image_urls: p.image_urls.filter((_, i) => i !== index) }));
    else setEditingProduct((p: any) => ({ ...p, image_urls: (p.image_urls || []).filter((_: string, i: number) => i !== index) }));
  };

  const addAttrRow = (target: 'create' | 'edit') => {
    if (target === 'create') setProductAttrs(p => [...p, { attribute_name: '', attribute_value: '', price_modifier: 0 }]);
    else setEditAttrs(p => [...p, { attribute_name: '', attribute_value: '', price_modifier: 0 }]);
  };

  const updateAttrRow = (target: 'create' | 'edit', index: number, field: string, value: any) => {
    const upd = (arr: any[]) => arr.map((r, i) => i === index ? { ...r, [field]: value } : r);
    if (target === 'create') setProductAttrs(upd);
    else setEditAttrs(upd);
  };

  const removeAttrRow = (target: 'create' | 'edit', index: number) => {
    const rm = (arr: any[]) => arr.filter((_, i) => i !== index);
    if (target === 'create') setProductAttrs(rm);
    else setEditAttrs(rm);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let brandId = form.brand_id || null;
      if (form.brand_id === -1 && brandNewName.trim()) {
        const res = await adminApi.post<{ success: boolean; id?: number }>('/brands', { name: brandNewName.trim() });
        if (res.success) {
          const brandsRes = await adminApi.get<{ brands: any[] }>('/brands');
          const created = brandsRes.brands.find(b => b.name === brandNewName.trim());
          brandId = created ? created.id : null;
        }
      }
      const token = localStorage.getItem('admin_token');
      const res = await fetch(API_BASE + '/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) },
        body: JSON.stringify({ ...form, brand_id: brandId, image_urls: form.image_urls.length > 0 ? JSON.stringify(form.image_urls) : null, product_attributes: productAttrs.filter(a => a.attribute_name && a.attribute_value), slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') }),
      });
      const ct = res.headers.get('content-type');
      if (!res.ok || !ct || !ct.includes('application/json')) {
        const raw = await res.text();
        console.error('Create product raw error:', raw);
        alert('Server Error (' + res.status + '): check console for details');
        return;
      }
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      setShowForm(false);
      setProductAttrs([]);
      setBrandNewName('');
      setForm({ name: '', slug: '', base_price: 0, cost_price: 0, stock_quantity: 0, category_id: 0, brand_id: 0, description: '', short_description: '', best_of: '', image_url: '', image_urls: [], discount_tier1_percent: 0, discount_tier2_percent: 0 });
      load();
    } catch (err: any) { alert(err.message); }
  };

  const handleDeleteProduct = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) return;
    try {
      await adminApi.del('/products/' + id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err: any) { alert(err.message); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let brandId = editingProduct.brand_id || null;
      if (editingProduct.brand_id === -1 && editBrandNewName.trim()) {
        const res = await adminApi.post<{ success: boolean; id?: number }>('/brands', { name: editBrandNewName.trim() });
        if (res.success) {
          const brandsRes = await adminApi.get<{ brands: any[] }>('/brands');
          const created = brandsRes.brands.find(b => b.name === editBrandNewName.trim());
          brandId = created ? created.id : null;
        }
      }
      const token = localStorage.getItem('admin_token');
      const res = await fetch(API_BASE + '/products/' + editingProduct.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) },
        body: JSON.stringify({
          name: editingProduct.name,
          slug: editingProduct.slug,
          base_price: editingProduct.base_price,
          cost_price: editingProduct.cost_price,
          stock_quantity: editingProduct.stock_quantity,
          category_id: editingProduct.category_id || null,
          brand_id: brandId,
          description: editingProduct.description,
          short_description: editingProduct.short_description,
          best_of: editingProduct.best_of || null,
          image_url: editingProduct.image_url || null,
          image_urls: editingProduct.image_urls ? JSON.stringify(editingProduct.image_urls) : null,
          discount_tier1_percent: editingProduct.discount_tier1_percent || 0,
          discount_tier2_percent: editingProduct.discount_tier2_percent || 0,
          product_attributes: editAttrs.filter(a => a.attribute_name && a.attribute_value)
        }),
      });
      const ct = res.headers.get('content-type');
      if (!res.ok || !ct || !ct.includes('application/json')) {
        const raw = await res.text();
        console.error('Edit product raw error:', raw);
        alert('Server Error (' + res.status + '): check console for details');
        return;
      }
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      setEditingProduct(null);
      setEditAttrs([]);
      setEditBrandNewName('');
      load();
    } catch (err: any) { alert(err.message); }
  };

  const loadEditAttrs = async (productId: number) => {
    try {
      const r = await adminApi.get<{ attributes: any[] }>('/products/' + productId + '/attributes');
      setEditAttrs(r.attributes.map((a: any) => ({ attribute_name: a.attribute_name, attribute_value: a.attribute_value, price_modifier: a.price_modifier })));
    } catch { setEditAttrs([]); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-dark">Products</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : 'Add Product'}
        </button>
      </div>

      {showForm && (
        <div className="card p-6 mb-6">
          <h2 className="section-title mb-4">New Product</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') }))} className="input-field" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Slug</label>
              <input type="text" value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: parseInt(e.target.value) }))} className="input-field">
                <option value={0}>None</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Brand</label>
              <select value={form.brand_id} onChange={e => { setForm(p => ({ ...p, brand_id: parseInt(e.target.value) })); if (parseInt(e.target.value) !== -1) setBrandNewName(''); } } className="input-field">
                <option value={0}>None</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                <option value={-1}>Other (Add New Brand)</option>
              </select>
              {form.brand_id === -1 && (
                <input type="text" value={brandNewName} onChange={e => setBrandNewName(e.target.value)} className="input-field mt-2" placeholder="Enter new brand name..." />
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Base Price (DA) *</label>
              <input type="number" value={form.base_price} onChange={e => setForm(p => ({ ...p, base_price: parseFloat(e.target.value) }))} className="input-field" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cost Price (DA)</label>
              <input type="number" value={form.cost_price} onChange={e => setForm(p => ({ ...p, cost_price: parseFloat(e.target.value) }))} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Stock</label>
              <input type="number" value={form.stock_quantity} onChange={e => setForm(p => ({ ...p, stock_quantity: parseInt(e.target.value) }))} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Discount 5+ (%)</label>
              <input type="number" min="0" max="100" step="0.5" value={form.discount_tier1_percent} onChange={e => setForm(p => ({ ...p, discount_tier1_percent: parseFloat(e.target.value) || 0 }))} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Discount 10+ (%)</label>
              <input type="number" min="0" max="100" step="0.5" value={form.discount_tier2_percent} onChange={e => setForm(p => ({ ...p, discount_tier2_percent: parseFloat(e.target.value) || 0 }))} className="input-field" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="input-field" rows={2} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Best Of</label>
              <select value={form.best_of} onChange={e => setForm(p => ({ ...p, best_of: e.target.value }))} className="input-field">
                <option value="">None</option>
                <option value="الدراسة">الدراسة</option>
                <option value="العمل">العمل</option>
                <option value="الألعاب">الألعاب</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Main Image (Thumbnail)</label>
              <div className="flex items-center gap-3">
                <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'create')} className="text-sm" />
              </div>
              {form.image_url && (
                <div className="mt-2">
                  <img src={form.image_url} alt="Preview" className="h-20 w-20 object-cover rounded border" />
                </div>
              )}
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Gallery Images (optional)</label>
              <div className="flex items-center gap-3">
                <input type="file" accept="image/*" multiple onChange={e => handleGalleryUpload(e, 'create')} className="text-sm" />
              </div>
              {form.image_urls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.image_urls.map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt={`Gallery ${i}`} className="h-16 w-16 object-cover rounded border" />
                      <button type="button" onClick={() => removeGalleryImage('create', i)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs w-5 h-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="sm:col-span-3 border-t border-gray-200 pt-4 mt-2">
              <h3 className="text-sm font-bold text-dark mb-3">Dynamic Attributes (RAM, Storage, etc.)</h3>
              {productAttrs.map((a, i) => (
                <div key={i} className="flex gap-2 items-end mb-2">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Name</label>
                    <input type="text" value={a.attribute_name} onChange={e => updateAttrRow('create', i, 'attribute_name', e.target.value)} className="input-field text-xs" placeholder="e.g. RAM" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Value</label>
                    <AttrValueField name={a.attribute_name} value={a.attribute_value} onChange={v => updateAttrRow('create', i, 'attribute_value', v)} />
                  </div>
                  <div className="w-28">
                    <label className="block text-xs text-gray-500 mb-1">Price +DA</label>
                    <input type="number" value={a.price_modifier} onChange={e => updateAttrRow('create', i, 'price_modifier', parseFloat(e.target.value) || 0)} className="input-field text-xs" />
                  </div>
                  <button type="button" onClick={() => removeAttrRow('create', i)} className="text-red-500 text-lg mb-1">&times;</button>
                </div>
              ))}
              <button type="button" onClick={() => addAttrRow('create')} className="text-xs text-primary font-medium hover:underline">+ Add Attribute</button>
            </div>
            <div className="sm:col-span-3">
              <button type="submit" className="btn-primary">Create Product</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">Image</th>
              <th className="px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 font-medium text-gray-600">Brand</th>
              <th className="px-4 py-3 font-medium text-gray-600">Category</th>
              <th className="px-4 py-3 font-medium text-gray-600">Price</th>
              <th className="px-4 py-3 font-medium text-gray-600">Cost</th>
              <th className="px-4 py-3 font-medium text-gray-600">Stock</th>
              <th className="px-4 py-3 font-medium text-gray-600">Orders</th>
              <th className="px-4 py-3 font-medium text-gray-600">Best Of</th>
              <th className="px-4 py-3 font-medium text-gray-600">5+%</th>
              <th className="px-4 py-3 font-medium text-gray-600">10+%</th>
              <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  {p.image_url ? (
                    <img src={resolveImageUrl(p.image_url)} alt={p.name} className="h-10 w-10 object-cover rounded" />
                  ) : (
                    <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">No img</div>
                  )}
                </td>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3">{p.brand_name || '-'}</td>
                <td className="px-4 py-3">{p.category_name || '-'}</td>
                <td className="px-4 py-3">{Math.round(p.base_price).toLocaleString()} DA</td>
                <td className="px-4 py-3">{Math.round(p.cost_price).toLocaleString()} DA</td>
                <td className="px-4 py-3">
                  <span className={p.stock_quantity <= p.low_stock_threshold ? 'text-red-600 font-medium' : ''}>{p.stock_quantity}</span>
                </td>
                <td className="px-4 py-3">{p.order_count || 0}</td>
                <td className="px-4 py-3">{p.best_of || '-'}</td>
                <td className="px-4 py-3">{p.discount_tier1_percent || 0}%</td>
                <td className="px-4 py-3">{p.discount_tier2_percent || 0}%</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setEditingProduct({ ...p, image_urls: p.image_urls ? JSON.parse(p.image_urls) : [] }); loadEditAttrs(p.id); }} className="text-primary text-xs font-medium hover:underline">Edit</button>
                    <button onClick={() => handleDeleteProduct(p.id, p.name)} className="text-red-600 text-xs font-medium hover:underline" title="Delete product">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setEditingProduct(null); setEditBrandNewName(''); }}>
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="section-title mb-4">Edit Product</h2>
            <form onSubmit={handleEdit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                <input type="text" value={editingProduct.name} onChange={e => setEditingProduct(p => ({ ...p, name: e.target.value }))} className="input-field" required />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Slug</label>
                <input type="text" value={editingProduct.slug} onChange={e => setEditingProduct(p => ({ ...p, slug: e.target.value }))} className="input-field" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select value={editingProduct.category_id || 0} onChange={e => setEditingProduct(p => ({ ...p, category_id: parseInt(e.target.value) }))} className="input-field">
                  <option value={0}>None</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Brand</label>
                <select value={editingProduct.brand_id || 0} onChange={e => { setEditingProduct(p => ({ ...p, brand_id: parseInt(e.target.value) })); if (parseInt(e.target.value) !== -1) setEditBrandNewName(''); } } className="input-field">
                  <option value={0}>None</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  <option value={-1}>Other (Add New Brand)</option>
                </select>
                {editingProduct.brand_id === -1 && (
                  <input type="text" value={editBrandNewName} onChange={e => setEditBrandNewName(e.target.value)} className="input-field mt-2" placeholder="Enter new brand name..." />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Base Price (DA)</label>
                <input type="number" value={editingProduct.base_price} onChange={e => setEditingProduct(p => ({ ...p, base_price: parseFloat(e.target.value) }))} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cost Price (DA)</label>
                <input type="number" value={editingProduct.cost_price} onChange={e => setEditingProduct(p => ({ ...p, cost_price: parseFloat(e.target.value) }))} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Stock</label>
                <input type="number" value={editingProduct.stock_quantity} onChange={e => setEditingProduct(p => ({ ...p, stock_quantity: parseInt(e.target.value) }))} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Best Of</label>
                <select value={editingProduct.best_of || ''} onChange={e => setEditingProduct(p => ({ ...p, best_of: e.target.value }))} className="input-field">
                  <option value="">None</option>
                  <option value="الدراسة">الدراسة</option>
                  <option value="العمل">العمل</option>
                  <option value="الألعاب">الألعاب</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Discount 5+ (%)</label>
                <input type="number" min="0" max="100" step="0.5" value={editingProduct.discount_tier1_percent || 0} onChange={e => setEditingProduct(p => ({ ...p, discount_tier1_percent: parseFloat(e.target.value) || 0 }))} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Discount 10+ (%)</label>
                <input type="number" min="0" max="100" step="0.5" value={editingProduct.discount_tier2_percent || 0} onChange={e => setEditingProduct(p => ({ ...p, discount_tier2_percent: parseFloat(e.target.value) || 0 }))} className="input-field" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea value={editingProduct.description || ''} onChange={e => setEditingProduct(p => ({ ...p, description: e.target.value }))} className="input-field" rows={2} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Main Image (Thumbnail)</label>
                <div className="flex items-center gap-3">
                  <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'edit')} className="text-sm" />
                </div>
                {editingProduct.image_url && (
                  <div className="mt-2">
                    <img src={editingProduct.image_url} alt="Preview" className="h-20 w-20 object-cover rounded border" />
                  </div>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Gallery Images (optional)</label>
                <div className="flex items-center gap-3">
                  <input type="file" accept="image/*" multiple onChange={e => handleGalleryUpload(e, 'edit')} className="text-sm" />
                </div>
                {editingProduct.image_urls && editingProduct.image_urls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editingProduct.image_urls.map((url: string, i: number) => (
                      <div key={i} className="relative group">
                        <img src={url} alt={`Gallery ${i}`} className="h-16 w-16 object-cover rounded border" />
                        <button type="button" onClick={() => removeGalleryImage('edit', i)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs w-5 h-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="sm:col-span-2 border-t border-gray-200 pt-4 mt-2">
                <h3 className="text-sm font-bold text-dark mb-3">Dynamic Attributes (RAM, Storage, etc.)</h3>
                {editAttrs.map((a, i) => (
                  <div key={i} className="flex gap-2 items-end mb-2">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Name</label>
                      <input type="text" value={a.attribute_name} onChange={e => updateAttrRow('edit', i, 'attribute_name', e.target.value)} className="input-field text-xs" placeholder="e.g. RAM" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Value</label>
                      <AttrValueField name={a.attribute_name} value={a.attribute_value} onChange={v => updateAttrRow('edit', i, 'attribute_value', v)} />
                    </div>
                    <div className="w-28">
                      <label className="block text-xs text-gray-500 mb-1">Price +DA</label>
                      <input type="number" value={a.price_modifier} onChange={e => updateAttrRow('edit', i, 'price_modifier', parseFloat(e.target.value) || 0)} className="input-field text-xs" />
                    </div>
                    <button type="button" onClick={() => removeAttrRow('edit', i)} className="text-red-500 text-lg mb-1">&times;</button>
                  </div>
                ))}
                <button type="button" onClick={() => addAttrRow('edit')} className="text-xs text-primary font-medium hover:underline">+ Add Attribute</button>
              </div>
              <div className="sm:col-span-2 flex gap-3 justify-end">
                <button type="button" onClick={() => { setEditingProduct(null); setEditAttrs([]); setEditBrandNewName(''); }} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* =================== ANALYTICS =================== */
function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { adminApi.get('/analytics/profit').then(setData).catch(console.error); }, []);

  if (!data) return <div className="text-center py-10 text-gray-500">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">Financial Analytics & Profit Calculator</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-5">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-2xl font-bold text-green-600">{Math.round(data.summary.totalRevenue).toLocaleString()} DA</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500">Total Costs</p>
          <p className="text-2xl font-bold text-red-600">{Math.round(data.summary.totalCosts).toLocaleString()} DA</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500">Net Profit</p>
          <p className={`text-2xl font-bold ${data.summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {Math.round(data.summary.netProfit).toLocaleString()} DA
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500">Net Margin</p>
          <p className={`text-2xl font-bold ${data.summary.netMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {data.summary.netMargin}%
          </p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">Product</th>
              <th className="px-4 py-3 font-medium text-gray-600">Units Sold</th>
              <th className="px-4 py-3 font-medium text-gray-600">Revenue</th>
              <th className="px-4 py-3 font-medium text-gray-600">Cost (COGS)</th>
              <th className="px-4 py-3 font-medium text-gray-600">Net Profit</th>
              <th className="px-4 py-3 font-medium text-gray-600">Margin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.products.map((p: any) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3">{p.units_sold}</td>
                <td className="px-4 py-3">{Math.round(p.profit.revenue).toLocaleString()} DA</td>
                <td className="px-4 py-3">{Math.round(p.profit.totalCosts).toLocaleString()} DA</td>
                <td className={`px-4 py-3 font-medium ${p.profit.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.round(p.profit.netProfit).toLocaleString()} DA
                </td>
                <td className="px-4 py-3">{p.profit.profitMargin}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =================== EXPENSES =================== */
function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [form, setForm] = useState({ expense_type: '', description: '', amount: 0, product_id: 0 });
  const load = () => { adminApi.get<{ expenses: any[] }>('/expenses').then(r => setExpenses(r.expenses)).catch(console.error); };
  useEffect(load, []);

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await adminApi.post('/expenses', form); setForm({ expense_type: '', description: '', amount: 0, product_id: 0 }); load(); }
    catch (err: any) { alert(err.message); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">Expenses</h1>
      <div className="card p-6 mb-6">
        <form onSubmit={addExpense} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <input type="text" value={form.expense_type} onChange={e => setForm(p => ({ ...p, expense_type: e.target.value }))}
            className="input-field" placeholder="Type (e.g. Advertising)" required />
          <input type="text" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            className="input-field" placeholder="Description" />
          <input type="number" value={form.amount || ''} onChange={e => setForm(p => ({ ...p, amount: parseFloat(e.target.value) }))}
            className="input-field" placeholder="Amount (DA)" required />
          <button type="submit" className="btn-primary">Add Expense</button>
        </form>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr><th className="px-4 py-3 font-medium text-gray-600">Type</th><th className="px-4 py-3 font-medium text-gray-600">Description</th><th className="px-4 py-3 font-medium text-gray-600">Amount</th><th className="px-4 py-3 font-medium text-gray-600">Date</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {expenses.map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{e.expense_type}</td>
                <td className="px-4 py-3 text-gray-500">{e.description || '-'}</td>
                <td className="px-4 py-3 text-red-600 font-medium">{Math.round(e.amount).toLocaleString()} DA</td>
                <td className="px-4 py-3 text-gray-500">{e.expense_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =================== INVENTORY =================== */
function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  useEffect(() => { adminApi.get<{ products: any[] }>('/inventory').then(r => setProducts(r.products)).catch(console.error); }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">Inventory Management</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr><th className="px-4 py-3 font-medium text-gray-600">Product</th><th className="px-4 py-3 font-medium text-gray-600">Stock</th><th className="px-4 py-3 font-medium text-gray-600">Threshold</th><th className="px-4 py-3 font-medium text-gray-600">Status</th><th className="px-4 py-3 font-medium text-gray-600">Value</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3">{p.stock_quantity}</td>
                <td className="px-4 py-3">{p.low_stock_threshold}</td>
                <td className="px-4 py-3">
                  {p.stock_status === 'out' ? <span className="badge-red">Out of Stock</span>
                    : p.stock_status === 'low' ? <span className="badge-yellow">Low Stock</span>
                    : <span className="badge-green">In Stock</span>}
                </td>
                <td className="px-4 py-3 font-medium">{Math.round(p.base_price * p.stock_quantity).toLocaleString()} DA</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =================== DELAYED SHIPMENTS =================== */
function DelayedShipmentsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  useEffect(() => { adminApi.get<{ orders: any[] }>('/delayed-shipments').then(r => setOrders(r.orders)).catch(console.error); }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">Delayed Shipments (&gt;3 days)</h1>
      {orders.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">No delayed shipments. All packages are on schedule.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr><th className="px-4 py-3 font-medium text-gray-600">Order #</th><th className="px-4 py-3 font-medium text-gray-600">Customer</th><th className="px-4 py-3 font-medium text-gray-600">Product</th><th className="px-4 py-3 font-medium text-gray-600">Courier</th><th className="px-4 py-3 font-medium text-gray-600">Days in Transit</th><th className="px-4 py-3 font-medium text-gray-600">Date</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map(o => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{o.order_number}</td>
                  <td className="px-4 py-3">{o.customer_name}<br /><span className="text-xs text-gray-500">{o.customer_phone}</span></td>
                  <td className="px-4 py-3">{o.product_name}</td>
                  <td className="px-4 py-3">{o.courier_name || '-'}</td>
                  <td className="px-4 py-3"><span className="badge-red font-bold">{o.days_in_transit} days</span></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* =================== DELIVERY =================== */
function DeliveryPage() {
  const [fees, setFees] = useState<any[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [editHome, setEditHome] = useState('');
  const [editOffice, setEditOffice] = useState('');
  const [search, setSearch] = useState('');
  const load = () => { adminApi.get<{ fees: any[] }>('/delivery/admin/fees').then(r => setFees(r.fees)).catch(console.error); };
  useEffect(load, []);

  const saveFee = async (id: number) => {
    try {
      await adminApi.put(`/delivery/admin/fees/${id}`, { home_delivery_fee: editHome, office_pickup_fee: editOffice });
      setEditId(null);
      load();
    } catch (err: any) { alert(err.message); }
  };

  const filtered = fees.filter(f => f.province.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">Delivery Fee Management</h1>
      <div className="card p-4 mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          className="input-field max-w-sm" placeholder="Search province..." />
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">Province</th>
              <th className="px-4 py-3 font-medium text-gray-600">Home Delivery (DA)</th>
              <th className="px-4 py-3 font-medium text-gray-600">Office Pickup (DA)</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(f => (
              <tr key={f.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{f.province}</td>
                {editId === f.id ? (
                  <>
                    <td className="px-4 py-2">
                      <input type="number" value={editHome} onChange={e => setEditHome(e.target.value)}
                        className="input-field w-28" min="0" step="50" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" value={editOffice} onChange={e => setEditOffice(e.target.value)}
                        className="input-field w-28" min="0" step="50" />
                    </td>
                    <td className="px-4 py-3">
                      <span className={f.is_active ? 'badge-green' : 'badge-gray'}>{f.is_active ? 'Available' : 'Unavailable'}</span>
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => saveFee(f.id)} className="btn-primary text-xs px-3 py-1">Save</button>
                      <button onClick={() => setEditId(null)} className="btn-secondary text-xs px-3 py-1">Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3">{Number(f.home_delivery_fee).toLocaleString()} DA</td>
                    <td className="px-4 py-3">{Number(f.office_pickup_fee).toLocaleString()} DA</td>
                    <td className="px-4 py-3">
                      <span className={f.is_active ? 'badge-green' : 'badge-gray'}>{f.is_active ? 'Available' : 'Unavailable'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setEditId(f.id); setEditHome(String(f.home_delivery_fee)); setEditOffice(String(f.office_pickup_fee)); }}
                        className="text-primary text-sm font-medium hover:underline">Edit</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =================== EXCHANGES =================== */
function ExchangesPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const load = () => { adminApi.get<{ requests: any[] }>('/exchanges').then(r => setRequests(r.requests)).catch(console.error); };
  useEffect(load, []);

  const updateStatus = async (id: number, status: string) => {
    try { await adminApi.put(`/exchanges/${id}`, { status }); load(); }
    catch (err: any) { alert(err.message); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">Exchange Requests</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr><th className="px-4 py-3 font-medium text-gray-600">Customer</th><th className="px-4 py-3 font-medium text-gray-600">Phone</th><th className="px-4 py-3 font-medium text-gray-600">Order</th><th className="px-4 py-3 font-medium text-gray-600">Reason</th><th className="px-4 py-3 font-medium text-gray-600">Status</th><th className="px-4 py-3 font-medium text-gray-600">Date</th><th className="px-4 py-3 font-medium text-gray-600">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {requests.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{r.customer_name || '-'}</td>
                <td className="px-4 py-3">{r.customer_phone}</td>
                <td className="px-4 py-3">{r.order_number || '-'}</td>
                <td className="px-4 py-3 text-xs">{r.reason || '-'}</td>
                <td className="px-4 py-3">
                  {r.status === 'pending' ? <span className="badge-yellow">Pending</span>
                    : r.status === 'approved' ? <span className="badge-green">Approved</span>
                    : <span className="badge-red">Rejected</span>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 flex gap-1">
                  <button onClick={() => updateStatus(r.id, 'approved')} className="text-xs text-green-600 font-medium hover:underline">Approve</button>
                  <button onClick={() => updateStatus(r.id, 'rejected')} className="text-xs text-red-600 font-medium hover:underline">Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =================== ABANDONED CARTS =================== */
function AbandonedCartsPage() {
  const [carts, setCarts] = useState<any[]>([]);
  const load = () => { adminApi.get<{ carts: any[] }>('/abandoned-carts').then(r => setCarts(r.carts)).catch(console.error); };
  useEffect(load, []);

  const markRecovered = async (id: number) => {
    try { await adminApi.put(`/abandoned-carts/${id}`, {}); load(); }
    catch (err: any) { alert(err.message); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">Abandoned Carts</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr><th className="px-4 py-3 font-medium text-gray-600">Customer</th><th className="px-4 py-3 font-medium text-gray-600">Phone</th><th className="px-4 py-3 font-medium text-gray-600">Product</th><th className="px-4 py-3 font-medium text-gray-600">Total</th><th className="px-4 py-3 font-medium text-gray-600">Date</th><th className="px-4 py-3 font-medium text-gray-600">Recovered</th><th className="px-4 py-3 font-medium text-gray-600">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {carts.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{c.customer_name || '-'}</td>
                <td className="px-4 py-3">{c.customer_phone}</td>
                <td className="px-4 py-3">{c.product_name}</td>
                <td className="px-4 py-3">{Math.round(c.total_amount || 0).toLocaleString()} DA</td>
                <td className="px-4 py-3 text-xs text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">{c.recovered ? <span className="badge-green">Yes</span> : <span className="badge-yellow">No</span>}</td>
                <td className="px-4 py-3">
                  {!c.recovered && (
                    <button onClick={() => markRecovered(c.id)} className="text-xs text-primary font-medium hover:underline">Mark Recovered</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =================== BULK IMPORT =================== */
function BulkImportPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const data = ev.target?.result;
        if (typeof data === 'string') {
          const base64 = data.split(',')[1];
          const res = await adminApi.post<{ success: boolean; updated: number; errors?: string[] }>('/orders/bulk-import', { fileData: base64 });
          setResult(res);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setResult({ success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">Bulk Excel Import</h1>
      <div className="card p-6">
        <p className="text-sm text-gray-600 mb-4">
          Upload an Excel file (.xlsx) from your courier company containing order statuses.
          The file must include columns: <strong>Order Number</strong> and <strong>Status</strong> (Delivered/Returned).
        </p>
        <input type="file" accept=".xlsx,.xls" onChange={handleFile} className="mb-4" disabled={loading} />
        {loading && <p className="text-sm text-gray-500">Processing file...</p>}
        {result && (
          <div className={`p-4 border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <p className="text-sm font-medium">{result.success ? `${result.updated} orders updated.` : result.error}</p>
            {result.errors && result.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-red-600">Errors:</p>
                <ul className="text-xs text-red-600 list-disc pl-4">{result.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}</ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* =================== CATEGORIES =================== */
function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', description: '' });
  const [editing, setEditing] = useState<any>(null);

  const load = () => {
    adminApi.get<{ categories: any[] }>('/categories').then(r => setCategories(r.categories)).catch(console.error);
  };
  useEffect(load, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.post('/categories', { ...form, slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') });
      setShowForm(false);
      setForm({ name: '', slug: '', description: '' });
      load();
    } catch (err: any) { alert(err.message); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.put('/categories/' + editing.id, {
        name: editing.name,
        slug: editing.slug,
        description: editing.description
      });
      setEditing(null);
      load();
    } catch (err: any) { alert(err.message); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this category?')) return;
    try { await adminApi.del('/categories/' + id); load(); }
    catch (err: any) { alert(err.message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-dark">Categories</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : 'Add Category'}
        </button>
      </div>

      {showForm && (
        <div className="card p-6 mb-6">
          <h2 className="section-title mb-4">New Category</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') }))} className="input-field" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Slug</label>
              <input type="text" value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} className="input-field" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input type="text" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="input-field" />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary">Create Category</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 font-medium text-gray-600">Slug</th>
              <th className="px-4 py-3 font-medium text-gray-600">Description</th>
              <th className="px-4 py-3 font-medium text-gray-600">Sort</th>
              <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-gray-500">{c.slug}</td>
                <td className="px-4 py-3 text-gray-500">{c.description || '-'}</td>
                <td className="px-4 py-3">{c.sort_order}</td>
                <td className="px-4 py-3 space-x-3">
                  <button onClick={() => setEditing({ ...c })} className="text-primary text-xs font-medium hover:underline">Edit</button>
                  <button onClick={() => handleDelete(c.id)} className="text-red-600 text-xs font-medium hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="section-title mb-4">Edit Category</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                <input type="text" value={editing.name} onChange={e => setEditing(p => ({ ...p, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') }))} className="input-field" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Slug</label>
                <input type="text" value={editing.slug} onChange={e => setEditing(p => ({ ...p, slug: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <input type="text" value={editing.description || ''} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} className="input-field" />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setEditing(null)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* =================== BRANDS =================== */
function BrandsPage() {
  const [brands, setBrands] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '' });
  const [editing, setEditing] = useState<any>(null);

  const load = () => {
    adminApi.get<{ brands: any[] }>('/brands').then(r => setBrands(r.brands)).catch(console.error);
  };
  useEffect(load, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.post('/brands', form);
      setShowForm(false);
      setForm({ name: '' });
      load();
    } catch (err: any) { alert(err.message); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.put('/brands/' + editing.id, { name: editing.name });
      setEditing(null);
      load();
    } catch (err: any) { alert(err.message); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this brand? Products linked to it will become unassigned.')) return;
    try { await adminApi.del('/brands/' + id); load(); }
    catch (err: any) { alert(err.message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-dark">Brands</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : 'Add Brand'}
        </button>
      </div>

      {showForm && (
        <div className="card p-6 mb-6">
          <h2 className="section-title mb-4">New Brand</h2>
          <form onSubmit={handleCreate} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Brand Name *</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input-field" placeholder="e.g. Lenovo" required />
            </div>
            <button type="submit" className="btn-primary">Add Brand</button>
          </form>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">ID</th>
              <th className="px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 font-medium text-gray-600">Created</th>
              <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {brands.map(b => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{b.id}</td>
                <td className="px-4 py-3 font-medium">{b.name}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(b.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 space-x-3">
                  <button onClick={() => setEditing({ ...b })} className="text-primary text-xs font-medium hover:underline">Edit</button>
                  <button onClick={() => handleDelete(b.id)} className="text-red-600 text-xs font-medium hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {brands.length === 0 && <p className="text-center py-8 text-gray-500">No brands added yet.</p>}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="section-title mb-4">Edit Brand</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Brand Name</label>
                <input type="text" value={editing.name} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} className="input-field" required />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setEditing(null)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* =================== SETTINGS =================== */
function SettingsPage() {
  const [pixels, setPixels] = useState<any[]>([]);
  const [form, setForm] = useState({ pixel_type: 'facebook', pixel_id: '', access_token: '', event_type: 'Purchase' });
  const load = () => { adminApi.get<{ pixels: any[] }>('/settings').then(r => setPixels(r.pixels)).catch(console.error); };
  useEffect(load, []);

  const addPixel = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await adminApi.post('/settings/pixels', form); setForm({ pixel_type: 'facebook', pixel_id: '', access_token: '', event_type: 'Purchase' }); load(); }
    catch (err: any) { alert(err.message); }
  };

  const deletePixel = async (id: number) => {
    try { await adminApi.del(`/settings/pixels/${id}`); load(); }
    catch { /* handle */ }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">Settings</h1>

      <div className="card p-6 mb-6">
        <h2 className="section-title mb-4">Tracking Pixels</h2>
        <form onSubmit={addPixel} className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
          <select value={form.pixel_type} onChange={e => setForm(p => ({ ...p, pixel_type: e.target.value }))} className="input-field">
            <option value="facebook">Facebook Pixel</option>
            <option value="tiktok">TikTok Pixel</option>
            <option value="capi">Conversions API</option>
          </select>
          <input type="text" value={form.pixel_id} onChange={e => setForm(p => ({ ...p, pixel_id: e.target.value }))}
            className="input-field" placeholder="Pixel ID" required />
          <input type="text" value={form.access_token} onChange={e => setForm(p => ({ ...p, access_token: e.target.value }))}
            className="input-field" placeholder="Access Token (optional)" />
          <button type="submit" className="btn-primary">Add Pixel</button>
        </form>
        <div className="space-y-2">
          {pixels.map(p => (
            <div key={p.id} className="flex items-center justify-between bg-gray-50 p-3 rounded text-sm">
              <div>
                <span className="badge-blue mr-2">{p.pixel_type.toUpperCase()}</span>
                <span className="font-medium">{p.pixel_id}</span>
                {p.event_type && <span className="text-gray-500 ml-2">({p.event_type})</span>}
              </div>
              <button onClick={() => deletePixel(p.id)} className="text-red-600 text-xs font-medium hover:underline">Remove</button>
            </div>
          ))}
          {pixels.length === 0 && <p className="text-sm text-gray-500">No pixels configured.</p>}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="section-title mb-4">Account Info</h2>
        <p className="text-sm text-gray-600">Use the admin panel to manage shipping offices, categories, and other settings via the API endpoints.</p>
        <p className="text-sm text-gray-600 mt-2">API Base: <code className="bg-gray-100 px-2 py-1 text-xs">/api/admin</code></p>
      </div>
    </div>
  );
}
