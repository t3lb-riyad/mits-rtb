const express = require('express');
const router = express.Router();
const { prepare } = require('../models/database');
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

module.exports = router;
