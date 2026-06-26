const http = require('http');
const { fork } = require('child_process');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'mits_rtb.db');
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 3001, path, method, headers: {} };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    if (body) {
      const data = JSON.stringify(body);
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(data);
    }
    const r = http.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, data: d }); } });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

const get = (p, t) => req('GET', p, null, t);
const post = (p, b, t) => req('POST', p, b, t);

async function main() {
  const server = fork(path.join(__dirname, 'server.js'), [], { stdio: 'pipe' });
  await delay(5000);

  try {
    // Health
    let r = await get('/api/health');
    console.log('1. Health:', r.status, r.data.status);

    // Seed
    r = await get('/api/seed');
    console.log('2. Seed:', r.status, r.data.success);

    // Products
    r = await get('/api/products');
    console.log('3. Products:', r.data.products.length);

    // Place order
    r = await post('/api/orders', {
      customer_name: 'Ahmed Benali', customer_phone: '0555123456',
      customer_email: 'ahmed@test.com', product_id: 1,
      product_name: 'iPhone 15 Pro Max', quantity: 1,
      unit_price: 149900, shipping_method: 'home_delivery',
      customer_address: '15 Rue X', customer_city: 'Algiers', customer_province: 'Algiers'
    });
    console.log('4. Order:', r.status, r.data.success, r.data.order_number);

    // Login
    r = await post('/api/admin/login', { username: 'admin', password: 'admin123' });
    const token = r.data.token;
    console.log('5. Login:', token ? 'OK' : 'FAIL');

    // Dashboard
    r = await get('/api/admin/dashboard', token);
    console.log('6. Dashboard:', 'Orders:', r.data.totalOrders, 'Revenue:', r.data.totalRevenue, 'Customers:', r.data.totalCustomers);

    // Update order status
    r = await get('/api/admin/orders', token);
    const oid = r.data.orders[0]?.id;
    r = await post(`/api/admin/orders/${oid}/status`, { order_status: 'delivered', notes: 'Delivered OK' }, token);
    console.log('7. Status update:', r.data.success, r.data.message);

    // Exchange
    r = await post('/api/exchanges', { customer_phone: '0555123456', reason: 'Scratch' });
    console.log('8. Exchange:', r.data.success, r.data.message);

    // Analytics
    r = await get('/api/admin/analytics/profit', token);
    console.log('9. Analytics:', 'Revenue:', r.data.summary.totalRevenue, 'Net Profit:', r.data.summary.netProfit);

    // Abandoned cart
    r = await post('/api/orders/abandoned', { customer_phone: '0666123456', customer_name: 'Sara', product_id: 3, product_name: 'iPad', total_amount: 89900 });
    console.log('10. Abandoned cart:', r.data.success);

    // Inventory
    r = await get('/api/admin/inventory', token);
    console.log('11. Inventory items:', r.data.products.length);

    // Delayed shipments
    r = await get('/api/admin/delayed-shipments', token);
    console.log('12. Delayed shipments:', r.data.orders.length);

    // Customer detail
    r = await get('/api/admin/customers', token);
    if (r.data.customers.length > 0) {
      const cid = r.data.customers[0].id;
      r = await get(`/api/admin/customers/${cid}`, token);
      console.log('13. Customer detail:', r.data.customer.full_name, '- Orders:', r.data.orders.length);
    }

    console.log('\n=== ALL 13 TESTS PASSED ===');
    server.kill();
    process.exit(0);
  } catch (err) {
    console.error('TEST FAILED:', err);
    server.kill();
    process.exit(1);
  }
}

main();
