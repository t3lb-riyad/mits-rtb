const express = require('express');
const router = express.Router();
const { prepare } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');

router.get('/fees', async (req, res) => {
  try {
    const fees = await prepare('SELECT province, home_delivery_fee, office_pickup_fee FROM delivery_fees WHERE is_active = 1 ORDER BY province').all();
    res.json({ fees });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/fees/:province', async (req, res) => {
  try {
    const row = await prepare('SELECT province, home_delivery_fee, office_pickup_fee FROM delivery_fees WHERE province = $1 AND is_active = 1').get(req.params.province);
    if (!row) return res.status(404).json({ error: 'Province not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/fees', authenticateToken, async (req, res) => {
  try {
    const fees = await prepare('SELECT * FROM delivery_fees ORDER BY province').all();
    res.json(fees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/fees/:id', authenticateToken, async (req, res) => {
  try {
    const { province, home_delivery_fee, office_pickup_fee, is_active } = req.body;
    await prepare(`UPDATE delivery_fees SET
      province = CASE WHEN $1::text IS NOT NULL AND $1::text != '' THEN $1 ELSE province END,
      home_delivery_fee = $2,
      office_pickup_fee = $3,
      is_active = $4,
      updated_at = CURRENT_TIMESTAMP
      WHERE id = $5`)
      .run(
        province || null,
        Number(home_delivery_fee) || 0,
        Number(office_pickup_fee) || 0,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
        req.params.id
      );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
