const express = require('express');
const router = express.Router();
const { prepare } = require('../models/database');
const { generateOrderNumber, validatePhone, normalizePhone, calculateRiskScore } = require('../utils/helpers');
const { orderLimiter } = require('../middleware/rateLimiter');

router.post('/', orderLimiter, (req, res) => {
  try {
    const { customer_name, customer_phone, customer_email, customer_address, customer_city, customer_province,
      items, product_id, product_name, quantity, unit_price, shipping_method, shipping_office_id, shipping_office_name, notes, attributes,
      selected_ram, selected_storage } = req.body;

    if (!customer_name || !customer_phone || !shipping_method) {
      return res.status(400).json({ error: 'Missing required fields: name, phone, shipping method.' });
    }
    if (!validatePhone(customer_phone)) {
      return res.status(400).json({ error: 'Invalid phone number. Must be a valid mobile number (05, 06, 07 or +213 format).' });
    }

    const phone = normalizePhone(customer_phone);

    const blocked = prepare('SELECT * FROM blacklist WHERE phone = ?').get(phone);
    if (blocked) {
      return res.status(403).json({ error: 'This phone number is blocked and cannot place orders.' });
    }

    let orderItems = [];
    if (items && Array.isArray(items) && items.length > 0) {
      orderItems = items;
    } else if (product_id && product_name && quantity && unit_price) {
      orderItems = [{ product_id, product_name, quantity, unit_price, attributes: attributes || null, product_image: null, selected_ram: selected_ram || null, selected_storage: selected_storage || null }];
    } else {
      return res.status(400).json({ error: 'Missing required fields: product items.' });
    }

    const totalAmount = orderItems.reduce((sum, item) => sum + (item.unit_price || 0) * (item.quantity || 1), 0);
    const itemCount = orderItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

    let customer = prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
    if (customer) {
      prepare('UPDATE customers SET full_name = ?, email = COALESCE(?, email), address = COALESCE(?, address), city = COALESCE(?, city), province = COALESCE(?, province), updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(customer_name, customer_email || null, customer_address || null, customer_city || null, customer_province || null, customer.id);
    } else {
      prepare('INSERT INTO customers (phone, full_name, email, address, city, province) VALUES (?, ?, ?, ?, ?, ?)')
        .run(phone, customer_name, customer_email || null, customer_address || null, customer_city || null, customer_province || null);
      customer = prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
    }

    const riskScore = calculateRiskScore(customer);
    const isFraudFlagged = riskScore > 0.6 ? 1 : 0;
    const recentOrders = prepare("SELECT COUNT(*) as count FROM orders WHERE customer_phone = ? AND created_at > datetime('now', '-1 hour')").get(phone);
    const isSpam = recentOrders.count > 3 ? 1 : 0;
    const orderNum = generateOrderNumber();

    const firstItem = orderItems[0];
    prepare(`
      INSERT INTO orders (order_number, customer_id, customer_phone, customer_name, customer_email,
        customer_address, customer_city, customer_province, product_id, product_name,
        quantity, unit_price, total_amount, item_count, shipping_method, shipping_office_id,
        shipping_office_name, notes, order_status, is_fraud_flagged)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)
    `).run(orderNum, customer.id, phone, customer_name, customer_email || null,
      customer_address || null, customer_city || null, customer_province || null,
      firstItem.product_id || null, firstItem.product_name || null,
      firstItem.quantity || 1, firstItem.unit_price || 0, totalAmount, itemCount,
      shipping_method, shipping_office_id || null, shipping_office_name || null,
      notes || null, isFraudFlagged || isSpam);

    const newOrder = prepare('SELECT id FROM orders WHERE order_number = ?').get(orderNum);

    orderItems.forEach(item => {
      const imgUrl = item.product_image || null;
      const attrs = item.attributes ? (typeof item.attributes === 'string' ? item.attributes : JSON.stringify(item.attributes)) : null;
      prepare('INSERT INTO order_items (order_id, product_id, product_name, product_image, quantity, unit_price, attributes, selected_ram, selected_storage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(newOrder.id, item.product_id || null, item.product_name, imgUrl, item.quantity || 1, item.unit_price || 0, attrs, item.selected_ram || null, item.selected_storage || null);
      if (item.product_id) {
        prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?').run(item.quantity || 1, item.product_id);
      }
    });

    prepare('INSERT INTO order_status_history (order_id, status, notes) VALUES (?, ?, ?)').run(newOrder.id, 'confirmed', 'Order placed successfully');
    prepare('UPDATE customers SET total_orders = total_orders + 1, total_spent = total_spent + ? WHERE id = ?').run(totalAmount, customer.id);

    res.status(201).json({ success: true, order_number: orderNum, message: 'Order placed successfully.', is_fraud_flagged: !!isFraudFlagged });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Duplicate order detected. Please try again.' });
    res.status(500).json({ error: err.message });
  }
});

router.post('/abandoned', (req, res) => {
  try {
    const { customer_phone, customer_name, product_id, product_name, quantity, total_amount } = req.body;
    if (!customer_phone || !product_id) return res.status(400).json({ error: 'Missing required fields.' });
    prepare('INSERT INTO abandoned_carts (customer_phone, customer_name, product_id, product_name, quantity, total_amount) VALUES (?, ?, ?, ?, ?, ?)')
      .run(normalizePhone(customer_phone), customer_name || null, product_id, product_name || null, quantity || 1, total_amount || 0);
    res.json({ success: true, message: 'Cart logged for recovery.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/lookup', (req, res) => {
  try {
    const { order_number } = req.query;
    if (!order_number) return res.status(400).json({ error: 'Order number is required.' });
    const order = prepare(`
      SELECT o.*, osh.status as last_status, osh.created_at as last_status_date
      FROM orders o
      LEFT JOIN order_status_history osh ON osh.order_id = o.id AND osh.id = (SELECT MAX(id) FROM order_status_history WHERE order_id = o.id)
      WHERE o.order_number = ?
    `).get(order_number);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    const statusHistory = prepare('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at DESC').all(order.id);
    const orderItems = prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(order.id);
    res.json({ order, statusHistory, orderItems });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
