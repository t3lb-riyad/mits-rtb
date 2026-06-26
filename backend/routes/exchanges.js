const express = require('express');
const router = express.Router();
const { prepare } = require('../models/database');
const { validatePhone, normalizePhone } = require('../utils/helpers');

router.post('/', (req, res) => {
  try {
    const { customer_phone, reason } = req.body;
    if (!customer_phone) return res.status(400).json({ error: 'Phone number is required.' });
    if (!validatePhone(customer_phone)) return res.status(400).json({ error: 'Invalid phone number format.' });

    const phone = normalizePhone(customer_phone);
    const recentOrders = prepare(
      "SELECT id, order_number, product_name, created_at FROM orders WHERE customer_phone = ? AND order_status = 'delivered' ORDER BY created_at DESC LIMIT 5"
    ).all(phone);

    if (recentOrders.length === 0) {
      return res.json({ success: false, message: 'No delivered orders found for this phone number.', orders: [] });
    }

    const customer = prepare('SELECT full_name FROM customers WHERE phone = ?').get(phone);
    const result = prepare('INSERT INTO exchange_requests (customer_phone, customer_name, reason, status) VALUES (?, ?, ?, ?)')
      .run(phone, customer?.full_name || null, reason || null, 'pending');

    res.status(201).json({ success: true, message: 'Exchange request submitted successfully.', request_id: result.lastInsertRowid, orders: recentOrders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'Phone number is required.' });
    const exchanges = prepare('SELECT * FROM exchange_requests WHERE customer_phone = ? ORDER BY created_at DESC').all(normalizePhone(phone));
    res.json({ exchanges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
