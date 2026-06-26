const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const path = require('path');
const multer = require('multer');
const { prepare, transaction, saveDb } = require('../models/database');
const { authenticateToken, generateToken } = require('../middleware/auth');
const { calculateProfit } = require('../utils/helpers');
const { uploadImage } = require('../utils/storage');

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });
    const admin = prepare('SELECT * FROM admin_users WHERE username = ? AND is_active = 1').get(username);
    if (!admin || !bcrypt.compareSync(password, admin.password_hash)) return res.status(401).json({ error: 'Invalid credentials.' });
    const token = generateToken(admin);
    res.json({ token, admin: { id: admin.id, username: admin.username, full_name: admin.full_name, role: admin.role } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/setup', (req, res) => {
  try {
    const { username, password, full_name } = req.body;
    const existing = prepare('SELECT id FROM admin_users LIMIT 1').get();
    if (existing) return res.status(400).json({ error: 'Admin already exists.' });
    const hash = bcrypt.hashSync(password, 10);
    prepare('INSERT INTO admin_users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)').run(username, hash, full_name || 'Administrator', 'superadmin');
    res.json({ success: true, message: 'Admin account created.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.use(authenticateToken);

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const url = await uploadImage(req.file.buffer, req.file.originalname, req.file.mimetype);
    res.json({ url });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/dashboard', (req, res) => {
  try {
    const totalOrders = prepare('SELECT COUNT(*) as count FROM orders').get();
    const pendingOrders = prepare("SELECT COUNT(*) as count FROM orders WHERE order_status = 'confirmed'").get();
    const totalRevenue = prepare('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders').get();
    const totalCustomers = prepare('SELECT COUNT(*) as count FROM customers').get();
    const pendingExchanges = prepare("SELECT COUNT(*) as count FROM exchange_requests WHERE status = 'pending'").get();
    const lowStock = prepare("SELECT COUNT(*) as count FROM products WHERE stock_quantity <= low_stock_threshold AND is_active = 1").get();
    const delayedShipments = prepare(`SELECT COUNT(*) as count FROM orders WHERE shipping_status NOT IN ('delivered','returned') AND julianday('now')-julianday(created_at)>3 AND order_status NOT IN ('cancelled')`).get();
    const todayOrders = prepare("SELECT COUNT(*) as count FROM orders WHERE date(created_at)=date('now')").get();
    res.json({
      totalOrders: totalOrders.count, pendingOrders: pendingOrders.count, totalRevenue: totalRevenue.total,
      totalCustomers: totalCustomers.count, pendingExchanges: pendingExchanges.count, lowStock: lowStock.count,
      delayedShipments: delayedShipments.count, todayOrders: todayOrders.count
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/orders', (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    let sql = `SELECT o.*, c.risk_score, c.successful_deliveries, c.returned_packages FROM orders o LEFT JOIN customers c ON o.customer_id = c.id`;
    const params = [];
    if (status && status !== 'all') { sql += ' WHERE o.order_status = ?'; params.push(status); }
    sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    const orders = prepare(sql).all(...params);
    const total = prepare('SELECT COUNT(*) as count FROM orders').get();
    res.json({ orders, total: total.count, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/orders/:id', (req, res) => {
  try {
    const order = prepare(`SELECT o.*, c.risk_score, c.successful_deliveries, c.returned_packages, c.total_orders as customer_total_orders FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE o.id = ?`).get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    const history = prepare('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at DESC').all(order.id);
    const orderItems = prepare('SELECT oi.*, p.image_url as product_image_url FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ? ORDER BY oi.id').all(order.id);
    res.json({ order, history, orderItems });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/orders/:id/status', (req, res) => {
  updateOrderStatus(req, res);
});
router.post('/orders/:id/status', (req, res) => {
  updateOrderStatus(req, res);
});

function updateOrderStatus(req, res) {
  try {
    const { order_status, shipping_status, tracking_number, courier_name, notes } = req.body;
    const order = prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    if (order_status) {
      prepare('UPDATE orders SET order_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(order_status, req.params.id);
      prepare('INSERT INTO order_status_history (order_id, status, notes) VALUES (?, ?, ?)').run(req.params.id, order_status, notes || `Status updated to ${order_status}`);
      if (order_status === 'delivered') {
        prepare("UPDATE orders SET delivered_at = datetime('now') WHERE id = ?").run(req.params.id);
        if (order.customer_id) prepare('UPDATE customers SET successful_deliveries = successful_deliveries + 1 WHERE id = ?').run(order.customer_id);
      }
      if (order_status === 'returned') {
        if (order.customer_id) prepare('UPDATE customers SET returned_packages = returned_packages + 1 WHERE id = ?').run(order.customer_id);
        if (order.product_id) prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?').run(order.quantity, order.product_id);
      }
    }
    if (shipping_status) prepare('UPDATE orders SET shipping_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(shipping_status, req.params.id);
    if (tracking_number) prepare('UPDATE orders SET tracking_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(tracking_number, req.params.id);
    if (courier_name) prepare('UPDATE orders SET courier_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(courier_name, req.params.id);
    res.json({ success: true, message: 'Order updated successfully.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

router.post('/orders/bulk-import', (req, res) => {
  try {
    const { fileData } = req.body;
    if (!fileData) return res.status(400).json({ error: 'No file data provided.' });

    const buffer = Buffer.from(fileData, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    let updated = 0, errors = [];

    const bulkUpdate = transaction(() => {
      rows.forEach((row, index) => {
        const orderNumber = row['Order Number'] || row['ORDER_NUMBER'] || row['order_number'];
        const status = (row['Status'] || row['STATUS'] || row['status'] || '').toLowerCase();
        if (!orderNumber) { errors.push(`Row ${index + 1}: Missing order number.`); return; }
        const order = prepare('SELECT * FROM orders WHERE order_number = ?').get(orderNumber);
        if (!order) { errors.push(`Row ${index + 1}: Order ${orderNumber} not found.`); return; }
        const oStatus = status === 'delivered' ? 'delivered' : status === 'returned' ? 'returned' : status;
        const sStatus = status === 'delivered' ? 'delivered' : status === 'returned' ? 'returned' : 'in_transit';
        prepare('UPDATE orders SET order_status = ?, shipping_status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_number = ?').run(oStatus, sStatus, orderNumber);
        prepare('INSERT INTO order_status_history (order_id, status, notes) VALUES (?, ?, ?)').run(order.id, oStatus, 'Bulk import update');
        if (status === 'delivered') {
          prepare("UPDATE orders SET delivered_at = datetime('now') WHERE order_number = ?").run(orderNumber);
          if (order.customer_id) prepare('UPDATE customers SET successful_deliveries = successful_deliveries + 1 WHERE id = ?').run(order.customer_id);
        } else if (status === 'returned') {
          if (order.customer_id) prepare('UPDATE customers SET returned_packages = returned_packages + 1 WHERE id = ?').run(order.customer_id);
        }
        updated++;
      });
    });

    bulkUpdate();
    res.json({ success: true, updated, errors: errors.length > 0 ? errors : undefined });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/orders/:id', (req, res) => {
  try {
    const order = prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    const customer = order.customer_id ? prepare('SELECT * FROM customers WHERE id = ?').get(order.customer_id) : null;
    prepare('DELETE FROM order_status_history WHERE order_id = ?').run(req.params.id);
    prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
    if (customer) {
      const newTotalSpent = Math.max(0, (customer.total_spent || 0) - (order.total_amount || 0));
      const newTotalOrders = Math.max(0, (customer.total_orders || 0) - 1);
      prepare('UPDATE customers SET total_spent = ?, total_orders = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newTotalSpent, newTotalOrders, customer.id);
    }
    prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?').run(order.quantity || 0, order.product_id);
    res.json({ success: true, message: 'Order deleted and revenue recalculated.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/orders/:id/ban', (req, res) => {
  try {
    const order = prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    const existing = prepare('SELECT * FROM blacklist WHERE phone = ?').get(order.customer_phone);
    if (existing) return res.status(409).json({ error: 'Phone is already blocked.' });
    prepare('INSERT INTO blacklist (phone, reason, blocked_by) VALUES (?, ?, ?)').run(order.customer_phone, 'Blocked from order #' + order.order_number, req.admin?.username || 'admin');
    res.json({ success: true, message: 'Customer blocked successfully.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/blacklist', (req, res) => {
  try {
    const list = prepare('SELECT * FROM blacklist ORDER BY created_at DESC').all();
    res.json({ blacklist: list });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/blacklist/:id', (req, res) => {
  try {
    prepare('DELETE FROM blacklist WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Phone unblocked.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/delayed-shipments', (req, res) => {
  try {
    const orders = prepare(`
      SELECT id, order_number, customer_name, customer_phone, product_name, total_amount,
        shipping_status, courier_name, tracking_number, created_at,
        CAST(julianday('now') - julianday(created_at) AS INTEGER) as days_in_transit
      FROM orders WHERE shipping_status NOT IN ('delivered','returned')
      AND julianday('now') - julianday(created_at) > 3 AND order_status NOT IN ('cancelled')
      ORDER BY days_in_transit DESC
    `).all();
    res.json({ orders });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/customers', (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM customers';
    const params = [];
    if (search) { sql += ' WHERE phone LIKE ? OR full_name LIKE ?'; params.push(`%${search}%`, `%${search}%`); }
    sql += ' ORDER BY created_at DESC LIMIT 100';
    res.json({ customers: prepare(sql).all(...params) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/customers/:id', (req, res) => {
  try {
    const customer = prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found.' });
    const orders = prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC').all(customer.id);
    const exchanges = prepare('SELECT * FROM exchange_requests WHERE customer_phone = ? ORDER BY created_at DESC').all(customer.phone);
    res.json({ customer, orders, exchanges });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/products', (req, res) => {
  try {
    const products = prepare(`SELECT p.*, c.name as category_name, b.name as brand_name, (SELECT COUNT(*) FROM orders WHERE product_id = p.id) as order_count FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN brands b ON p.brand_id = b.id ORDER BY p.created_at DESC`).all();
    res.json({ products });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/products', (req, res) => {
  try {
    const { name, slug, description, short_description, category_id, brand_id, base_price, cost_price, shipping_cost, ad_cost, overhead_cost, stock_quantity, low_stock_threshold, best_of, image_url, image_urls, attributes, product_attributes } = req.body;
    if (!name || !slug || !base_price) return res.status(400).json({ error: 'Name, slug, and base price are required.' });
    const result = prepare(`INSERT INTO products (name, slug, description, short_description, category_id, brand_id, base_price, cost_price, shipping_cost, ad_cost, overhead_cost, stock_quantity, low_stock_threshold, best_of, image_url, image_urls, attributes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      name, slug, description || null, short_description || null, category_id || null, brand_id || null, base_price,
      cost_price || 0, shipping_cost || 0, ad_cost || 0, overhead_cost || 0,
      stock_quantity || 0, low_stock_threshold || 10, best_of || null, image_url || null, image_urls || null, attributes || null);
    const productId = result.lastInsertRowid;
    if (product_attributes && Array.isArray(product_attributes)) {
      product_attributes.forEach(a => {
        prepare('INSERT INTO product_attributes (product_id, attribute_name, attribute_value, price_modifier) VALUES (?, ?, ?, ?)').run(productId, a.attribute_name, a.attribute_value, a.price_modifier || 0);
      });
    }
    res.status(201).json({ success: true, id: productId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/products/:id', (req, res) => {
  try {
    const fields = []; const params = [];
    const allowed = ['name', 'slug', 'description', 'short_description', 'category_id', 'brand_id', 'base_price', 'cost_price', 'shipping_cost', 'ad_cost', 'overhead_cost', 'stock_quantity', 'low_stock_threshold', 'best_of', 'is_active', 'image_url', 'image_urls', 'attributes'];
    allowed.forEach(f => { if (req.body[f] !== undefined) { fields.push(`${f} = ?`); params.push(req.body[f]); } });
    if (fields.length === 0 && !req.body.product_attributes) return res.status(400).json({ error: 'No fields to update.' });
    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP'); params.push(req.params.id);
      prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    }
    if (req.body.product_attributes && Array.isArray(req.body.product_attributes)) {
      prepare('DELETE FROM product_attributes WHERE product_id = ?').run(req.params.id);
      const ins = prepare('INSERT INTO product_attributes (product_id, attribute_name, attribute_value, price_modifier) VALUES (?, ?, ?, ?)');
      req.body.product_attributes.forEach(a => ins.run(req.params.id, a.attribute_name, a.attribute_value, a.price_modifier || 0));
    }
    res.json({ success: true, message: 'Product updated.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/products/:id', (req, res) => {
  try {
    const product = prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    prepare('UPDATE product_offers SET is_active = 0 WHERE product_id = ?').run(req.params.id);
    prepare('DELETE FROM product_attributes WHERE product_id = ?').run(req.params.id);
    prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Product deactivated.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/products/:id/attributes', (req, res) => {
  try {
    const attrs = prepare('SELECT * FROM product_attributes WHERE product_id = ? ORDER BY attribute_name, attribute_value').all(req.params.id);
    res.json({ attributes: attrs });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/analytics/profit', (req, res) => {
  try {
    const products = prepare('SELECT * FROM products WHERE is_active = 1').all();
    const productProfits = products.map(p => ({ ...p, profit: calculateProfit(p) }));
    const totalExpenses = prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses').get();
    const totalRevenue = prepare('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders').get();
    const totalCosts = products.reduce((s, p) => s + (p.cost_price || 0), 0);
    const totalOrders = prepare('SELECT COUNT(*) as count FROM orders').get().count;
    const netProfit = totalRevenue.total - totalCosts - totalExpenses.total;
    res.json({ summary: { totalRevenue: totalRevenue.total, totalCosts, totalExpenses: totalExpenses.total, netProfit, netMargin: totalRevenue.total > 0 ? parseFloat((netProfit / totalRevenue.total * 100).toFixed(2)) : 0, totalOrders }, products: productProfits });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/analytics/loyal-customers', (req, res) => {
  try {
    const customers = prepare(`SELECT c.*, lc.total_orders as loyalty_orders, lc.total_spent as loyalty_spent, lc.last_purchase_date, lc.notes FROM loyalty_customers lc JOIN customers c ON lc.customer_id = c.id ORDER BY lc.total_spent DESC`).all();
    res.json({ customers });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/expenses', (req, res) => {
  try {
    res.json({ expenses: prepare('SELECT e.*, p.name as product_name FROM expenses e LEFT JOIN products p ON e.product_id = p.id ORDER BY e.expense_date DESC').all() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/expenses', (req, res) => {
  try {
    const { expense_type, description, amount, product_id, expense_date } = req.body;
    if (!expense_type || !amount) return res.status(400).json({ error: 'Type and amount are required.' });
    prepare('INSERT INTO expenses (expense_type, description, amount, product_id, expense_date) VALUES (?, ?, ?, ?, ?)').run(expense_type, description || null, amount, product_id || null, expense_date || null);
    res.status(201).json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/exchanges', (req, res) => {
  try {
    res.json({ requests: prepare('SELECT e.*, o.order_number, o.product_name FROM exchange_requests e LEFT JOIN orders o ON e.order_id = o.id ORDER BY e.created_at DESC').all() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/exchanges/:id', (req, res) => {
  try {
    const { status, admin_notes } = req.body;
    prepare('UPDATE exchange_requests SET status = ?, admin_notes = COALESCE(?, admin_notes), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, admin_notes || null, req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/abandoned-carts', (req, res) => {
  try { res.json({ carts: prepare('SELECT * FROM abandoned_carts ORDER BY created_at DESC').all() }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/abandoned-carts/:id', (req, res) => {
  try { prepare('UPDATE abandoned_carts SET recovered = 1 WHERE id = ?').run(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/inventory', (req, res) => {
  try {
    const products = prepare(`SELECT id, name, slug, stock_quantity, low_stock_threshold,
      CASE WHEN stock_quantity <= low_stock_threshold THEN 'low' WHEN stock_quantity = 0 THEN 'out' ELSE 'in_stock' END as stock_status,
      base_price, cost_price FROM products WHERE is_active = 1 ORDER BY stock_quantity ASC`).all();
    res.json({ products });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/categories', (req, res) => {
  try { res.json({ categories: prepare('SELECT * FROM categories WHERE is_active = 1 OR is_active IS NULL ORDER BY sort_order').all() }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/categories', (req, res) => {
  try {
    const { name, slug, description, image_url, sort_order } = req.body;
    if (!name || !slug) return res.status(400).json({ error: 'Name and slug required.' });
    prepare('INSERT INTO categories (name, slug, description, image_url, sort_order) VALUES (?, ?, ?, ?, ?)').run(name, slug, description || null, image_url || null, sort_order || 0);
    res.status(201).json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/categories/:id', (req, res) => {
  try {
    const { name, slug, description, image_url, sort_order } = req.body;
    const sets = []; const params = [];
    if (name !== undefined) { sets.push('name = ?'); params.push(name); }
    if (slug !== undefined) { sets.push('slug = ?'); params.push(slug); }
    if (description !== undefined) { sets.push('description = ?'); params.push(description); }
    if (image_url !== undefined) { sets.push('image_url = ?'); params.push(image_url); }
    if (sort_order !== undefined) { sets.push('sort_order = ?'); params.push(sort_order); }
    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update.' });
    params.push(req.params.id);
    prepare(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/categories/:id', (req, res) => {
  try { prepare('UPDATE categories SET is_active = 0 WHERE id = ?').run(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/notifications', (req, res) => {
  try { res.json({ logs: prepare('SELECT * FROM notifications_log ORDER BY created_at DESC LIMIT 50').all() }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/settings', (req, res) => {
  try { res.json({ pixels: prepare('SELECT * FROM tracking_pixels WHERE is_active = 1').all() }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/settings/pixels', (req, res) => {
  try {
    const { pixel_type, pixel_id, access_token, event_type } = req.body;
    prepare('INSERT INTO tracking_pixels (pixel_type, pixel_id, access_token, event_type) VALUES (?, ?, ?, ?)').run(pixel_type, pixel_id, access_token || null, event_type || null);
    res.status(201).json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/settings/pixels/:id', (req, res) => {
  try { prepare('DELETE FROM tracking_pixels WHERE id = ?').run(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/shipping-offices', (req, res) => {
  try {
    const { province, office_name, address, phone } = req.body;
    prepare('INSERT INTO shipping_offices (province, office_name, address, phone) VALUES (?, ?, ?, ?)').run(province, office_name, address || null, phone || null);
    res.status(201).json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/brands', (req, res) => {
  try { res.json({ brands: prepare('SELECT * FROM brands ORDER BY name').all() }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/brands', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Brand name is required.' });
    prepare('INSERT INTO brands (name) VALUES (?)').run(name);
    res.status(201).json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/brands/:id', (req, res) => {
  try {
    const { name } = req.body;
    prepare('UPDATE brands SET name = ? WHERE id = ?').run(name, req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/brands/:id', (req, res) => {
  try {
    prepare('UPDATE products SET brand_id = NULL WHERE brand_id = ?').run(req.params.id);
    prepare('DELETE FROM brands WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
