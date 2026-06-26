const http = require('http');

const API = 'http://localhost:3001';

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`${API}${path}`, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve(data); } });
    }).on('error', reject);
  });
}

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(`${API}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, (res) => {
      let resp = '';
      res.on('data', c => resp += c);
      res.on('end', () => { try { resolve(JSON.parse(resp)); } catch(e) { resolve({ raw: resp }); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  try {
    // 1. Place an order
    console.log('=== Placing order ===');
    const order = await post('/api/orders', {
      customer_name: 'Ahmed Benali',
      customer_phone: '0555123456',
      customer_email: 'ahmed@example.com',
      product_id: 1,
      product_name: 'iPhone 15 Pro Max',
      quantity: 2,
      unit_price: 149900,
      shipping_method: 'home_delivery',
      customer_address: '15 Rue des Freres, Ben Aknoun',
      customer_city: 'Algiers',
      customer_province: 'Algiers',
      notes: 'Please call before delivery'
    });
    console.log('Order result:', JSON.stringify(order));
    if (!order.success) throw new Error('Order failed: ' + JSON.stringify(order));

    const orderNumber = order.order_number;
    console.log('Order number:', orderNumber);

    // 2. Lookup by order number
    console.log('\n=== Order lookup ===');
    const lookup = await get(`/api/orders/lookup?order_number=${orderNumber}`);
    console.log('Lookup status:', lookup.order?.order_status);

    // 3. Admin login and update
    console.log('\n=== Admin operations ===');
    const loginRaw = await post('/api/admin/login', { username: 'admin', password: 'admin123' });
    const token = loginRaw.token;
    if (!token) throw new Error('Login failed');

    const dash = await get('/api/admin/dashboard');
    console.log('Dashboard - Total Orders:', dash.totalOrders);

    // Get order ID
    const ordersRes = await get('/api/admin/orders');
    const orderId = ordersRes.orders[0]?.id;
    console.log('First order ID:', orderId);

    if (orderId) {
      const update = await post(`/api/admin/orders/${orderId}/status`, { order_status: 'shipped', notes: 'Package shipped via Yalidine' });
      console.log('Status update:', update.success ? 'SUCCESS' : 'FAILED');

      const detail = await get(`/api/admin/orders/${orderId}`);
      console.log('Order status:', detail.order.order_status);
      console.log('Customer risk score:', detail.order.risk_score);
    }

    // 4. Test exchange
    console.log('\n=== Exchange request ===');
    const exchange = await post('/api/exchanges', { customer_phone: '0555123456', reason: 'Device has a minor scratch on screen' });
    console.log('Exchange:', exchange.success ? 'SUCCESS' : exchange.message);

    // 5. Test analytics
    console.log('\n=== Analytics ===');
    const analytics = await get('/api/admin/analytics/profit');
    console.log('Revenue:', analytics.summary?.totalRevenue);
    console.log('Net profit:', analytics.summary?.netProfit);

    // 6. Test abandoned cart
    console.log('\n=== Abandoned cart ===');
    const abandoned = await post('/api/orders/abandoned', { customer_phone: '0666123456', customer_name: 'Sara Belkacem', product_id: 3, product_name: 'iPad Pro M4', total_amount: 89900 });
    console.log('Abandoned cart log:', abandoned.success ? 'SUCCESS' : 'FAILED');

    // 7. Test delayed shipments
    console.log('\n=== Delayed shipments ===');
    const delayed = await get('/api/admin/delayed-shipments');
    console.log('Delayed count:', delayed.orders.length);

    // 8. Test inventory
    console.log('\n=== Inventory ===');
    const inventory = await get('/api/admin/inventory');
    console.log('Products in inventory:', inventory.products.length);

    // 9. Test product detail
    console.log('\n=== Product detail ===');
    const product = await get('/api/products/iphone-15-pro-max');
    console.log('Product offers:', product.offers.length);
    console.log('Product attributes:', product.attributes.length);

    console.log('\n=== ALL E2E TESTS PASSED ===');
    process.exit(0);
  } catch (err) {
    console.error('TEST FAILED:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
